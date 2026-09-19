import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoDataProvider } from './context/DemoDataContext';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { ClientOnboarding } from './components/ClientOnboarding';
import { ClientSearch } from './components/ClientSearch';
import { ClientBookingsView } from './components/ClientBookingsView';
import { BusinessDashboard } from './components/BusinessDashboard';
import { BookingModal } from './components/BookingModal';
import { ClientWaitlistModal } from './components/ClientWaitlistModal';
import type { MockBusiness, ServiceCategory } from './types';
import { CheckCircle2, BookmarkCheck, CalendarCheck, Sparkles } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // Client view state: category selection & sub-tabs
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [clientTab, setClientTab] = useState<'search' | 'bookings'>('search');

  // Modal states
  const [bookingBusiness, setBookingBusiness] = useState<MockBusiness | null>(null);
  const [waitlistBusiness, setWaitlistBusiness] = useState<MockBusiness | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  if (!isAuthenticated || !user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header />

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2.5 border border-slate-700 text-xs font-medium"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1">
        {user.role === 'business' ? (
          /* BUSINESS VIEW */
          <motion.div
            key="business"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <BusinessDashboard />
          </motion.div>
        ) : (
          /* CLIENT VIEW */
          <motion.div
            key="client"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Client Tab Switcher */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                <button
                  onClick={() => setClientTab('search')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    clientTab === 'search'
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Discover Services
                </button>
                <button
                  onClick={() => setClientTab('bookings')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    clientTab === 'bookings'
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  My Appointments & Queue
                </button>
              </div>
            </div>

            {clientTab === 'bookings' ? (
              <ClientBookingsView onBackToSearch={() => setClientTab('search')} />
            ) : !selectedCategory ? (
              <ClientOnboarding onSelectCategory={(cat) => setSelectedCategory(cat)} />
            ) : (
              <ClientSearch
                category={selectedCategory}
                onChangeCategory={() => setSelectedCategory(null)}
                onOpenBooking={(biz) => setBookingBusiness(biz)}
                onOpenWaitlist={(biz) => setWaitlistBusiness(biz)}
              />
            )}
          </motion.div>
        )}
      </main>

      {/* Booking Modal */}
      {bookingBusiness && (
        <BookingModal
          business={bookingBusiness}
          onClose={() => setBookingBusiness(null)}
          onSuccess={(slotTime, serviceName) => {
            showToast(`Appointment confirmed for ${serviceName} at ${slotTime}!`);
          }}
        />
      )}

      {/* Waitlist Modal */}
      {waitlistBusiness && (
        <ClientWaitlistModal
          business={waitlistBusiness}
          onClose={() => setWaitlistBusiness(null)}
          onSuccess={(position, serviceName) => {
            showToast(`Joined waitlist (#${position} in line) for ${serviceName}!`);
          }}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <DemoDataProvider>
        <MainAppContent />
      </DemoDataProvider>
    </AuthProvider>
  );
}

export default App;
