import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useDemoData } from '../context/DemoDataContext';
import { LogOut, RotateCcw, User, Store, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, switchRole } = useAuth();
  const { resetDemo } = useDemoData();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-[#0d1c42]/95 backdrop-blur-md border-b border-[#22396f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#22396f] flex items-center justify-center text-[#fcf1d0] shadow-sm border border-[#22396f]/80">
            <Sparkles size={18} className="text-[#fcf1d0]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-[#fcf1d0]">Dispatch</span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-[#22396f] text-[#fcf1d0] px-2 py-0.5 rounded-full border border-[#22396f]">
                Demo
              </span>
            </div>
            <p className="text-[11px] text-[#d8ceb2] hidden sm:block">Cancel free, as long as we fill your spot</p>
          </div>
        </div>

        {/* Navigation & Role Controls */}
        <div className="flex items-center space-x-3">
          {/* Role switcher toggle */}
          <div className="bg-[#010736] p-1 rounded-xl flex items-center border border-[#22396f]">
            <button
              onClick={() => switchRole('client')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                user.role === 'client'
                  ? 'bg-[#22396f] text-[#fcf1d0] shadow-xs font-semibold'
                  : 'text-[#d8ceb2] hover:text-[#fcf1d0]'
              }`}
            >
              <User size={13} />
              <span>Client Mode</span>
            </button>
            <button
              onClick={() => switchRole('business')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                user.role === 'business'
                  ? 'bg-[#22396f] text-[#fcf1d0] shadow-xs font-semibold'
                  : 'text-[#d8ceb2] hover:text-[#fcf1d0]'
              }`}
            >
              <Store size={13} />
              <span>Business Mode</span>
            </button>
          </div>

          {/* Reset Demo State Button */}
          <button
            onClick={resetDemo}
            title="Reset calendar and waitlist to initial demo state"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs text-[#d8ceb2] hover:text-[#fcf1d0] hover:bg-[#22396f]/60 rounded-lg transition-colors border border-[#22396f] cursor-pointer"
          >
            <RotateCcw size={12} className="text-[#d8ceb2]" />
            <span className="hidden md:inline">Reset</span>
          </button>

          {/* Logout button */}
          <button
            onClick={logout}
            title="Log out"
            className="flex items-center space-x-1 px-3 py-1.5 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-900/60 cursor-pointer"
          >
            <LogOut size={12} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
