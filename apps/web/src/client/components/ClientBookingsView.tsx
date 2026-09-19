import React from 'react';
import { useDemoData } from '../context/DemoDataContext';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

interface ClientBookingsViewProps {
  onBackToSearch: () => void;
}

export const ClientBookingsView: React.FC<ClientBookingsViewProps> = ({ onBackToSearch }) => {
  const { clientBookings, waitlist } = useDemoData();

  // Entries added in this client demo session, including a custom display name.
  const clientWaitlist = waitlist.filter((w) => w.createdByClient);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-center justify-between pb-6 border-b border-[#263751]">
        <div>
          <h1 className="text-2xl font-bold text-[#f7f3e8]">My Appointments & Waitlists</h1>
          <p className="text-xs text-[#f7f3e8]/70 mt-0.5">Manage your active bookings and automated queue updates</p>
        </div>
        <button
          onClick={onBackToSearch}
          className="flex items-center space-x-1.5 px-4 py-2 bg-[#263751] hover:bg-[#2c478a] border border-[#263751] text-[#f7f3e8] text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <span>Find Services</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Confirmed Bookings */}
      <div className="bg-[#101a30] rounded-2xl border border-[#263751] p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#f7f3e8]">
          <Calendar size={14} className="text-[#f7f3e8]" />
          <span>Confirmed Bookings</span>
        </div>

        {clientBookings.length === 0 ? (
          <p className="text-xs text-[#f7f3e8]/60 py-4 text-center">
            You have no upcoming bookings. Choose a category to book your first service!
          </p>
        ) : (
          <div className="space-y-3">
            {clientBookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-[#263751] bg-[#080e20]/50 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-[#f7f3e8]">{b.businessName}</h4>
                  <p className="text-xs text-[#f7f3e8]/70 mt-0.5">
                    {b.serviceName} • {b.startTime} ({b.endTime})
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40">
                    Confirmed
                  </span>
                  <span className="font-mono text-xs font-bold text-[#f7f3e8]">
                    ${(b.priceCents / 100).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Waitlists */}
      <div className="bg-[#101a30] rounded-2xl border border-[#263751] p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#f7f3e8]">
          <Clock size={14} className="text-[#f7f3e8]" />
          <span>Active Waitlist Queues</span>
        </div>

        {clientWaitlist.length === 0 ? (
          <p className="text-xs text-[#f7f3e8]/60 py-4 text-center">
            You are not currently on any waitlists. When a business is fully booked, you can join their automated queue.
          </p>
        ) : (
          <div className="space-y-3">
            {clientWaitlist.map((w) => (
              <div
                key={w.id}
                className="p-4 rounded-xl border border-[#263751] bg-[#080e20]/50 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-[#f7f3e8]">{w.businessName}</h4>
                    <span className="text-[10px] font-bold text-[#f7f3e8] bg-[#263751] px-2 py-0.5 rounded-md border border-[#263751]">
                      Position #{w.position} in line
                    </span>
                  </div>
                  <p className="text-xs text-[#f7f3e8]/70 mt-0.5">
                    {w.serviceName} • Window: {w.requestedWindow}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-[#f7f3e8]/80 font-medium flex items-center space-x-1">
                    <span>Demo queue</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
