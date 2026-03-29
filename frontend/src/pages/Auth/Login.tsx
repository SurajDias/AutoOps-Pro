import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiArrowRight, FiActivity, FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password.trim()) { setError('Password is required'); return; }
    setIsLoading(true);
    setTimeout(() => {
      login(email);
      navigate('/init');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.03)_0%,transparent_70%)]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <FiActivity size={24} className="text-accent" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">AutoOps Pro</span>
          </div>
          <p className="text-text-muted text-sm">AI-Powered Autonomous Operations Platform</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative"
        >
          {/* Glow border */}
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-accent/20 via-white/5 to-transparent pointer-events-none" />
          
          <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-text-muted text-sm mb-6">Sign in to access your operations dashboard</p>

            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 px-4 py-3 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-medium">
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@company.com"
                    className="w-full bg-background/60 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-background/60 border border-white/10 rounded-xl pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors">
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-text-muted cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/20 bg-background/60 accent-accent" />
                  Remember me
                </label>
                <span className="text-accent hover:underline cursor-pointer">Forgot password?</span>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3.5 rounded-xl bg-accent text-background font-bold text-sm flex items-center justify-center gap-2 hover:bg-accent-hover transition-all shadow-neon disabled:opacity-70 disabled:cursor-wait"
              >
                {isLoading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full" />
                ) : (
                  <>Sign In <FiArrowRight size={16} /></>
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center text-xs text-text-muted">
              Don't have an account?{' '}
              <Link to="/signup" className="text-accent font-semibold hover:underline">Create one</Link>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center mt-8 text-[10px] text-text-muted/60">
          Secured by AutoOps AI Engine v2.1
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
