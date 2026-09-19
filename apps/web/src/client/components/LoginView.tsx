import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
    <div className="min-h-screen bg-[#010736] flex flex-col justify-center items-center px-4 py-12 text-[#fcf1d0]">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="max-w-md w-full"
      >
        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 className="mb-4">
            <img
              src="/dispatch-logo.png"
              alt="Dispatch"
              width={160}
              height={160}
              className="w-40 h-40 mx-auto rounded-2xl bg-white object-contain"
            />
          </h1>
          <p className="mt-1.5 text-xs text-[#d8ceb2]">
            Cancel free, as long as we fill your spot.
          </p>
        </div>

        <p className="text-center text-xs text-[#d8ceb2] mb-5">Demo sign-in only. <a href="/" className="underline">Open the shop demo without signing in.</a></p>

        {/* Card */}
        <div className="bg-[#0d1c42] rounded-2xl shadow-2xl border border-[#22396f] p-8">
          {/* Role selector tabs */}
          <div className="mb-6">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#d8ceb2] mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#010736] rounded-xl border border-[#22396f]">
              <button
                type="button"
                onClick={() => setSelectedRole('client')}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'client'
                    ? 'bg-[#22396f] text-[#fcf1d0] shadow-xs'
                    : 'text-[#d8ceb2] hover:text-[#fcf1d0]'
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
                    ? 'bg-[#22396f] text-[#fcf1d0] shadow-xs'
                    : 'text-[#d8ceb2] hover:text-[#fcf1d0]'
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
              <label htmlFor="demo-username" className="block text-xs font-medium text-[#d8ceb2] mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#d8ceb2]/60">
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
                  className="w-full pl-9 pr-3 py-2.5 bg-[#010736] border border-[#22396f] rounded-xl text-xs text-[#fcf1d0] focus:outline-none focus:ring-1 focus:ring-[#fcf1d0] transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="demo-password" className="block text-xs font-medium text-[#d8ceb2] mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#d8ceb2]/60">
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
                  className="w-full pl-9 pr-3 py-2.5 bg-[#010736] border border-[#22396f] rounded-xl text-xs text-[#fcf1d0] focus:outline-none focus:ring-1 focus:ring-[#fcf1d0] transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 rounded-xl font-bold text-xs bg-[#22396f] hover:bg-[#22396f]/80 text-[#fcf1d0] border border-[#22396f] flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md"
            >
              <span>Sign In as {selectedRole === 'client' ? 'Client' : 'Business'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Demo helper banner */}
          <div className="mt-6 pt-5 border-t border-[#22396f]/70">
            <div className="bg-[#010736] p-3 rounded-xl border border-[#22396f] mb-3">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#fcf1d0] mb-1">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Demo Credentials Ready</span>
              </div>
              <p className="text-[11px] text-[#d8ceb2]">
                Username: <code className="bg-[#0d1c42] px-1 py-0.5 rounded text-[#fcf1d0] font-mono border border-[#22396f]">login</code> • Password: <code className="bg-[#0d1c42] px-1 py-0.5 rounded text-[#fcf1d0] font-mono border border-[#22396f]">password</code>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('client')}
                className="py-2 px-3 bg-[#010736] hover:bg-[#22396f] text-[#fcf1d0] font-medium rounded-lg transition-colors text-center border border-[#22396f] cursor-pointer"
              >
                1-Click Client Demo
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('business')}
                className="py-2 px-3 bg-[#010736] hover:bg-[#22396f] text-[#fcf1d0] font-medium rounded-lg transition-colors text-center border border-[#22396f] cursor-pointer"
              >
                1-Click Shop Demo
              </button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-[#d8ceb2]/70 mt-6">
          Dispatch · Demo workspace
        </p>
      </motion.div>
    </div>
  );
};
