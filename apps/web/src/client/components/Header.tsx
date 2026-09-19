import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useDemoData } from '../context/DemoDataContext';
import { LogOut, RotateCcw, User, Store } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, switchRole } = useAuth();
  const { resetDemo } = useDemoData();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-[#0d1c42]/95 backdrop-blur-md border-b border-[#22396f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-3 flex flex-wrap gap-3 items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <img
            src="/dispatch-logo.png"
            alt="Dispatch"
            width={56}
            height={56}
            className="w-14 h-14 shrink-0 rounded-xl bg-white object-contain border border-[#22396f]"
          />
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
              onClick={() => window.location.assign('/')}
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
            title="Reset the client demo only"
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
