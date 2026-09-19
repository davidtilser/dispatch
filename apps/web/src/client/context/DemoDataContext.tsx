import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Booking, WaitlistEntry, MockBusiness } from '../types';
import { INITIAL_BUSINESS_BOOKINGS, INITIAL_WAITLIST, MOCK_BUSINESSES } from '../data/mockData';

interface DemoDataContextType {
  businesses: MockBusiness[];
  bookings: Booking[];
  clientBookings: Booking[];
  waitlist: WaitlistEntry[];
  bookSlot: (business: MockBusiness, serviceId: string, slotTime: string, clientName?: string, clientPhone?: string) => { success: boolean; error?: string };
  joinWaitlist: (businessId: string, serviceName: string, requestedWindow: string, clientName?: string, clientPhone?: string) => { success: boolean; position: number };
  resetDemo: () => void;
  isSlotTaken: (businessId: string, slotTime: string) => boolean;
}

const DemoDataContext = createContext<DemoDataContextType | undefined>(undefined);

const INITIAL_CLIENT_BOOKINGS: Booking[] = [
    {
      id: 'client_book_demo',
      businessId: 'biz_barber_1',
      businessName: 'Fade Factory Barber Co.',
      serviceId: 's1',
      serviceName: 'Fade Haircut',
      clientName: 'Demo Client',
      clientPhone: '555-0100',
      startTime: '5:00 PM',
      endTime: '5:45 PM',
      status: 'confirmed',
      priceCents: 4500,
    },
  ];

// Client-only sample data survives navigation to the shop demo in this tab.
const STORAGE_KEY = 'dispatch_client_demo';
function readDemo() {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as { bookings: Booking[]; clientBookings: Booking[]; waitlist: WaitlistEntry[] } : null;
  } catch { return null; }
}

export const DemoDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [saved] = useState(readDemo);
  const [businesses] = useState<MockBusiness[]>(MOCK_BUSINESSES);
  const [bookings, setBookings] = useState<Booking[]>(() => saved?.bookings ?? INITIAL_BUSINESS_BOOKINGS);
  const [clientBookings, setClientBookings] = useState<Booking[]>(() => saved?.clientBookings ?? INITIAL_CLIENT_BOOKINGS);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(() => saved?.waitlist ?? INITIAL_WAITLIST);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ bookings, clientBookings, waitlist }));
  }, [bookings, clientBookings, waitlist]);

  // Check if slot is taken (Double booking check for business)
  const isSlotTaken = (businessId: string, slotTime: string): boolean => {
    return bookings.some(
      (b) => b.businessId === businessId && b.startTime === slotTime && b.status === 'confirmed'
    );
  };

  // Client books an appointment with double-booking prevention
  const bookSlot = (
    business: MockBusiness,
    serviceId: string,
    slotTime: string,
    clientName = 'Demo Client',
    clientPhone = '555-0100'
  ) => {
    // 1. Check double booking at business
    const slotBusy = bookings.some(
      (b) => b.businessId === business.id && b.startTime === slotTime && b.status === 'confirmed'
    );
    if (slotBusy) {
      return {
        success: false,
        error: `Slot ${slotTime} at ${business.name} is already booked. Please choose another slot or join the waitlist.`,
      };
    }

    // 2. Check client conflict (client cannot be in two places at once)
    const clientConflict = clientBookings.some(
      (b) => b.startTime === slotTime && b.status === 'confirmed'
    );
    if (clientConflict) {
      return {
        success: false,
        error: `Conflict: You already have a confirmed appointment scheduled at ${slotTime}!`,
      };
    }

    const foundService = business.services.find((s) => s.id === serviceId);
    const service = foundService || business.services[0] || {
      id: 'default_svc',
      name: 'Standard Service',
      durationMin: 45,
      priceCents: 5000,
    };
    const newBooking: Booking = {
      id: `book_${Date.now()}`,
      businessId: business.id,
      businessName: business.name,
      serviceId: service.id,
      serviceName: service.name,
      clientName,
      clientPhone,
      startTime: slotTime,
      endTime: `${service.durationMin} min`,
      status: 'confirmed',
      priceCents: service.priceCents,
      feeStatus: 'none',
    };

    setBookings((prev) => [...prev, newBooking]);
    setClientBookings((prev) => [...prev, newBooking]);

    return { success: true };
  };

  // Client joins waitlist
  const joinWaitlist = (
    businessId: string,
    serviceName: string,
    requestedWindow: string,
    clientName = 'Demo Client',
    clientPhone = '555-0100'
  ) => {
    const business = businesses.find((b) => b.id === businessId);
    const existingInBiz = waitlist.filter((w) => w.businessId === businessId && w.status === 'waiting');
    const newPosition = existingInBiz.length + 1;

    const newEntry: WaitlistEntry = {
      createdByClient: true,
      id: `wait_${Date.now()}`,
      businessId,
      businessName: business?.name || 'Local SMB',
      clientName,
      clientPhone,
      serviceName,
      requestedWindow,
      position: newPosition,
      status: 'waiting',
      addedAt: 'Just now',
    };

    setWaitlist((prev) => [...prev, newEntry]);
    return { success: true, position: newPosition };
  };

  const resetDemo = () => {
    setBookings(INITIAL_BUSINESS_BOOKINGS);
    setWaitlist(INITIAL_WAITLIST);
    setClientBookings(INITIAL_CLIENT_BOOKINGS);
  };

  return <DemoDataContext.Provider value={{ businesses, bookings, clientBookings, waitlist,
    bookSlot, joinWaitlist, resetDemo, isSlotTaken }}>{children}</DemoDataContext.Provider>;
};

export const useDemoData = () => {
  const context = useContext(DemoDataContext);
  if (!context) throw new Error('useDemoData must be used within DemoDataProvider');
  return context;
};
