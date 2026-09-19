import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { Lock, User, Store, ArrowRight, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/40 flex flex-col justify-center items-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-md w-full"
      >
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 mb-4">
            <Sparkles size={28} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Dispatch
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Cancel free, as long as we fill your spot.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-8">
          {/* Role selector tabs */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setSelectedRole('client')}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  selectedRole === 'client'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User size={16} />
                <span>Client Portal</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('business')}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  selectedRole === 'business'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store size={16} />
                <span>Business Portal</span>
              </button>
            </div>
          </div>

          {/* Error notification */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2"
            >
              <ShieldAlert size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="login"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full mt-2 py-3 rounded-xl font-semibold text-sm text-white shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                selectedRole === 'client'
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              <span>Sign In as {selectedRole === 'client' ? 'Client' : 'Business'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Demo helper banner */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-3">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-1">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Demo Credentials Pre-configured</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Username: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">login</code> • Password: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">password</code>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('client')}
                className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg transition-colors text-center border border-indigo-200/60"
              >
                1-Click Client Demo
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('business')}
                className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium rounded-lg transition-colors text-center border border-emerald-200/60"
              >
                1-Click Shop Demo
              </button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Local Hackathon Demo • Loopback Protected
        </p>
      </motion.div>
    </div>
  );
};
