export type UserRole = 'client' | 'business';

export type ServiceCategory =
  | 'barber'
  | 'salon'
  | 'spa'
  | 'massage'
  | 'plumber'
  | 'electrician'
  | 'hvac'
  | 'cleaning'
  | 'auto_repair';

export interface CategoryInfo {
  id: ServiceCategory;
  name: string;
  iconName: string;
  description: string;
  popularServices: string[];
}

export type PriceLevel = 1 | 2 | 3;

export interface BusinessService {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
}

export interface MockBusiness {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  address: string;
  phone: string;
  distanceMiles: number;
  rating: number;
  reviewCount: number;
  priceLevel: PriceLevel;
  isOpenNow: boolean;
  hasOpeningsToday: boolean;
  services: BusinessService[];
  availableSlots: string[];
  image: string;
}

export interface Booking {
  id: string;
  businessId: string;
  businessName: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  startTime: string; // ISO or formatted
  endTime: string;
  status: 'confirmed' | 'cancelled';
  priceCents: number;
  feeCents?: number;
  feeStatus?: 'none' | 'pending' | 'waived';
}

export interface WaitlistEntry {
  id: string;
  businessId: string;
  businessName: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  requestedWindow: string;
  position: number;
  status: 'waiting' | 'calling' | 'accepted' | 'declined';
  addedAt: string;
}

export interface VoiceCallState {
  isActive: boolean;
  callAttemptId: string;
  targetCandidate?: WaitlistEntry;
  businessName: string;
  slotTime: string;
  serviceName: string;
  status: 'dialing' | 'ringing' | 'connected' | 'speaking' | 'accepted' | 'declined' | 'completed';
  isMuted: boolean;
  secondsRemaining: number;
  transcript: string;
}

export interface SearchFilters {
  maxDistanceMiles: number;
  priceLevels: PriceLevel[];
  minRating: number;
  openNowOnly: boolean;
  openingsTodayOnly: boolean;
  selectedSubServices: string[];
}
