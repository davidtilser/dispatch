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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#010736]/70 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div role="dialog" aria-modal="true" aria-label="Book appointment"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0d1c42] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto border border-[#22396f] text-[#fcf1d0]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#22396f] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#fcf1d0]/70">
              Direct Booking
            </span>
            <h3 className="text-lg font-bold text-[#fcf1d0]">{business.name}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-[#010736] text-[#fcf1d0]/60 hover:text-[#fcf1d0] hover:bg-[#22396f]/50 flex items-center justify-center transition-colors cursor-pointer"
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
            <label className="block text-xs font-semibold text-[#fcf1d0]/80 mb-2">
              Select Service
            </label>
            <div className="space-y-2">
              {business.services.map((svc) => (
                <label
                  key={svc.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedServiceId === svc.id
                      ? 'border-[#fcf1d0] bg-[#22396f]/60 font-semibold text-[#fcf1d0]'
                      : 'border-[#22396f] hover:bg-[#22396f]/20 text-[#fcf1d0]/80'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="service"
                      checked={selectedServiceId === svc.id}
                      onChange={() => setSelectedServiceId(svc.id)}
                      className="accent-[#fcf1d0]"
                    />
                    <span>{svc.name}</span>
                    <span className="text-[#fcf1d0]/50">({svc.durationMin}m)</span>
                  </div>
                  <span className="font-mono font-bold text-[#fcf1d0]">
                    ${(svc.priceCents / 100).toFixed(0)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Select Time Slot */}
          <div>
            <label className="block text-xs font-semibold text-[#fcf1d0]/80 mb-2">
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
                        ? 'bg-[#010736]/60 text-[#fcf1d0]/30 border-[#22396f]/40 cursor-not-allowed line-through'
                        : selectedSlot === slot
                        ? 'bg-[#22396f] text-[#fcf1d0] border-[#fcf1d0] font-bold shadow-xs'
                        : 'bg-[#010736] hover:bg-[#22396f]/30 text-[#fcf1d0]/80 border-[#22396f]'
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
              <label className="block text-xs font-medium text-[#fcf1d0]/80 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#010736] border border-[#22396f] rounded-xl text-xs text-[#fcf1d0] placeholder-[#fcf1d0]/40 focus:outline-none focus:border-[#fcf1d0]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#fcf1d0]/80 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#010736] border border-[#22396f] rounded-xl text-xs text-[#fcf1d0] placeholder-[#fcf1d0]/40 focus:outline-none focus:border-[#fcf1d0]"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-[#22396f] flex items-center justify-between">
            <div className="text-xs text-[#fcf1d0]/70">
              Total: <b className="text-[#fcf1d0] font-mono text-sm">${((selectedService?.priceCents || 0) / 100).toFixed(0)}</b>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#fcf1d0]/70 hover:bg-[#22396f]/40 hover:text-[#fcf1d0] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-[#fcf1d0] bg-[#22396f] hover:bg-[#2c478a] border border-[#22396f] rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
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
