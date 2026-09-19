import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useDemoData } from '../context/DemoDataContext';
import {
  Calendar as CalendarIcon,
  Clock,
  PhoneCall,
  UserCheck,
  UserX,
  Volume2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldCheck,
  DollarSign,
  Radio,
  LogOut,
} from 'lucide-react';

export const BusinessDashboard: React.FC = () => {
  const { logout } = useAuth();
  const {
    bookings,
    waitlist,
    voiceCall,
    cancelBooking,
    acceptVoiceOffer,
    declineVoiceOffer,
    endVoiceCall,
  } = useDemoData();

  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const handleCancelClick = (id: string) => {
    setConfirmCancelId(id);
  };

  const confirmCancelAction = () => {
    if (confirmCancelId) {
      cancelBooking(confirmCancelId);
      setConfirmCancelId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#fcf1d0]">
      {/* Top Banner / Metrics */}
      <div className="bg-[#0d1c42] rounded-3xl p-6 sm:p-8 border border-[#22396f] shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#010736] text-xs font-semibold text-[#fcf1d0] border border-[#22396f] mb-3">
            <Radio size={12} className="text-[#fcf1d0] animate-pulse" />
            <span>SMB Dispatch Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#fcf1d0]">
            Fade Factory Barber Co.
          </h1>
          <p className="text-xs sm:text-sm text-[#d8ceb2] mt-1 max-w-xl leading-relaxed">
            Automated waitlist dispatch engine. When a client cancels, we instantly call the queue using ElevenLabs voice AI to refill the chair and waive cancellation fees.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-[#010736] rounded-2xl p-3.5 border border-[#22396f] text-center">
              <span className="text-[11px] text-[#d8ceb2] font-medium block">Active Bookings</span>
              <span className="text-xl font-bold font-mono text-[#fcf1d0]">
                {bookings.filter((b) => b.status === 'confirmed').length}
              </span>
            </div>
            <div className="bg-[#010736] rounded-2xl p-3.5 border border-[#22396f] text-center">
              <span className="text-[11px] text-[#d8ceb2] font-medium block">Waitlist Queue</span>
              <span className="text-xl font-bold font-mono text-[#fcf1d0]">
                {waitlist.filter((w) => w.status === 'waiting' || w.status === 'calling').length}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-[#010736] rounded-2xl p-3.5 border border-[#22396f] text-center">
              <span className="text-[11px] text-[#d8ceb2] font-medium block">Refill Rate</span>
              <span className="text-xl font-bold font-mono text-emerald-300">100%</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded-xl transition-colors border border-rose-900/60 cursor-pointer shadow-xs self-start sm:self-end"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* ELEVENLABS VOICE DISPATCH PANEL (Active Call Space) */}
      <AnimatePresence>
        {voiceCall.isActive && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.99 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl bg-[#0d1c42] border-2 border-[#22396f] p-6 sm:p-8 text-[#fcf1d0] shadow-2xl relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-[#22396f]">
              {/* Left: Call Info */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#010736] text-[#fcf1d0] text-xs font-bold border border-[#22396f]">
                    <Sparkles size={12} className="text-[#fcf1d0]" />
                    <span>ElevenLabs Voice AI</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#22396f] text-[#fcf1d0] text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
                    <span>Live Outbound Call</span>
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[#fcf1d0]">
                  Calling {voiceCall.targetCandidate?.clientName || 'Candidate'}
                </h2>
                <p className="text-xs text-[#d8ceb2] mt-1">
                  Offering newly opened slot: <b className="text-[#fcf1d0]">{voiceCall.slotTime} ({voiceCall.serviceName})</b>
                </p>
              </div>

              {/* Right: Timer & Waveform */}
              <div className="flex items-center space-x-6">
                {/* Audio Waveform Animation */}
                <div className="flex items-center space-x-1 h-10 px-4 py-2 bg-[#010736] rounded-2xl border border-[#22396f]">
                  <span className="text-[10px] text-[#d8ceb2] font-mono font-bold mr-2 uppercase tracking-wider">Voice</span>
                  {[35, 70, 95, 55, 85, 40, 75].map((h, i) => (
                    <motion.span
                      key={i}
                      animate={{ height: voiceCall.status === 'speaking' ? [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`] : '20%' }}
                      transition={{ repeat: Infinity, duration: 0.55 + i * 0.08, ease: 'easeInOut' }}
                      className="w-1.5 bg-[#fcf1d0] rounded-full inline-block"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>

                {/* Countdown ring */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] text-[#d8ceb2] font-medium">Expires in</span>
                  <span className="text-2xl font-mono font-extrabold text-[#fcf1d0]">
                    0:{voiceCall.secondsRemaining < 10 ? `0${voiceCall.secondsRemaining}` : voiceCall.secondsRemaining}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle: Transcript */}
            <div className="py-5">
              <div className="text-[11px] font-semibold text-[#d8ceb2] uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <Volume2 size={13} className="text-[#fcf1d0]" />
                <span>AI Voice Transcript (Realtime)</span>
              </div>
              <div className="bg-[#010736] p-4 rounded-2xl border border-[#22396f] text-sm font-medium text-[#fcf1d0] leading-relaxed italic">
                {voiceCall.transcript}
              </div>
            </div>

            {/* Bottom Controls / Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center space-x-2 text-xs text-[#d8ceb2]">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Simulated Voice Call Session • ElevenLabs Agent ID configured</span>
              </div>

              <div className="flex items-center space-x-3">
                {voiceCall.status !== 'accepted' && voiceCall.status !== 'declined' ? (
                  <>
                    <button
                      onClick={declineVoiceOffer}
                      className="px-4 py-2 bg-[#010736] hover:bg-[#22396f] text-[#d8ceb2] hover:text-[#fcf1d0] text-xs font-semibold rounded-xl border border-[#22396f] transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <UserX size={13} />
                      <span>Simulate Decline (Call Next)</span>
                    </button>
                    <button
                      onClick={acceptVoiceOffer}
                      className="px-5 py-2 bg-[#22396f] hover:bg-[#22396f]/80 text-[#fcf1d0] text-xs font-bold rounded-xl border border-[#fcf1d0]/50 transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
                    >
                      <UserCheck size={13} />
                      <span>Candidate Accepts (Book & Waive Fee)</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={endVoiceCall}
                    className="px-5 py-2 bg-[#22396f] hover:bg-[#22396f]/80 text-[#fcf1d0] text-xs font-semibold rounded-xl border border-[#22396f] transition-all cursor-pointer"
                  >
                    Close Voice Call Panel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Today's Appointments & Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0d1c42] rounded-3xl border border-[#22396f] shadow-lg p-6 sm:p-8">
            <div className="flex items-center justify-between pb-6 border-b border-[#22396f]">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#d8ceb2]">
                  <CalendarIcon size={14} />
                  <span>Today’s Agenda</span>
                </div>
                <h2 className="text-xl font-bold text-[#fcf1d0] mt-1">Confirmed Appointments</h2>
              </div>
              <div className="text-xs text-[#d8ceb2]">
                Guaranteed zero double-booking
              </div>
            </div>

            <div className="mt-6 space-y-3.5">
              {bookings.map((booking) => {
                const isCancelled = booking.status === 'cancelled';
                return (
                  <div
                    key={booking.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCancelled
                        ? 'bg-rose-950/20 border-rose-900/60'
                        : 'bg-[#010736] hover:bg-[#010736]/80 border-[#22396f]'
                    }`}
                  >
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                          isCancelled
                            ? 'bg-rose-950 text-rose-300 font-bold border border-rose-900'
                            : 'bg-[#22396f] text-[#fcf1d0] font-bold border border-[#22396f]'
                        }`}
                      >
                        <Clock size={15} />
                        <span className="text-[10px] mt-0.5 font-mono">{booking.startTime.split(' ')[0]}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-[#fcf1d0]">{booking.clientName}</h4>
                          {isCancelled ? (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                              Cancelled
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Confirmed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#d8ceb2] mt-0.5">
                          {booking.serviceName} • {booking.startTime} ({booking.endTime})
                        </p>
                      </div>
                    </div>

                    {/* Fee Status & Actions */}
                    <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#22396f]">
                      {booking.feeStatus === 'pending' && (
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
                            <DollarSign size={12} />
                            <span>$15 Fee Pending</span>
                          </span>
                          <span className="text-[10px] text-[#d8ceb2]/80 block">Waived when refilled</span>
                        </div>
                      )}

                      {booking.feeStatus === 'waived' && (
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-emerald-300 flex items-center space-x-1">
                            <CheckCircle2 size={12} />
                            <span>$15 Fee Waived!</span>
                          </span>
                          <span className="text-[10px] text-[#d8ceb2]/80 block">Spot refilled by waitlist</span>
                        </div>
                      )}

                      {!isCancelled && (
                        <button
                          onClick={() => handleCancelClick(booking.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded-xl border border-rose-900 transition-colors cursor-pointer"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Waitlist Queue */}
        <div className="space-y-6">
          <div className="bg-[#0d1c42] rounded-3xl border border-[#22396f] shadow-lg p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#22396f]">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#d8ceb2]">
                <Users size={14} />
                <span>Queue Order</span>
              </div>
              <span className="text-xs bg-[#010736] text-[#fcf1d0] px-2.5 py-0.5 rounded-full font-bold border border-[#22396f]">
                {waitlist.length} Waiting
              </span>
            </div>

            <p className="text-xs text-[#d8ceb2] mt-3 leading-relaxed">
              When an opening occurs, Dispatch automatically calls the top candidate in order.
            </p>

            <div className="mt-5 space-y-3">
              {waitlist.map((waiter, index) => {
                const isCalling = waiter.status === 'calling';
                const isAccepted = waiter.status === 'accepted';
                const isDeclined = waiter.status === 'declined';

                return (
                  <div
                    key={waiter.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isCalling
                        ? 'bg-[#22396f] border-[#fcf1d0]/50'
                        : isAccepted
                        ? 'bg-emerald-950/30 border-emerald-800'
                        : isDeclined
                        ? 'bg-[#010736] border-[#22396f] opacity-60'
                        : 'bg-[#010736] border-[#22396f]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                            isCalling
                              ? 'bg-[#fcf1d0] text-[#010736]'
                              : 'bg-[#0d1c42] text-[#fcf1d0] border border-[#22396f]'
                          }`}
                        >
                          #{index + 1}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-[#fcf1d0]">{waiter.clientName}</h5>
                          <p className="text-[11px] text-[#d8ceb2]">{waiter.serviceName}</p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isCalling && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#fcf1d0] text-[#010736] animate-pulse flex items-center space-x-1">
                            <PhoneCall size={10} />
                            <span>Calling...</span>
                          </span>
                        )}
                        {isAccepted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Accepted
                          </span>
                        )}
                        {isDeclined && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0d1c42] text-[#d8ceb2] border border-[#22396f]">
                            Skipped
                          </span>
                        )}
                        {waiter.status === 'waiting' && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#0d1c42] border border-[#22396f] text-[#d8ceb2]">
                            Waiting
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-[#d8ceb2]/80 flex items-center justify-between">
                      <span>Window: {waiter.requestedWindow}</span>
                      <span>{waiter.addedAt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {confirmCancelId && (
        <div className="fixed inset-0 z-50 bg-[#010736]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0d1c42] rounded-2xl p-6 max-w-sm w-full border border-[#22396f] shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-800">
                <AlertTriangle size={18} />
              </div>
              <h4 className="text-base font-bold text-[#fcf1d0]">Cancel Booking?</h4>
            </div>
            <p className="text-xs text-[#d8ceb2] leading-relaxed">
              This will mark the spot cancelled and immediately trigger Dispatch's <b>ElevenLabs voice engine</b> to call the first person on the waitlist (Jordan Davis).
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setConfirmCancelId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#d8ceb2] hover:bg-[#010736] rounded-xl border border-[#22396f] cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={confirmCancelAction}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-800 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer border border-rose-700"
              >
                Confirm & Call Waitlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
