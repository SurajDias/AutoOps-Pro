import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { AutoOpsLogo } from '../../components/ui/AutoOpsLogo';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import signInBg from '../../assets/bg/signin_bg.jpg';

export default function Login() {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [rememberMe,   setRememberMe]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      login(email);          // Preserving existing auth logic
      navigate('/init');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex justify-center md:justify-end items-stretch relative overflow-hidden bg-[#060E1E]"
      style={{
        backgroundImage: `url(${signInBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Subtle overlay to enhance contrast and ensure the dark theme feel */}
      <div className="absolute inset-0 bg-[#060E1E]/30 pointer-events-none" />

      {/* Brand logo at top-left (visible only on desktop) */}
      <div className="absolute top-8 left-8 flex items-center gap-3 z-20 pointer-events-none hidden md:flex">
        <AutoOpsLogo size={32} />
        <span className="font-heading font-bold text-lg text-white tracking-tight">
          AutoOps <span style={{ color: '#4F8BFF' }}>Pro</span>
        </span>
      </div>

      {/* Back to Home Link — top-8 on mobile (no logo), top-20 on desktop (below logo) */}
      <Link
        to="/"
        className="absolute top-8 left-8 md:top-20 md:left-8 flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-white transition-all duration-200 group z-20"
      >
        <ArrowLeft className="h-4 w-4 text-text-muted group-hover:text-primary transition-colors group-hover:[filter:drop-shadow(0_0_4px_rgba(79,139,255,0.6))]" />
        <span>Back to Home</span>
      </Link>

      {/* Right side form panel (responsive: centered card on mobile, full-height panel on desktop) */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md mx-6 my-auto p-8 rounded-2xl border border-white/[0.08] bg-[#060E1E]/90 backdrop-blur-xl shadow-2xl z-10 md:max-w-none md:w-[40%] xl:w-[35%] md:h-screen md:my-0 md:mx-0 md:rounded-none md:border-y-0 md:border-r-0 md:border-l md:p-12 md:bg-[#060E1E]/80 md:backdrop-blur-2xl md:shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col justify-center"
      >
        <div className="w-full">
          {/* Mobile brand (visible only on small screens) */}
          <div className="flex items-center gap-2.5 mb-8 md:hidden">
            <AutoOpsLogo size={28} />
            <span className="font-heading font-bold text-base text-white tracking-tight">
              AutoOps <span style={{ color: '#4F8BFF' }}>Pro</span>
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-heading text-white leading-tight mb-2">
              Welcome back
            </h1>
            <p className="text-white/40 text-sm leading-relaxed">
              Sign in to your intelligent operations workspace.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-white/40 tracking-[0.12em] uppercase">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                <input
                  type="email"
                  id="login-email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-3.5 pl-11 pr-4 text-white/90 placeholder-white/20 focus:outline-none focus:border-[#4F8BFF]/60 focus:bg-white/[0.06] transition-all text-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-white/40 tracking-[0.12em] uppercase">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-3.5 pl-11 pr-12 text-white/90 placeholder-white/20 focus:outline-none focus:border-[#4F8BFF]/60 focus:bg-white/[0.06] transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-white/40 text-xs cursor-pointer select-none">
                <div
                  onClick={() => setRememberMe(r => !r)}
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors cursor-pointer ${rememberMe ? 'bg-[#4F8BFF] border-[#4F8BFF]' : 'border-white/20 bg-white/[0.04]'}`}
                >
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                Remember me
              </label>
              <a href="#forgot" className="text-[#4F8BFF] hover:text-[#06B6D4] text-xs font-medium transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-3.5 mt-2 text-sm font-bold text-white transition-all duration-300 disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #4F8BFF 0%, #06B6D4 100%)',
                boxShadow: '0 0 0 0 rgba(6,182,212,0)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(6,182,212,0.35)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 rgba(6,182,212,0)'; }}
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.07]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#08111F] md:bg-[#060E1E]/0 px-3 text-white/25 text-[11px] font-semibold tracking-wider uppercase">
                Or continue with
              </span>
            </div>
          </div>

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'GitHub', path: <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/> },
              { label: 'Google',  path: <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.694 0-8.503-3.81-8.503-8.503 0-4.694 3.81-8.503 8.503-8.503 2.202 0 4.205.859 5.714 2.27l3.22-3.22C18.257 1.83 15.39 1 12.24 1 6.133 1 1 6.133 1 12.24s5.133 11.24 11.24 11.24c5.895 0 10.865-4.04 10.865-11.24 0-.668-.076-1.316-.219-1.955H12.24z"/> },
            ].map(btn => (
              <button
                key={btn.label}
                className="flex items-center justify-center gap-2 py-3 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] rounded-lg text-white/60 hover:text-white/80 font-medium text-xs transition-all"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">{btn.path}</svg>
                {btn.label}
              </button>
            ))}
          </div>

          {/* Sign up link */}
          <p className="text-center text-xs text-white/30 mt-8">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#4F8BFF] hover:text-[#06B6D4] font-semibold transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
