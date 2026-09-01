import React, { useEffect, useRef } from 'react';

interface ColorBendsProps {
  color?: string;
  speed?: number;
  frequency?: number;
  noise?: number;
  bandWidth?: number;
  rotation?: number;
  fadeTop?: number;
  iterations?: number;
  intensity?: number;
  className?: string;
}

// Parse a CSS hex/rgb color string into [r, g, b] floats 0..1
function parseColor(color: string): [number, number, number] {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

const VERT_SRC = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// The GLSL fragment shader generates flowing bands by layering
// rotated sine waves through a smooth noise field.
const FRAG_SRC = `
  precision mediump float;

  uniform float u_time;
  uniform vec2  u_resolution;
  uniform vec3  u_color;
  uniform float u_speed;
  uniform float u_frequency;
  uniform float u_noise;
  uniform float u_bandWidth;
  uniform float u_rotation;
  uniform float u_fadeTop;
  uniform float u_intensity;
  uniform int   u_iterations;

  // Simple value noise for the organic wobble
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // Smooth band function: returns ~1 near the wave ridge, 0 elsewhere
  float band(float v, float width) {
    float h = 0.5;
    // signed distance to nearest ridge in repeating pattern
    float t = abs(fract(v) - h);
    float half_w = width * 0.5;
    return 1.0 - smoothstep(half_w * 0.6, half_w, t);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    // Keep aspect ratio so bands look the same on all screen sizes
    float aspect = u_resolution.x / u_resolution.y;
    vec2 st = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

    // Rotation matrix
    float rad = u_rotation * 3.14159265 / 180.0;
    float cosR = cos(rad);
    float sinR = sin(rad);
    vec2 rot = vec2(cosR * st.x - sinR * st.y,
                    sinR * st.x + cosR * st.y);

    float t = u_time * u_speed;

    float glow = 0.0;
    float freq = u_frequency;

    for (int i = 0; i < 8; i++) {
      if (i >= u_iterations) break;

      // Each iteration shifts phase and adds organic noise
      float phase = float(i) * 1.4;
      float noiseVal = vnoise(rot * 3.0 + vec2(t * 0.4, phase)) * u_noise;
      float v = rot.x * freq + t + noiseVal + phase * 0.5;

      glow += band(v, u_bandWidth) * (1.0 - float(i) * 0.15);
      freq *= 1.3;
    }

    glow = clamp(glow * u_intensity, 0.0, 1.0);

    // Fade toward the top of the section
    float fadeT = 1.0 - smoothstep(u_fadeTop - 0.15, u_fadeTop, uv.y);

    vec3 finalColor = u_color * glow * fadeT;

    // Dark base so it blends into the AutoOps navy background
    gl_FragColor = vec4(finalColor, glow * fadeT * 0.72);
  }
`;

export const ColorBends: React.FC<ColorBendsProps> = ({
  color     = '#06B6D4',
  speed     = 0.1,
  frequency = 1.2,
  noise     = 0.06,
  bandWidth = 0.40,
  rotation  = 45,
  fadeTop   = 0.95,
  iterations = 2,
  intensity  = 1.1,
  className  = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const glRef     = useRef<WebGLRenderingContext | null>(null);
  const progRef   = useRef<WebGLProgram | null>(null);
  const uniRef    = useRef<Record<string, WebGLUniformLocation | null>>({});
  const startRef  = useRef<number>(performance.now());

  // Build and link a WebGL program from vertex + fragment sources
  const initGL = (canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) return;
    glRef.current = gl;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('ColorBends shader error:', gl.getShaderInfoLog(sh));
      }
      return sh;
    };

    const vert = compile(gl.VERTEX_SHADER,   VERT_SRC);
    const frag = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    progRef.current = prog;

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1,
    ]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    const unis = ['u_time','u_resolution','u_color','u_speed','u_frequency',
                  'u_noise','u_bandWidth','u_rotation','u_fadeTop',
                  'u_intensity','u_iterations'];
    unis.forEach(n => { uniRef.current[n] = gl.getUniformLocation(prog, n); });

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  };

  const resize = () => {
    const canvas = canvasRef.current;
    const gl     = glRef.current;
    if (!canvas || !gl) return;
    const { offsetWidth: w, offsetHeight: h } = canvas.parentElement ?? canvas;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const draw = (now: number) => {
    const gl   = glRef.current;
    const prog = progRef.current;
    const u    = uniRef.current;
    const canvas = canvasRef.current;
    if (!gl || !prog || !canvas) return;

    const elapsed = (now - startRef.current) / 1000;
    const [r, g, b] = parseColor(color);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform1f(u.u_time,       elapsed);
    gl.uniform2f(u.u_resolution, canvas.width, canvas.height);
    gl.uniform3f(u.u_color,      r, g, b);
    gl.uniform1f(u.u_speed,      speed);
    gl.uniform1f(u.u_frequency,  frequency);
    gl.uniform1f(u.u_noise,      noise);
    gl.uniform1f(u.u_bandWidth,  bandWidth);
    gl.uniform1f(u.u_rotation,   rotation);
    gl.uniform1f(u.u_fadeTop,    fadeTop);
    gl.uniform1f(u.u_intensity,  intensity);
    gl.uniform1i(u.u_iterations, iterations);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    rafRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initGL(canvas);
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement ?? canvas);

    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ display: 'block' }}
    />
  );
};
