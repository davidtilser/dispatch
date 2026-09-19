import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Booking, WaitlistEntry, VoiceCallState, MockBusiness } from '../types';
import { INITIAL_BUSINESS_BOOKINGS, INITIAL_WAITLIST, MOCK_BUSINESSES } from '../data/mockData';

interface DemoDataContextType {
  businesses: MockBusiness[];
  bookings: Booking[];
  clientBookings: Booking[];
  waitlist: WaitlistEntry[];
  voiceCall: VoiceCallState;
  bookSlot: (business: MockBusiness, serviceId: string, slotTime: string, clientName?: string, clientPhone?: string) => { success: boolean; error?: string };
  joinWaitlist: (businessId: string, serviceName: string, requestedWindow: string, clientName?: string, clientPhone?: string) => { success: boolean; position: number };
  cancelBooking: (bookingId: string) => { success: boolean; startedCall: boolean };
  acceptVoiceOffer: () => void;
  declineVoiceOffer: () => void;
  endVoiceCall: () => void;
  resetDemo: () => void;
  isSlotTaken: (businessId: string, slotTime: string) => boolean;
}

const DemoDataContext = createContext<DemoDataContextType | undefined>(undefined);

export const DemoDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businesses] = useState<MockBusiness[]>(MOCK_BUSINESSES);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BUSINESS_BOOKINGS);
  const [clientBookings, setClientBookings] = useState<Booking[]>([
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
  ]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(INITIAL_WAITLIST);

  const [voiceCall, setVoiceCall] = useState<VoiceCallState>({
    isActive: false,
    callAttemptId: '',
    businessName: '',
    slotTime: '',
    serviceName: '',
    status: 'completed',
    isMuted: false,
    secondsRemaining: 30,
    transcript: '',
  });

  // Handle countdown timer when voice call is active
  useEffect(() => {
    let timer: any;
    if (voiceCall.isActive && voiceCall.secondsRemaining > 0 && voiceCall.status !== 'accepted' && voiceCall.status !== 'declined') {
      timer = setInterval(() => {
        setVoiceCall((prev) => {
          if (prev.secondsRemaining <= 1) {
            // Auto timeout -> decline and advance
            return {
              ...prev,
              secondsRemaining: 0,
              status: 'declined',
              transcript: 'Call timed out (no answer). Advancing to next candidate on the waitlist...',
            };
          }
          return { ...prev, secondsRemaining: prev.secondsRemaining - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [voiceCall.isActive, voiceCall.secondsRemaining, voiceCall.status]);

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
      endTime: 'Approx 45m',
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

  // Business cancels a booking -> initiates waitlist call
  const cancelBooking = (bookingId: string) => {
    let targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking) return { success: false, startedCall: false };

    // Update booking to cancelled with $15 pending fee
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: 'cancelled', feeCents: 1500, feeStatus: 'pending' }
          : b
      )
    );

    // Look for top waitlist candidate for this business
    const availableWaiters = waitlist.filter(
      (w) => w.businessId === targetBooking?.businessId && w.status === 'waiting'
    );

    const topCandidate = availableWaiters[0];
    if (topCandidate) {
      // Mark candidate as calling
      setWaitlist((prev) =>
        prev.map((w) => (w.id === topCandidate.id ? { ...w, status: 'calling' } : w))
      );

      // Start ElevenLabs voice call experience
      setVoiceCall({
        isActive: true,
        callAttemptId: `call_${Date.now()}`,
        targetCandidate: topCandidate,
        businessName: targetBooking.businessName,
        slotTime: targetBooking.startTime,
        serviceName: targetBooking.serviceName,
        status: 'speaking',
        isMuted: false,
        secondsRemaining: 28,
        transcript: `“Hi ${topCandidate.clientName}, this is Dispatch calling for ${targetBooking.businessName}. A ${targetBooking.serviceName} spot just opened at ${targetBooking.startTime}. Would you like to take this spot?”`,
      });

      return { success: true, startedCall: true };
    }

    return { success: true, startedCall: false };
  };

  // When candidate accepts the voice call offer
  const acceptVoiceOffer = () => {
    if (!voiceCall.targetCandidate) return;

    const candidate = voiceCall.targetCandidate;
    const slotTime = voiceCall.slotTime;

    // Check double booking again just in case
    const isConflict = bookings.some(
      (b) => b.businessId === candidate.businessId && b.startTime === slotTime && b.status === 'confirmed'
    );

    if (isConflict) {
      setVoiceCall((prev) => ({
        ...prev,
        status: 'declined',
        transcript: 'Double-booking collision detected! This slot has already been claimed.',
      }));
      return;
    }

    // 1. Create the replacement confirmed booking
    const replacementBooking: Booking = {
      id: `book_refill_${Date.now()}`,
      businessId: candidate.businessId,
      businessName: voiceCall.businessName,
      serviceId: 's1',
      serviceName: voiceCall.serviceName,
      clientName: candidate.clientName,
      clientPhone: candidate.clientPhone,
      startTime: slotTime,
      endTime: 'Approx 45m',
      status: 'confirmed',
      priceCents: 4500,
      feeStatus: 'none',
    };

    // 2. Waive the original customer's $15 cancellation fee!
    setBookings((prev) => [
      ...prev.map((b) =>
        b.businessId === candidate.businessId && b.status === 'cancelled' && b.feeStatus === 'pending'
          ? { ...b, feeStatus: 'waived' as const }
          : b
      ),
      replacementBooking,
    ]);

    // 3. Update candidate status in waitlist
    setWaitlist((prev) =>
      prev.map((w) => (w.id === candidate.id ? { ...w, status: 'accepted' as const } : w))
    );

    // 4. Update voice call status
    setVoiceCall((prev) => ({
      ...prev,
      status: 'accepted',
      transcript: `“Fantastic, ${candidate.clientName}! You are booked for ${slotTime}. Original cancellation fee waived.”`,
    }));
  };

  // Candidate declines voice offer -> call advances to next candidate
  const declineVoiceOffer = () => {
    if (!voiceCall.targetCandidate) return;
    const currentId = voiceCall.targetCandidate.id;

    // Mark current candidate declined
    setWaitlist((prev) =>
      prev.map((w) => (w.id === currentId ? { ...w, status: 'declined' as const } : w))
    );

    // Find next in line
    const remaining = waitlist.filter(
      (w) => w.businessId === voiceCall.targetCandidate?.businessId && w.status === 'waiting' && w.id !== currentId
    );

    const nextCandidate = remaining[0];
    if (nextCandidate) {
      setWaitlist((prev) =>
        prev.map((w) => (w.id === nextCandidate.id ? { ...w, status: 'calling' as const } : w))
      );

      setVoiceCall((prev) => ({
        ...prev,
        targetCandidate: nextCandidate,
        status: 'speaking',
        secondsRemaining: 30,
        transcript: `“Hi ${nextCandidate.clientName}, it's Dispatch calling for ${prev.businessName}. A ${prev.serviceName} opening is available at ${prev.slotTime}. Would you like it?”`,
      }));
    } else {
      setVoiceCall((prev) => ({
        ...prev,
        status: 'completed',
        transcript: 'Waitlist exhausted. No further candidates available for this slot.',
      }));
    }
  };

  const endVoiceCall = () => {
    setVoiceCall((prev) => ({ ...prev, isActive: false, status: 'completed' }));
  };

  const resetDemo = () => {
    setBookings(INITIAL_BUSINESS_BOOKINGS);
    setWaitlist(INITIAL_WAITLIST);
    setVoiceCall({
      isActive: false,
      callAttemptId: '',
      businessName: '',
      slotTime: '',
      serviceName: '',
      status: 'completed',
      isMuted: false,
      secondsRemaining: 30,
      transcript: '',
    });
  };

  return (
    <DemoDataContext.Provider
      value={{
        businesses,
        bookings,
        clientBookings,
        waitlist,
        voiceCall,
        bookSlot,
        joinWaitlist,
        cancelBooking,
        acceptVoiceOffer,
        declineVoiceOffer,
        endVoiceCall,
        resetDemo,
        isSlotTaken,
      }}
    >
      {children}
    </DemoDataContext.Provider>
  );
};

export const useDemoData = () => {
  const context = useContext(DemoDataContext);
  if (!context) throw new Error('useDemoData must be used within DemoDataProvider');
  return context;
};
