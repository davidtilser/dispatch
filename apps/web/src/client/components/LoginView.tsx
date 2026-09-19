import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DispatchOrbit } from '../../MotionUI';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { Lock, User, Store, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [username, setUsername] = useState('login');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = login(username, password, selectedRole);
    if (!res.success) {
      setError(res.error || 'Authentication failed');
    }
  };

  const handleQuickDemo = (role: UserRole) => {
    setSelectedRole(role);
    setUsername('login');
    setPassword('password');
    login('login', 'password', role);
  };

  return (
    <div className="login-screen">
      <aside className="login-story">
        <a href="/" className="login-wordmark"><img src="/dispatch-logo.png" alt="" />Dispatch<span>DEMO</span></a>
        <div className="login-story-copy"><span className="login-kicker">GOOD TIMING. GREAT POSSIBILITIES.</span><h1>Life happens.<br />Make room for<br /><em>what’s next.</em></h1><p>Plans change. Your day doesn’t have to stop.<br />Discover your next appointment with Dispatch.</p></div>
        <DispatchOrbit active />
        <div className="login-story-footer"><CheckCircle2 size={15} />Cancel free, as long as we fill your spot.</div>
      </aside>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="login-panel"
      >
        <div className="login-welcome"><span className="login-kicker">YOUR NEXT CHAPTER</span><h2>Welcome to Dispatch.</h2><p>A little flexibility goes a long way.</p></div>

        {/* Card */}
        <div className="login-form-card">
          {/* Role selector tabs */}
          <div className="mb-6">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#a3aec3] mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#080e20] rounded-xl border border-[#263751]">
              <button
                type="button"
                onClick={() => setSelectedRole('client')}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'client'
                    ? 'bg-[#263751] text-[#f7f3e8] shadow-xs'
                    : 'text-[#a3aec3] hover:text-[#f7f3e8]'
                }`}
              >
                <User size={14} />
                <span>Client Portal</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('business')}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'business'
                    ? 'bg-[#263751] text-[#f7f3e8] shadow-xs'
                    : 'text-[#a3aec3] hover:text-[#f7f3e8]'
                }`}
              >
                <Store size={14} />
                <span>Business Portal</span>
              </button>
            </div>
          </div>

          {/* Error notification */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-start space-x-2"
            >
              <ShieldAlert size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="demo-username" className="block text-xs font-medium text-[#a3aec3] mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#a3aec3]/60">
                  <User size={15} />
                </div>
                <input
                  id="demo-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="login"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-[#080e20] border border-[#263751] rounded-xl text-xs text-[#f7f3e8] focus:outline-none focus:ring-1 focus:ring-[#f7f3e8] transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="demo-password" className="block text-xs font-medium text-[#a3aec3] mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#a3aec3]/60">
                  <Lock size={15} />
                </div>
                <input
                  id="demo-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-[#080e20] border border-[#263751] rounded-xl text-xs text-[#f7f3e8] focus:outline-none focus:ring-1 focus:ring-[#f7f3e8] transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="login-submit w-full mt-2 py-3 rounded-xl font-bold text-xs bg-[#263751] hover:bg-[#263751]/80 text-[#f7f3e8] border border-[#263751] flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md"
            >
              <span>Sign In as {selectedRole === 'client' ? 'Client' : 'Business'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Demo helper banner */}
          <div className="mt-6 pt-5 border-t border-[#263751]/70">
            <div className="bg-[#080e20] p-3 rounded-xl border border-[#263751] mb-3">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#f7f3e8] mb-1">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Demo Credentials Ready</span>
              </div>
              <p className="text-[11px] text-[#a3aec3]">
                Username: <code className="bg-[#101a30] px-1 py-0.5 rounded text-[#f7f3e8] font-mono border border-[#263751]">login</code> • Password: <code className="bg-[#101a30] px-1 py-0.5 rounded text-[#f7f3e8] font-mono border border-[#263751]">password</code>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('client')}
                className="py-2 px-3 bg-[#080e20] hover:bg-[#263751] text-[#f7f3e8] font-medium rounded-lg transition-colors text-center border border-[#263751] cursor-pointer"
              >
                1-Click Client Demo
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('business')}
                className="py-2 px-3 bg-[#080e20] hover:bg-[#263751] text-[#f7f3e8] font-medium rounded-lg transition-colors text-center border border-[#263751] cursor-pointer"
              >
                1-Click Shop Demo
              </button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-[#a3aec3]/70 mt-6">
          Demo sign-in · Sample data, real possibilities.
        </p>
      </motion.div>
    </div>
  );
};
