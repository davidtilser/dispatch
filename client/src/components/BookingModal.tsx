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
  const [selectedSlot, setSelectedSlot] = useState(business.availableSlots[0] || '2:00 PM');
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-600">
              Direct Booking
            </span>
            <h3 className="text-lg font-bold text-slate-900">{business.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleBook} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Booking Collision Prevented</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Select Service */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Service
            </label>
            <div className="space-y-2">
              {business.services.map((svc) => (
                <label
                  key={svc.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedServiceId === svc.id
                      ? 'border-indigo-600 bg-indigo-50/60 font-semibold text-indigo-950'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="service"
                      checked={selectedServiceId === svc.id}
                      onChange={() => setSelectedServiceId(svc.id)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{svc.name}</span>
                    <span className="text-slate-400">({svc.durationMin}m)</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    ${(svc.priceCents / 100).toFixed(0)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Select Time Slot */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
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
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium border flex items-center justify-center space-x-1 transition-all ${
                      taken
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                        : selectedSlot === slot
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs shadow-indigo-200'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
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
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Total: <b className="text-slate-900 font-mono text-sm">${((selectedService?.priceCents || 0) / 100).toFixed(0)}</b>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-200 transition-all flex items-center space-x-1.5 cursor-pointer"
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
