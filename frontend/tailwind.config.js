/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#050816',
        'bg-secondary': '#081120',
        surface: '#0D1728',
        elevated: '#111D33',
        primary: '#4F8BFF',
        accent: '#63D6FF',
        border: 'rgba(255,255,255,0.08)',
        'text-primary': '#F7FAFC',
        'text-muted': '#9FB0C7',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 30px rgba(79, 139, 255, 0.25)',
        'neon-lg': '0 0 60px rgba(79, 139, 255, 0.20)',
        'neon-accent': '0 0 30px rgba(99, 214, 255, 0.20)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.3)',
        card: '0 1px 3px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.3)',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #4F8BFF, #63D6FF)',
        'surface-gradient': 'linear-gradient(180deg, #0D1728, #081120)',
        'glow-radial': 'radial-gradient(circle at 50% 50%, rgba(79,139,255,0.15) 0%, transparent 70%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-fast': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        ping: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(79,139,255,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(79,139,255,0.6)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'border-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'fade-in-fast': 'fade-in-fast 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        float: 'float 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'scan-line': 'scan-line 4s linear infinite',
        'border-spin': 'border-spin 6s linear infinite',
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '60px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
