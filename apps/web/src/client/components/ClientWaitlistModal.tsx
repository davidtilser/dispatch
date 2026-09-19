import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { MockBusiness } from '../types';
import { useDemoData } from '../context/DemoDataContext';
import { X, Clock, Users, Sparkles, CheckCircle } from 'lucide-react';

interface ClientWaitlistModalProps {
  business: MockBusiness;
  onClose: () => void;
  onSuccess: (position: number, serviceName: string) => void;
}

export const ClientWaitlistModal: React.FC<ClientWaitlistModalProps> = ({
  business,
  onClose,
  onSuccess,
}) => {
  const { joinWaitlist } = useDemoData();
  const [selectedService, setSelectedService] = useState(business.services[0]?.name || 'General Service');
  const [windowPreference, setWindowPreference] = useState('Today 2:00 PM - 5:00 PM');
  const [clientName, setClientName] = useState('Demo Client');
  const [clientPhone, setClientPhone] = useState('555-0100');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const res = joinWaitlist(business.id, selectedService, windowPreference, clientName, clientPhone);
    onSuccess(res.position, selectedService);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#010736]/70 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div role="dialog" aria-modal="true" aria-label="Join waitlist"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0d1c42] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto border border-[#22396f] text-[#fcf1d0]"
      >
        <div className="px-6 py-5 border-b border-[#22396f] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#22396f] text-[#fcf1d0] flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#fcf1d0]/70">
                Automated Waitlist
              </span>
              <h3 className="text-lg font-bold text-[#fcf1d0]">{business.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-[#010736] text-[#fcf1d0]/60 hover:text-[#fcf1d0] hover:bg-[#22396f]/50 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleJoin} className="p-6 space-y-5">
          {/* Informational banner */}
          <div className="p-3.5 bg-[#22396f]/40 border border-[#22396f] rounded-xl text-xs text-[#fcf1d0]/90 flex items-start space-x-2.5">
            <Sparkles size={16} className="text-[#fcf1d0] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This adds you to a sample waitlist. To try a real browser voice conversation, open the shop demo and cancel an appointment.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#fcf1d0]/80 mb-1.5">
              Service Needed
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#010736] border border-[#22396f] rounded-xl text-xs text-[#fcf1d0] font-medium focus:outline-none focus:border-[#fcf1d0]"
            >
              {business.services.map((svc) => (
                <option key={svc.id} value={svc.name} className="bg-[#0d1c42] text-[#fcf1d0]">
                  {svc.name} (${(svc.priceCents / 100).toFixed(0)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#fcf1d0]/80 mb-1.5">
              Preferred Time Window
            </label>
            <select
              value={windowPreference}
              onChange={(e) => setWindowPreference(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#010736] border border-[#22396f] rounded-xl text-xs text-[#fcf1d0] font-medium focus:outline-none focus:border-[#fcf1d0]"
            >
              <option value="Today 1:00 PM - 3:00 PM" className="bg-[#0d1c42] text-[#fcf1d0]">Today 1:00 PM - 3:00 PM</option>
              <option value="Today 2:00 PM - 5:00 PM" className="bg-[#0d1c42] text-[#fcf1d0]">Today 2:00 PM - 5:00 PM (Recommended)</option>
              <option value="Today 3:00 PM - 6:00 PM" className="bg-[#0d1c42] text-[#fcf1d0]">Today 3:00 PM - 6:00 PM</option>
              <option value="Tomorrow Anytime" className="bg-[#0d1c42] text-[#fcf1d0]">Tomorrow Anytime</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                Contact Phone
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

          <div className="pt-3 border-t border-[#22396f] flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs text-[#fcf1d0]/60">
              <Users size={14} className="text-[#fcf1d0]/60" />
              <span>Free to join • Cancel anytime</span>
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
                <span>Join Waitlist</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
