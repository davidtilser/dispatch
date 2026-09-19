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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-600">
                Automated Waitlist
              </span>
              <h3 className="text-lg font-bold text-slate-900">{business.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleJoin} className="p-6 space-y-5">
          {/* Informational banner */}
          <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
            <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              When another customer cancels or reschedules, Dispatch calls you via automated AI voice to claim the slot immediately.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Service Needed
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {business.services.map((svc) => (
                <option key={svc.id} value={svc.name}>
                  {svc.name} (${(svc.priceCents / 100).toFixed(0)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Preferred Time Window
            </label>
            <select
              value={windowPreference}
              onChange={(e) => setWindowPreference(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="Today 1:00 PM - 3:00 PM">Today 1:00 PM - 3:00 PM</option>
              <option value="Today 2:00 PM - 5:00 PM">Today 2:00 PM - 5:00 PM (Recommended)</option>
              <option value="Today 3:00 PM - 6:00 PM">Today 3:00 PM - 6:00 PM</option>
              <option value="Tomorrow Anytime">Tomorrow Anytime</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Users size={14} className="text-slate-400" />
              <span>Free to join • Cancel anytime</span>
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
                className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs shadow-amber-200 transition-all flex items-center space-x-1.5 cursor-pointer"
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
