import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useDemoData } from '../context/DemoDataContext';
import { LogOut, RotateCcw, User, Store, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, switchRole } = useAuth();
  const { resetDemo } = useDemoData();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">Dispatch</span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200/60">
                Live Demo
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Cancel free, as long as we fill your spot</p>
          </div>
        </div>

        {/* Navigation & Role Controls */}
        <div className="flex items-center space-x-3">
          {/* Role switcher toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => switchRole('client')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                user.role === 'client'
                  ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User size={14} />
              <span>Client Mode</span>
            </button>
            <button
              onClick={() => switchRole('business')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                user.role === 'business'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store size={14} />
              <span>Business Mode</span>
            </button>
          </div>

          {/* Reset Demo State Button */}
          <button
            onClick={resetDemo}
            title="Reset calendar and waitlist to initial demo state"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/80"
          >
            <RotateCcw size={13} className="text-slate-400" />
            <span className="hidden md:inline">Reset</span>
          </button>

          {/* Logout button */}
          <button
            onClick={logout}
            title="Log out"
            className="flex items-center space-x-1 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200/60"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
