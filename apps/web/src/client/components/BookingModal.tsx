import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { MockBusiness } from '../types';
import { useDemoData } from '../context/DemoDataContext';
import { X, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface BookingModalProps {
  business: MockBusiness;
  onClose: () => void;
  onSuccess: (slotTime: string, serviceName: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  business,
  onClose,
  onSuccess,
}) => {
  const { bookSlot, isSlotTaken } = useDemoData();
  const [selectedServiceId, setSelectedServiceId] = useState(business.services[0]?.id || '');
  const [selectedSlot, setSelectedSlot] = useState(business.availableSlots.find(slot => !isSlotTaken(business.id, slot)) ?? '');
  const [clientName, setClientName] = useState('Demo Client');
  const [clientPhone, setClientPhone] = useState('555-0100');
  const [error, setError] = useState<string | null>(null);

  const selectedService = business.services.find((s) => s.id === selectedServiceId) || business.services[0];

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = bookSlot(business, selectedServiceId, selectedSlot, clientName, clientPhone);
    if (!result.success) {
      setError(result.error || 'Failed to book slot');
    } else {
      onSuccess(selectedSlot, selectedService?.name || 'Service');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#080e20]/70 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div role="dialog" aria-modal="true" aria-label="Book appointment"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#101a30] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto border border-[#263751] text-[#f7f3e8]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#263751] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#f7f3e8]/70">
              Direct Booking
            </span>
            <h3 className="text-lg font-bold text-[#f7f3e8]">{business.name}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-[#080e20] text-[#f7f3e8]/60 hover:text-[#f7f3e8] hover:bg-[#263751]/50 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleBook} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-start space-x-2">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Booking Collision Prevented</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Select Service */}
          <div>
            <label className="block text-xs font-semibold text-[#f7f3e8]/80 mb-2">
              Select Service
            </label>
            <div className="space-y-2">
              {business.services.map((svc) => (
                <label
                  key={svc.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedServiceId === svc.id
                      ? 'border-[#f7f3e8] bg-[#263751]/60 font-semibold text-[#f7f3e8]'
                      : 'border-[#263751] hover:bg-[#263751]/20 text-[#f7f3e8]/80'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="service"
                      checked={selectedServiceId === svc.id}
                      onChange={() => setSelectedServiceId(svc.id)}
                      className="accent-[#f7f3e8]"
                    />
                    <span>{svc.name}</span>
                    <span className="text-[#f7f3e8]/50">({svc.durationMin}m)</span>
                  </div>
                  <span className="font-mono font-bold text-[#f7f3e8]">
                    ${(svc.priceCents / 100).toFixed(0)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Select Time Slot */}
          <div>
            <label className="block text-xs font-semibold text-[#f7f3e8]/80 mb-2">
              Available Slots Today
            </label>
            <div className="grid grid-cols-3 gap-2">
              {business.availableSlots.map((slot) => {
                const taken = isSlotTaken(business.id, slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={taken}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium border flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      taken
                        ? 'bg-[#080e20]/60 text-[#f7f3e8]/30 border-[#263751]/40 cursor-not-allowed line-through'
                        : selectedSlot === slot
                        ? 'bg-[#263751] text-[#f7f3e8] border-[#f7f3e8] font-bold shadow-xs'
                        : 'bg-[#080e20] hover:bg-[#263751]/30 text-[#f7f3e8]/80 border-[#263751]'
                    }`}
                  >
                    <Clock size={12} />
                    <span>{slot}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-[#f7f3e8]/80 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#080e20] border border-[#263751] rounded-xl text-xs text-[#f7f3e8] placeholder-[#f7f3e8]/40 focus:outline-none focus:border-[#f7f3e8]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#f7f3e8]/80 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#080e20] border border-[#263751] rounded-xl text-xs text-[#f7f3e8] placeholder-[#f7f3e8]/40 focus:outline-none focus:border-[#f7f3e8]"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-[#263751] flex items-center justify-between">
            <div className="text-xs text-[#f7f3e8]/70">
              Total: <b className="text-[#f7f3e8] font-mono text-sm">${((selectedService?.priceCents || 0) / 100).toFixed(0)}</b>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#f7f3e8]/70 hover:bg-[#263751]/40 hover:text-[#f7f3e8] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-[#f7f3e8] bg-[#263751] hover:bg-[#2c478a] border border-[#263751] rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle size={14} />
                <span>Confirm Booking</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
