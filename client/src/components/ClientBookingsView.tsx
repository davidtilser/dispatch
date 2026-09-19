import React from 'react';
import { useDemoData } from '../context/DemoDataContext';
import { Calendar, Clock, CheckCircle2, PhoneCall, ArrowRight, User } from 'lucide-react';

interface ClientBookingsViewProps {
  onBackToSearch: () => void;
}

export const ClientBookingsView: React.FC<ClientBookingsViewProps> = ({ onBackToSearch }) => {
  const { clientBookings, waitlist, voiceCall, acceptVoiceOffer, declineVoiceOffer } = useDemoData();

  // Any waitlist entries belonging to Demo Client
  const clientWaitlist = waitlist.filter((w) => w.clientName === 'Demo Client' || w.clientName === 'Jordan Davis');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#22396f]">
        <div>
          <h1 className="text-2xl font-bold text-[#fcf1d0]">My Appointments & Waitlists</h1>
          <p className="text-xs text-[#fcf1d0]/70 mt-0.5">Manage your active bookings and automated queue updates</p>
        </div>
        <button
          onClick={onBackToSearch}
          className="flex items-center space-x-1.5 px-4 py-2 bg-[#22396f] hover:bg-[#2c478a] border border-[#22396f] text-[#fcf1d0] text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <span>Find Services</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* INCOMING CALL NOTIFICATION (When a waitlist slot opens up for the client!) */}
      {voiceCall.isActive && (
        <div className="bg-gradient-to-r from-[#0d1c42] to-[#22396f] rounded-2xl p-6 text-[#fcf1d0] shadow-xl border-2 border-[#fcf1d0]/50 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-[#22396f] border border-[#fcf1d0]/30 flex items-center justify-center text-[#fcf1d0] shadow-md">
                <PhoneCall size={24} className="animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  Incoming Waitlist Call
                </span>
                <h3 className="text-lg font-bold mt-1 text-[#fcf1d0]">
                  {voiceCall.businessName} is calling you!
                </h3>
                <p className="text-xs text-[#fcf1d0]/80">
                  Spot opened up for {voiceCall.slotTime} ({voiceCall.serviceName})
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-[#fcf1d0]/70">Time to respond</span>
              <p className="text-2xl font-mono font-bold text-[#fcf1d0]">
                0:{voiceCall.secondsRemaining < 10 ? `0${voiceCall.secondsRemaining}` : voiceCall.secondsRemaining}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-[#010736]/70 backdrop-blur-xs rounded-xl text-xs italic text-[#fcf1d0] border border-[#22396f]">
            {voiceCall.transcript}
          </div>

          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={declineVoiceOffer}
              className="px-4 py-2 bg-[#010736]/60 hover:bg-[#010736] text-xs font-semibold rounded-xl text-[#fcf1d0]/80 border border-[#22396f] transition-colors cursor-pointer"
            >
              Pass (Decline)
            </button>
            <button
              onClick={acceptVoiceOffer}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>Accept & Confirm Booking</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmed Bookings */}
      <div className="bg-[#0d1c42] rounded-2xl border border-[#22396f] p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#fcf1d0]">
          <Calendar size={14} className="text-[#fcf1d0]" />
          <span>Confirmed Bookings</span>
        </div>

        {clientBookings.length === 0 ? (
          <p className="text-xs text-[#fcf1d0]/60 py-4 text-center">
            You have no upcoming bookings. Choose a category to book your first service!
          </p>
        ) : (
          <div className="space-y-3">
            {clientBookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-[#22396f] bg-[#010736]/50 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-[#fcf1d0]">{b.businessName}</h4>
                  <p className="text-xs text-[#fcf1d0]/70 mt-0.5">
                    {b.serviceName} • {b.startTime} ({b.endTime})
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40">
                    Confirmed
                  </span>
                  <span className="font-mono text-xs font-bold text-[#fcf1d0]">
                    ${(b.priceCents / 100).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Waitlists */}
      <div className="bg-[#0d1c42] rounded-2xl border border-[#22396f] p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#fcf1d0]">
          <Clock size={14} className="text-[#fcf1d0]" />
          <span>Active Waitlist Queues</span>
        </div>

        {clientWaitlist.length === 0 ? (
          <p className="text-xs text-[#fcf1d0]/60 py-4 text-center">
            You are not currently on any waitlists. When a business is fully booked, you can join their automated queue.
          </p>
        ) : (
          <div className="space-y-3">
            {clientWaitlist.map((w, idx) => (
              <div
                key={w.id}
                className="p-4 rounded-xl border border-[#22396f] bg-[#010736]/50 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-[#fcf1d0]">{w.businessName}</h4>
                    <span className="text-[10px] font-bold text-[#fcf1d0] bg-[#22396f] px-2 py-0.5 rounded-md border border-[#22396f]">
                      Position #{idx + 1} in line
                    </span>
                  </div>
                  <p className="text-xs text-[#fcf1d0]/70 mt-0.5">
                    {w.serviceName} • Window: {w.requestedWindow}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-[#fcf1d0]/80 font-medium flex items-center space-x-1">
                    <span>AI Dispatch Monitoring</span>
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
