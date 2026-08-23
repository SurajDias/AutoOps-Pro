import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length > 6) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = getStrength(password);
  // Preserving only shades of blue, navy, and white
  const strengthColors = [
    'bg-white/[0.04]',      // Empty/Weakest
    'bg-primary/20',        // Weak (very dim blue)
    'bg-primary/50',        // Medium (medium blue)
    'bg-primary/80',        // Strong (bright blue)
    'bg-accent'             // Excellent (glowing accent cyan)
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return;
    setLoading(true);
    try {
      signup(email); // Preserving existing auth logic
      navigate('/init');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isPasswordMatch = password === confirmPassword;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Back to Home Link */}
      <Link
        to="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-white transition-all duration-200 group z-20"
      >
        <ArrowLeft className="h-4 w-4 text-text-muted group-hover:text-primary transition-colors group-hover:[filter:drop-shadow(0_0_4px_rgba(79,139,255,0.6))]" />
        <span>Back to Home</span>
      </Link>
      
      {/* Animated gradient mesh background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{
            x: [0, 35, -25, 0],
            y: [0, -55, 35, 0],
            scale: [1, 1.12, 0.92, 1]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-primary/[0.08] blur-[130px]"
        />
        <motion.div 
          animate={{
            x: [0, -35, 20, 0],
            y: [0, 55, -45, 0],
            scale: [1, 0.92, 1.08, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-accent/[0.05] blur-[160px]"
        />
      </div>

      <div className="absolute inset-0 grid-pattern opacity-[0.07] pointer-events-none z-0" />

      {/* Main Glass Signup Card */}
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-surface/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-10 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col items-center text-center mb-8">
            <h2 className="text-2xl font-bold font-heading text-white">Create your account</h2>
            <p className="text-text-muted text-sm mt-1">Get started with autonomous ops</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-text-muted tracking-[0.12em] uppercase ml-1">Full name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full bg-elevated/70 border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-primary/50 focus:bg-elevated transition-all text-sm" 
                  placeholder="John Doe"
                  required 
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-text-muted tracking-[0.12em] uppercase ml-1">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full bg-elevated/70 border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-primary/50 focus:bg-elevated transition-all text-sm" 
                  placeholder="you@example.com"
                  required 
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-text-muted tracking-[0.12em] uppercase ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full bg-elevated/70 border border-white/[0.08] rounded-xl py-3 pl-11 pr-12 text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-primary/50 focus:bg-elevated transition-all text-sm" 
                  placeholder="••••••••"
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {/* Strength Meter */}
              {password.length > 0 && (
                <div className="space-y-1 mt-1.5 px-1">
                  <div className="flex space-x-1 h-1 w-full">
                    {[1, 2, 3, 4].map(level => (
                      <div 
                        key={level} 
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strength >= level ? strengthColors[strength] : 'bg-white/[0.04]'
                        }`} 
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-text-muted">
                    Password strength:{' '}
                    <span className="font-semibold text-primary">
                      {strength === 1 && 'Weak'}
                      {strength === 2 && 'Fair'}
                      {strength === 3 && 'Good'}
                      {strength >= 4 && 'Strong'}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-text-muted tracking-[0.12em] uppercase ml-1">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className={`w-full bg-elevated/70 border rounded-xl py-3 pl-11 pr-4 text-text-primary placeholder-text-muted/60 focus:outline-none focus:bg-elevated transition-all text-sm ${
                    confirmPassword && !isPasswordMatch 
                      ? 'border-accent/40 focus:border-accent/60' 
                      : 'border-white/[0.08] focus:border-primary/50'
                  }`} 
                  placeholder="••••••••"
                  required 
                />
              </div>
              {confirmPassword && !isPasswordMatch && (
                <span className="text-[10px] text-accent ml-1 font-semibold">Passwords do not match</span>
              )}
            </div>

            <motion.button 
              type="submit" 
              disabled={loading || !isPasswordMatch}
              whileHover={{ scale: loading || !isPasswordMatch ? 1 : 1.01 }}
              whileTap={{ scale: loading || !isPasswordMatch ? 1 : 0.99 }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-background font-bold py-3.5 rounded-xl hover:shadow-neon transition-all duration-300 mt-6 text-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : <><span>Create Account</span><ArrowRight className="h-4 w-4" /></>}
            </motion.button>
          </form>

          {/* OAuth Separator */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-3 text-text-muted/60 font-semibold tracking-wider font-body">Or sign up with</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2.5 py-3 border border-white/[0.08] bg-elevated/60 hover:bg-elevated rounded-xl text-text-primary font-medium text-xs transition-colors">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>GitHub</span>
            </button>
            
            <button className="flex items-center justify-center gap-2.5 py-3 border border-white/[0.08] bg-elevated/60 hover:bg-elevated rounded-xl text-text-primary font-medium text-xs transition-colors">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.694 0-8.503-3.81-8.503-8.503 0-4.694 3.81-8.503 8.503-8.503 2.202 0 4.205.859 5.714 2.27l3.22-3.22C18.257 1.83 15.39 1 12.24 1 6.133 1 1 6.133 1 12.24s5.133 11.24 11.24 11.24c5.895 0 10.865-4.04 10.865-11.24 0-.668-.076-1.316-.219-1.955H12.24z"/>
              </svg>
              <span>Google</span>
            </button>
          </div>

          <p className="text-center text-xs text-text-muted mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-accent font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
      
    </div>
  );
}
