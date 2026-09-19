import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemoData } from '../context/DemoDataContext';
import {
  Calendar as CalendarIcon,
  Clock,
  PhoneCall,
  UserCheck,
  UserX,
  Volume2,
  Mic,
  MicOff,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldCheck,
  DollarSign,
  Radio,
} from 'lucide-react';

export const BusinessDashboard: React.FC = () => {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Metrics */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-emerald-200 border border-white/10 mb-3">
            <Radio size={12} className="animate-pulse text-emerald-300" />
            <span>SMB Dispatch Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Fade Factory Barber Co.
          </h1>
          <p className="text-sm text-emerald-100/80 mt-1 max-w-xl">
            Automated waitlist dispatch engine. When a client cancels, we instantly call the queue using ElevenLabs voice AI to refill the chair and waive cancellation fees.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10 text-center">
            <span className="text-xs text-emerald-200 font-medium block">Active Bookings</span>
            <span className="text-xl font-bold font-mono">
              {bookings.filter((b) => b.status === 'confirmed').length}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10 text-center">
            <span className="text-xs text-emerald-200 font-medium block">Waitlist Queue</span>
            <span className="text-xl font-bold font-mono">
              {waitlist.filter((w) => w.status === 'waiting' || w.status === 'calling').length}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10 text-center">
            <span className="text-xs text-emerald-200 font-medium block">Refill Rate</span>
            <span className="text-xl font-bold font-mono text-emerald-300">100%</span>
          </div>
        </div>
      </div>

      {/* ELEVENLABS VOICE DISPATCH PANEL (Active Call Space) */}
      <AnimatePresence>
        {voiceCall.isActive && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className="rounded-3xl bg-slate-900 border-2 border-indigo-500/40 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-800">
              {/* Left: Call Info */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                    <Sparkles size={13} className="text-indigo-400" />
                    <span>ElevenLabs Voice AI Dispatch</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
                    <span>Live Outbound Call</span>
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Calling {voiceCall.targetCandidate?.clientName || 'Candidate'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Offering newly opened slot: <b className="text-slate-200">{voiceCall.slotTime} ({voiceCall.serviceName})</b>
                </p>
              </div>

              {/* Right: Timer & Waveform */}
              <div className="flex items-center space-x-6">
                {/* Audio Waveform Animation */}
                <div className="flex items-center space-x-1 h-10 px-4 py-2 bg-slate-800/80 rounded-2xl border border-slate-700">
                  <span className="text-[10px] text-indigo-400 font-mono font-bold mr-2 uppercase tracking-wider">Voice</span>
                  {[40, 75, 100, 60, 90, 45, 80].map((h, i) => (
                    <motion.span
                      key={i}
                      animate={{ height: voiceCall.status === 'speaking' ? [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`] : '20%' }}
                      transition={{ repeat: Infinity, duration: 0.6 + i * 0.1, ease: 'easeInOut' }}
                      className="w-1.5 bg-gradient-to-t from-indigo-500 to-emerald-400 rounded-full inline-block"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>

                {/* Countdown ring */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-slate-400 font-medium">Expires in</span>
                  <span className="text-2xl font-mono font-extrabold text-amber-400">
                    0:{voiceCall.secondsRemaining < 10 ? `0${voiceCall.secondsRemaining}` : voiceCall.secondsRemaining}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle: Transcript */}
            <div className="py-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <Volume2 size={13} className="text-indigo-400" />
                <span>AI Voice Transcript (Realtime)</span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-sm font-medium text-slate-200 leading-relaxed italic">
                {voiceCall.transcript}
              </div>
            </div>

            {/* Bottom Controls / Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Simulated Voice Call Session • ElevenLabs Agent ID configured</span>
              </div>

              <div className="flex items-center space-x-3">
                {voiceCall.status !== 'accepted' && voiceCall.status !== 'declined' ? (
                  <>
                    <button
                      onClick={declineVoiceOffer}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <UserX size={14} />
                      <span>Simulate Decline (Call Next)</span>
                    </button>
                    <button
                      onClick={acceptVoiceOffer}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <UserCheck size={14} />
                      <span>Candidate Accepts (Book & Waive Fee)</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={endVoiceCall}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
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
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <CalendarIcon size={14} />
                  <span>Today’s Agenda</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Confirmed Appointments</h2>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Double-booking protected by domain intervals
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
                        ? 'bg-rose-50/50 border-rose-200/80'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                          isCancelled
                            ? 'bg-rose-100 text-rose-700 font-bold'
                            : 'bg-indigo-50 text-indigo-700 font-bold'
                        }`}
                      >
                        <Clock size={16} />
                        <span className="text-[10px] mt-0.5">{booking.startTime.split(' ')[0]}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-slate-900">{booking.clientName}</h4>
                          {isCancelled ? (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                              Cancelled
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Confirmed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {booking.serviceName} • {booking.startTime} ({booking.endTime})
                        </p>
                      </div>
                    </div>

                    {/* Fee Status & Actions */}
                    <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {booking.feeStatus === 'pending' && (
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-amber-600 flex items-center space-x-1">
                            <DollarSign size={12} />
                            <span>$15 Fee Pending</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block">Waived when refilled</span>
                        </div>
                      )}

                      {booking.feeStatus === 'waived' && (
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center space-x-1">
                            <CheckCircle2 size={12} />
                            <span>$15 Fee Waived!</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block">Spot refilled by waitlist</span>
                        </div>
                      )}

                      {!isCancelled && (
                        <button
                          onClick={() => handleCancelClick(booking.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
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
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
                <Users size={15} />
                <span>Queue Order</span>
              </div>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {waitlist.length} Waiting
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
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
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                        : isAccepted
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : isDeclined
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                            isCalling
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-slate-700 border border-slate-200'
                          }`}
                        >
                          #{index + 1}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{waiter.clientName}</h5>
                          <p className="text-[11px] text-slate-500">{waiter.serviceName}</p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isCalling && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white animate-pulse flex items-center space-x-1">
                            <PhoneCall size={10} />
                            <span>Calling...</span>
                          </span>
                        )}
                        {isAccepted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                            Accepted
                          </span>
                        )}
                        {isDeclined && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">
                            Skipped
                          </span>
                        )}
                        {waiter.status === 'waiting' && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border text-slate-600">
                            Waiting
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h4 className="text-base font-bold text-slate-900">Cancel Booking?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will mark the spot cancelled and immediately trigger Dispatch's <b>ElevenLabs voice engine</b> to call the first person on the waitlist (Jordan Davis).
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setConfirmCancelId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Go Back
              </button>
              <button
                onClick={confirmCancelAction}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
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
