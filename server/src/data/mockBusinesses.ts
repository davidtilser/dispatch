/**
 * server/src/data/mockBusinesses.ts
 *
 * ~24 fake businesses (3 per category x 8 categories) seeded around
 * DEMO_CENTER (Fremont, CA) for the mock provider. All names, addresses,
 * and phone numbers are fake — phones use the reserved 555-01xx range.
 *
 * Coordinates are computed as a (miles-north, miles-east) offset from
 * DEMO_CENTER so every business's real-world distance is easy to reason
 * about and stays within ~15 miles.
 */

import { DEMO_CENTER } from '@getitdone/shared';
import type { Business } from '@getitdone/shared/types.js';

const MILES_PER_DEGREE_LAT = 69.0;

function milesPerDegreeLng(atLat: number): number {
  return MILES_PER_DEGREE_LAT * Math.cos((atLat * Math.PI) / 180);
}

/** Offset from DEMO_CENTER by (dNorthMiles, dEastMiles). Negative = south/west. */
function offset(dNorthMiles: number, dEastMiles: number): { lat: number; lng: number } {
  return {
    lat: DEMO_CENTER.lat + dNorthMiles / MILES_PER_DEGREE_LAT,
    lng: DEMO_CENTER.lng + dEastMiles / milesPerDegreeLng(DEMO_CENTER.lat),
  };
}

const WEEKDAYS_9_6 = {
  mon: { open: '09:00', close: '18:00' },
  tue: { open: '09:00', close: '18:00' },
  wed: { open: '09:00', close: '18:00' },
  thu: { open: '09:00', close: '18:00' },
  fri: { open: '09:00', close: '18:00' },
};

// ─── The one deliberately-narrow-hours business used for DEMO_SLOT ───────────
//
// Open exactly 15:00-15:30 every day — its ONLY possible appointment slot,
// any day, is the 3:00pm slot server/src/data/seed.ts double-books for the
// waitlist demo. That makes this business genuinely, trivially fully
// booked once seeded, regardless of which calendar day "next 3pm" lands
// on when the server starts.
export const DEMO_SLOT_BUSINESS_ID = 'biz_barber_3';
export const DEMO_SLOT_SERVICE_ID = 'svc_quick_trim';
export const DEMO_SLOT_RESOURCE_IDS = ['res_barber3_chair_a', 'res_barber3_chair_b'] as const;

export const MOCK_BUSINESSES: Business[] = [
  // ─── barber ──────────────────────────────────────────────────────────────
  {
    id: 'biz_barber_1',
    name: 'Fade Factory Barber Co.',
    category: 'barber',
    description: 'Neighborhood barbershop specializing in fades and classic cuts.',
    address: '101 Fremont Blvd, Fremont, CA',
    ...offset(0.8, 0.3),
    phone: '555-0101',
    priceLevel: 2,
    rating: 4.6,
    services: [
      { id: 'svc_classic_cut', name: 'Classic Haircut', durationMin: 30, priceCents: 2800 },
      { id: 'svc_skin_fade', name: 'Skin Fade', durationMin: 45, priceCents: 3500 },
      { id: 'svc_beard_trim', name: 'Beard Trim', durationMin: 15, priceCents: 1500 },
    ],
    hours: { tue: { open: '09:00', close: '18:00' }, wed: { open: '09:00', close: '18:00' }, thu: { open: '09:00', close: '18:00' }, fri: { open: '09:00', close: '18:00' }, sat: { open: '09:00', close: '17:00' } },
    resources: [{ id: 'res_b1_chair1', name: 'Chair 1' }, { id: 'res_b1_chair2', name: 'Chair 2' }],
  },
  {
    id: 'biz_barber_2',
    name: 'Old Town Clippers',
    category: 'barber',
    description: 'Traditional barbershop, walk-ins welcome.',
    address: '202 Niles Ave, Fremont, CA',
    ...offset(-2.0, 1.5),
    phone: '555-0102',
    priceLevel: 1,
    rating: 4.2,
    services: [
      { id: 'svc_buzz_cut', name: 'Buzz Cut', durationMin: 20, priceCents: 2000 },
      { id: 'svc_straight_razor', name: 'Straight Razor Shave', durationMin: 30, priceCents: 3000 },
    ],
    hours: { mon: { open: '08:00', close: '17:00' }, tue: { open: '08:00', close: '17:00' }, wed: { open: '08:00', close: '17:00' }, thu: { open: '08:00', close: '17:00' }, fri: { open: '08:00', close: '17:00' }, sat: { open: '08:00', close: '15:00' } },
    resources: [{ id: 'res_b2_chair1', name: 'Chair 1' }, { id: 'res_b2_chair2', name: 'Chair 2' }, { id: 'res_b2_chair3', name: 'Chair 3' }],
  },
  {
    id: DEMO_SLOT_BUSINESS_ID,
    name: "Priya's Express Cuts",
    category: 'barber',
    description: 'Quick 30-minute walk-in trims only, by design — a tiny express-only shop.',
    address: '303 Mowry Ave, Fremont, CA',
    ...offset(0.2, -0.4),
    phone: '555-0103',
    priceLevel: 1,
    rating: 4.8,
    services: [
      { id: DEMO_SLOT_SERVICE_ID, name: 'Quick Trim', durationMin: 30, priceCents: 1800 },
    ],
    // Deliberately narrow: open 3:00-3:30pm every day of the week — see
    // module comment above.
    hours: {
      mon: { open: '15:00', close: '15:30' },
      tue: { open: '15:00', close: '15:30' },
      wed: { open: '15:00', close: '15:30' },
      thu: { open: '15:00', close: '15:30' },
      fri: { open: '15:00', close: '15:30' },
      sat: { open: '15:00', close: '15:30' },
      sun: { open: '15:00', close: '15:30' },
    },
    resources: [
      { id: DEMO_SLOT_RESOURCE_IDS[0], name: 'Chair A' },
      { id: DEMO_SLOT_RESOURCE_IDS[1], name: 'Chair B' },
    ],
  },

  // ─── salon ───────────────────────────────────────────────────────────────
  {
    id: 'biz_salon_1',
    name: 'Luxe Hair Studio',
    category: 'salon',
    description: 'Upscale salon offering cuts, color, and balayage.',
    address: '15 Capitol Ave, Fremont, CA',
    ...offset(3.0, 2.0),
    phone: '555-0104',
    priceLevel: 3,
    rating: 4.7,
    services: [
      { id: 'svc_womens_cut', name: "Women's Cut & Style", durationMin: 45, priceCents: 5500 },
      { id: 'svc_balayage', name: 'Balayage', durationMin: 120, priceCents: 15000 },
      { id: 'svc_blowout', name: 'Blowout', durationMin: 30, priceCents: 4000 },
    ],
    hours: { tue: { open: '10:00', close: '19:00' }, wed: { open: '10:00', close: '19:00' }, thu: { open: '10:00', close: '19:00' }, fri: { open: '10:00', close: '19:00' }, sat: { open: '10:00', close: '18:00' }, sun: { open: '11:00', close: '16:00' } },
    resources: [{ id: 'res_s1_station1', name: 'Station 1' }, { id: 'res_s1_station2', name: 'Station 2' }, { id: 'res_s1_station3', name: 'Station 3' }],
  },
  {
    id: 'biz_salon_2',
    name: 'Bloom Beauty Bar',
    category: 'salon',
    description: 'Nail salon and beauty bar in the heart of Fremont.',
    address: '88 Washington Blvd, Fremont, CA',
    ...offset(-4.5, -1.0),
    phone: '555-0105',
    priceLevel: 2,
    rating: 4.3,
    services: [
      { id: 'svc_manicure', name: 'Manicure', durationMin: 30, priceCents: 2500 },
      { id: 'svc_pedicure', name: 'Pedicure', durationMin: 45, priceCents: 3500 },
      { id: 'svc_gel_polish', name: 'Gel Polish', durationMin: 20, priceCents: 2000 },
    ],
    hours: WEEKDAYS_9_6,
    resources: [{ id: 'res_s2_station1', name: 'Station 1' }, { id: 'res_s2_station2', name: 'Station 2' }],
  },
  {
    id: 'biz_salon_3',
    name: 'Chic Cuts Salon',
    category: 'salon',
    description: 'Full-service hair salon: cuts, color, and styling.',
    address: '400 Paseo Padre Pkwy, Fremont, CA',
    ...offset(5.5, -3.0),
    phone: '555-0106',
    priceLevel: 2,
    rating: 4.0,
    services: [
      { id: 'svc_cut_style', name: 'Haircut & Style', durationMin: 40, priceCents: 4500 },
      { id: 'svc_hair_color', name: 'Hair Color', durationMin: 90, priceCents: 9000 },
    ],
    hours: { wed: { open: '10:00', close: '18:00' }, thu: { open: '10:00', close: '18:00' }, fri: { open: '10:00', close: '18:00' }, sat: { open: '10:00', close: '18:00' }, sun: { open: '10:00', close: '16:00' } },
    resources: [{ id: 'res_s3_station1', name: 'Station 1' }, { id: 'res_s3_station2', name: 'Station 2' }, { id: 'res_s3_station3', name: 'Station 3' }],
  },

  // ─── spa ─────────────────────────────────────────────────────────────────
  {
    id: 'biz_spa_1',
    name: 'Serenity Day Spa',
    category: 'spa',
    description: 'Full-service day spa: massage, facials, and relaxation packages.',
    address: '12 Fremont Hub, Fremont, CA',
    ...offset(-1.0, 4.0),
    phone: '555-0107',
    priceLevel: 3,
    rating: 4.9,
    services: [
      { id: 'svc_swedish_massage', name: 'Swedish Massage', durationMin: 60, priceCents: 9000 },
      { id: 'svc_deep_tissue', name: 'Deep Tissue Massage', durationMin: 60, priceCents: 11000 },
      { id: 'svc_facial', name: 'Facial', durationMin: 45, priceCents: 8000 },
    ],
    hours: { mon: { open: '09:00', close: '20:00' }, tue: { open: '09:00', close: '20:00' }, wed: { open: '09:00', close: '20:00' }, thu: { open: '09:00', close: '20:00' }, fri: { open: '09:00', close: '20:00' }, sat: { open: '09:00', close: '20:00' }, sun: { open: '09:00', close: '18:00' } },
    resources: [{ id: 'res_sp1_room1', name: 'Room 1' }, { id: 'res_sp1_room2', name: 'Room 2' }],
  },
  {
    id: 'biz_spa_2',
    name: 'Zen Wellness Spa',
    category: 'spa',
    description: 'Wellness-focused spa offering hot stone and aromatherapy treatments.',
    address: '77 Blacow Rd, Fremont, CA',
    ...offset(6.0, 4.5),
    phone: '555-0108',
    priceLevel: 3,
    rating: 4.5,
    services: [
      { id: 'svc_hot_stone', name: 'Hot Stone Massage', durationMin: 75, priceCents: 12000 },
      { id: 'svc_aromatherapy_facial', name: 'Aromatherapy Facial', durationMin: 45, priceCents: 7000 },
    ],
    hours: { mon: { open: '10:00', close: '19:00' }, tue: { open: '10:00', close: '19:00' }, wed: { open: '10:00', close: '19:00' }, thu: { open: '10:00', close: '19:00' }, fri: { open: '10:00', close: '19:00' }, sat: { open: '10:00', close: '19:00' } },
    resources: [{ id: 'res_sp2_room1', name: 'Room 1' }, { id: 'res_sp2_room2', name: 'Room 2' }, { id: 'res_sp2_room3', name: 'Room 3' }],
  },
  {
    id: 'biz_spa_3',
    name: 'Calm Waters Spa',
    category: 'spa',
    description: 'Cozy neighborhood spa, express facials and massage.',
    address: '9 Grimmer Blvd, Fremont, CA',
    ...offset(-6.5, 2.0),
    phone: '555-0109',
    priceLevel: 2,
    rating: 4.1,
    services: [
      { id: 'svc_express_facial', name: 'Express Facial', durationMin: 30, priceCents: 5000 },
      { id: 'svc_massage_60', name: 'Massage', durationMin: 60, priceCents: 8500 },
    ],
    hours: { tue: { open: '09:00', close: '17:00' }, wed: { open: '09:00', close: '17:00' }, thu: { open: '09:00', close: '17:00' }, fri: { open: '09:00', close: '17:00' }, sat: { open: '09:00', close: '17:00' }, sun: { open: '10:00', close: '15:00' } },
    resources: [{ id: 'res_sp3_room1', name: 'Room 1' }, { id: 'res_sp3_room2', name: 'Room 2' }],
  },

  // ─── electrician ─────────────────────────────────────────────────────────
  {
    id: 'biz_electrician_1',
    name: 'BrightSpark Electric',
    category: 'electrician',
    description: 'Licensed residential and commercial electricians.',
    address: '55 Osgood Rd, Fremont, CA',
    ...offset(7.0, -5.0),
    phone: '555-0110',
    priceLevel: 2,
    rating: 4.6,
    services: [
      { id: 'svc_panel_upgrade', name: 'Panel Upgrade', durationMin: 180, priceCents: 45000 },
      { id: 'svc_outlet_install', name: 'Outlet Installation', durationMin: 60, priceCents: 12000 },
      { id: 'svc_wiring_inspection', name: 'Wiring Inspection', durationMin: 45, priceCents: 9000 },
    ],
    hours: WEEKDAYS_9_6,
    resources: [{ id: 'res_e1_tech1', name: 'Tech 1' }, { id: 'res_e1_tech2', name: 'Tech 2' }],
  },
  {
    id: 'biz_electrician_2',
    name: 'Fremont Electrical Pros',
    category: 'electrician',
    description: 'Same-day electrical repairs and installations.',
    address: '620 Peralta Blvd, Fremont, CA',
    ...offset(-3.0, -6.0),
    phone: '555-0111',
    priceLevel: 2,
    rating: 4.4,
    services: [
      { id: 'svc_breaker_repair', name: 'Circuit Breaker Repair', durationMin: 60, priceCents: 15000 },
      { id: 'svc_fan_install', name: 'Ceiling Fan Install', durationMin: 60, priceCents: 13000 },
    ],
    hours: { mon: { open: '07:00', close: '18:00' }, tue: { open: '07:00', close: '18:00' }, wed: { open: '07:00', close: '18:00' }, thu: { open: '07:00', close: '18:00' }, fri: { open: '07:00', close: '18:00' }, sat: { open: '08:00', close: '14:00' } },
    resources: [{ id: 'res_e2_tech1', name: 'Tech 1' }, { id: 'res_e2_tech2', name: 'Tech 2' }, { id: 'res_e2_tech3', name: 'Tech 3' }],
  },
  {
    id: 'biz_electrician_3',
    name: 'Volt Masters',
    category: 'electrician',
    description: 'EV charger installs and full home rewiring.',
    address: '901 Auto Mall Pkwy, Fremont, CA',
    ...offset(8.5, 1.0),
    phone: '555-0112',
    priceLevel: 3,
    rating: 4.8,
    services: [
      { id: 'svc_ev_charger', name: 'EV Charger Install', durationMin: 120, priceCents: 40000 },
      { id: 'svc_rewiring', name: 'Whole-Home Rewiring', durationMin: 240, priceCents: 60000 },
    ],
    hours: { mon: { open: '08:00', close: '16:00' }, tue: { open: '08:00', close: '16:00' }, wed: { open: '08:00', close: '16:00' }, thu: { open: '08:00', close: '16:00' }, fri: { open: '08:00', close: '16:00' } },
    resources: [{ id: 'res_e3_tech1', name: 'Tech 1' }, { id: 'res_e3_tech2', name: 'Tech 2' }],
  },

  // ─── plumber ─────────────────────────────────────────────────────────────
  {
    id: 'biz_plumber_1',
    name: 'QuickFlow Plumbing',
    category: 'plumber',
    description: '24/7 emergency plumbing and drain service.',
    address: '33 Fremont Ave, Fremont, CA',
    ...offset(-8.0, 3.0),
    phone: '555-0113',
    priceLevel: 2,
    rating: 4.5,
    services: [
      { id: 'svc_drain_cleaning', name: 'Drain Cleaning', durationMin: 60, priceCents: 11000 },
      { id: 'svc_leak_repair', name: 'Leak Repair', durationMin: 45, priceCents: 9500 },
      { id: 'svc_water_heater_install', name: 'Water Heater Install', durationMin: 180, priceCents: 80000 },
    ],
    hours: { mon: { open: '07:00', close: '19:00' }, tue: { open: '07:00', close: '19:00' }, wed: { open: '07:00', close: '19:00' }, thu: { open: '07:00', close: '19:00' }, fri: { open: '07:00', close: '19:00' }, sat: { open: '08:00', close: '16:00' } },
    resources: [{ id: 'res_p1_tech1', name: 'Tech 1' }, { id: 'res_p1_tech2', name: 'Tech 2' }],
  },
  {
    id: 'biz_plumber_2',
    name: 'East Bay Pipe Pros',
    category: 'plumber',
    description: 'Residential plumbing repair and pipe replacement.',
    address: '741 Decoto Rd, Union City, CA',
    ...offset(2.0, 8.5),
    phone: '555-0114',
    priceLevel: 2,
    rating: 4.3,
    services: [
      { id: 'svc_clogged_drain', name: 'Clogged Drain', durationMin: 45, priceCents: 10000 },
      { id: 'svc_pipe_repair', name: 'Pipe Repair', durationMin: 60, priceCents: 13000 },
    ],
    hours: { mon: { open: '08:00', close: '18:00' }, tue: { open: '08:00', close: '18:00' }, wed: { open: '08:00', close: '18:00' }, thu: { open: '08:00', close: '18:00' }, fri: { open: '08:00', close: '18:00' }, sat: { open: '08:00', close: '18:00' }, sun: { open: '08:00', close: '18:00' } },
    resources: [{ id: 'res_p2_tech1', name: 'Tech 1' }, { id: 'res_p2_tech2', name: 'Tech 2' }, { id: 'res_p2_tech3', name: 'Tech 3' }],
  },
  {
    id: 'biz_plumber_3',
    name: 'Reliable Rooter',
    category: 'plumber',
    description: 'Budget-friendly plumbing repairs.',
    address: '250 H St, Union City, CA',
    ...offset(-9.0, -4.0),
    phone: '555-0115',
    priceLevel: 1,
    rating: 3.9,
    services: [
      { id: 'svc_emergency_leak', name: 'Emergency Leak Repair', durationMin: 60, priceCents: 15000 },
      { id: 'svc_water_heater_service', name: 'Water Heater Service', durationMin: 90, priceCents: 20000 },
    ],
    hours: { mon: { open: '08:00', close: '17:00' }, tue: { open: '08:00', close: '17:00' }, wed: { open: '08:00', close: '17:00' }, thu: { open: '08:00', close: '17:00' }, fri: { open: '08:00', close: '17:00' } },
    resources: [{ id: 'res_p3_tech1', name: 'Tech 1' }, { id: 'res_p3_tech2', name: 'Tech 2' }],
  },

  // ─── hvac ────────────────────────────────────────────────────────────────
  {
    id: 'biz_hvac_1',
    name: 'CoolBreeze HVAC',
    category: 'hvac',
    description: 'Heating and air conditioning repair and installation.',
    address: '18 Mission Blvd, Hayward, CA',
    ...offset(9.5, -6.0),
    phone: '555-0116',
    priceLevel: 2,
    rating: 4.4,
    services: [
      { id: 'svc_ac_repair', name: 'AC Repair', durationMin: 60, priceCents: 14000 },
      { id: 'svc_furnace_repair', name: 'Furnace Repair', durationMin: 60, priceCents: 16000 },
      { id: 'svc_duct_cleaning', name: 'Duct Cleaning', durationMin: 90, priceCents: 20000 },
    ],
    hours: WEEKDAYS_9_6,
    resources: [{ id: 'res_h1_tech1', name: 'Tech 1' }, { id: 'res_h1_tech2', name: 'Tech 2' }],
  },
  {
    id: 'biz_hvac_2',
    name: 'Bay Area Heating & Air',
    category: 'hvac',
    description: 'Full-service HVAC contractor serving the Tri-City area.',
    address: '505 A St, Hayward, CA',
    ...offset(-10.0, 5.0),
    phone: '555-0117',
    priceLevel: 2,
    rating: 4.6,
    services: [
      { id: 'svc_thermostat_install', name: 'Thermostat Install', durationMin: 30, priceCents: 9000 },
      { id: 'svc_ac_tuneup', name: 'AC Tune-up', durationMin: 45, priceCents: 12000 },
    ],
    hours: { mon: { open: '07:00', close: '18:00' }, tue: { open: '07:00', close: '18:00' }, wed: { open: '07:00', close: '18:00' }, thu: { open: '07:00', close: '18:00' }, fri: { open: '07:00', close: '18:00' }, sat: { open: '08:00', close: '15:00' } },
    resources: [{ id: 'res_h2_tech1', name: 'Tech 1' }, { id: 'res_h2_tech2', name: 'Tech 2' }, { id: 'res_h2_tech3', name: 'Tech 3' }],
  },
  {
    id: 'biz_hvac_3',
    name: 'Sunrise Air Systems',
    category: 'hvac',
    description: 'Furnace and AC installation specialists.',
    address: '900 B St, Hayward, CA',
    ...offset(10.5, 6.0),
    phone: '555-0118',
    priceLevel: 3,
    rating: 4.2,
    services: [
      { id: 'svc_furnace_install', name: 'Furnace Install', durationMin: 240, priceCents: 120000 },
      { id: 'svc_ac_repair_2', name: 'AC Repair', durationMin: 60, priceCents: 15000 },
    ],
    hours: { mon: { open: '08:00', close: '16:00' }, tue: { open: '08:00', close: '16:00' }, wed: { open: '08:00', close: '16:00' }, thu: { open: '08:00', close: '16:00' }, fri: { open: '08:00', close: '16:00' } },
    resources: [{ id: 'res_h3_tech1', name: 'Tech 1' }, { id: 'res_h3_tech2', name: 'Tech 2' }],
  },

  // ─── cleaning ────────────────────────────────────────────────────────────
  {
    id: 'biz_cleaning_1',
    name: 'SparkleClean Home Services',
    category: 'cleaning',
    description: 'Residential house cleaning, standard and deep clean packages.',
    address: '210 Thornton Ave, Fremont, CA',
    ...offset(-11.0, -3.0),
    phone: '555-0119',
    priceLevel: 2,
    rating: 4.5,
    services: [
      { id: 'svc_standard_clean', name: 'Standard House Cleaning', durationMin: 120, priceCents: 12000 },
      { id: 'svc_deep_clean', name: 'Deep Clean', durationMin: 180, priceCents: 20000 },
    ],
    hours: { mon: { open: '08:00', close: '17:00' }, tue: { open: '08:00', close: '17:00' }, wed: { open: '08:00', close: '17:00' }, thu: { open: '08:00', close: '17:00' }, fri: { open: '08:00', close: '17:00' }, sat: { open: '09:00', close: '15:00' } },
    resources: [{ id: 'res_c1_team1', name: 'Team 1' }, { id: 'res_c1_team2', name: 'Team 2' }],
  },
  {
    id: 'biz_cleaning_2',
    name: 'Fremont Fresh Cleaners',
    category: 'cleaning',
    description: 'Move-in/move-out and standard home cleaning.',
    address: '380 Argonaut Way, Fremont, CA',
    ...offset(11.5, 3.0),
    phone: '555-0120',
    priceLevel: 1,
    rating: 4.1,
    services: [
      { id: 'svc_moveout_clean', name: 'Move-out Cleaning', durationMin: 180, priceCents: 25000 },
      { id: 'svc_standard_clean_2', name: 'Standard Clean', durationMin: 90, priceCents: 10000 },
    ],
    hours: WEEKDAYS_9_6,
    resources: [{ id: 'res_c2_team1', name: 'Team 1' }, { id: 'res_c2_team2', name: 'Team 2' }, { id: 'res_c2_team3', name: 'Team 3' }],
  },
  {
    id: 'biz_cleaning_3',
    name: 'TidyUp Housekeeping',
    category: 'cleaning',
    description: 'Recurring housekeeping and deep cleaning services.',
    address: '55 Walnut Ave, Fremont, CA',
    ...offset(-4.0, 11.0),
    phone: '555-0121',
    priceLevel: 2,
    rating: 4.7,
    services: [
      { id: 'svc_weekly_clean', name: 'Weekly Cleaning', durationMin: 90, priceCents: 9000 },
      { id: 'svc_deep_clean_2', name: 'Deep Clean', durationMin: 150, priceCents: 18000 },
    ],
    hours: { tue: { open: '09:00', close: '17:00' }, wed: { open: '09:00', close: '17:00' }, thu: { open: '09:00', close: '17:00' }, fri: { open: '09:00', close: '17:00' }, sat: { open: '09:00', close: '17:00' } },
    resources: [{ id: 'res_c3_team1', name: 'Team 1' }, { id: 'res_c3_team2', name: 'Team 2' }],
  },

  // ─── auto_repair ─────────────────────────────────────────────────────────
  {
    id: 'biz_auto_1',
    name: 'Precision Auto Repair',
    category: 'auto_repair',
    description: 'Full-service auto shop: oil changes, brakes, tires.',
    address: '4200 Bay St, Fremont, CA',
    ...offset(12.0, -5.0),
    phone: '555-0122',
    priceLevel: 2,
    rating: 4.3,
    services: [
      { id: 'svc_oil_change', name: 'Oil Change', durationMin: 30, priceCents: 6000 },
      { id: 'svc_brake_service', name: 'Brake Service', durationMin: 60, priceCents: 18000 },
      { id: 'svc_tire_rotation', name: 'Tire Rotation', durationMin: 30, priceCents: 4000 },
    ],
    hours: { mon: { open: '08:00', close: '18:00' }, tue: { open: '08:00', close: '18:00' }, wed: { open: '08:00', close: '18:00' }, thu: { open: '08:00', close: '18:00' }, fri: { open: '08:00', close: '18:00' }, sat: { open: '08:00', close: '16:00' } },
    resources: [{ id: 'res_a1_bay1', name: 'Bay 1' }, { id: 'res_a1_bay2', name: 'Bay 2' }],
  },
  {
    id: 'biz_auto_2',
    name: 'Fremont Motor Works',
    category: 'auto_repair',
    description: 'Transmission and brake specialists.',
    address: '5500 Stevenson Blvd, Fremont, CA',
    ...offset(-12.5, 4.0),
    phone: '555-0123',
    priceLevel: 2,
    rating: 4.0,
    services: [
      { id: 'svc_transmission', name: 'Transmission Service', durationMin: 180, priceCents: 40000 },
      { id: 'svc_brake_repair', name: 'Brake Repair', durationMin: 90, priceCents: 20000 },
    ],
    hours: { mon: { open: '07:00', close: '17:00' }, tue: { open: '07:00', close: '17:00' }, wed: { open: '07:00', close: '17:00' }, thu: { open: '07:00', close: '17:00' }, fri: { open: '07:00', close: '17:00' } },
    resources: [{ id: 'res_a2_bay1', name: 'Bay 1' }, { id: 'res_a2_bay2', name: 'Bay 2' }, { id: 'res_a2_bay3', name: 'Bay 3' }],
  },
  {
    id: 'biz_auto_3',
    name: 'Bay Auto Care',
    category: 'auto_repair',
    description: 'Quick, affordable oil changes and tire repair.',
    address: '6100 Fremont Blvd, Fremont, CA',
    ...offset(13.0, 6.0),
    phone: '555-0124',
    priceLevel: 1,
    rating: 4.4,
    services: [
      { id: 'svc_oil_change_2', name: 'Oil Change', durationMin: 30, priceCents: 5500 },
      { id: 'svc_tire_repair', name: 'Tire Repair', durationMin: 30, priceCents: 3500 },
    ],
    hours: { mon: { open: '08:00', close: '17:00' }, tue: { open: '08:00', close: '17:00' }, wed: { open: '08:00', close: '17:00' }, thu: { open: '08:00', close: '17:00' }, fri: { open: '08:00', close: '17:00' }, sat: { open: '08:00', close: '17:00' } },
    resources: [{ id: 'res_a3_bay1', name: 'Bay 1' }, { id: 'res_a3_bay2', name: 'Bay 2' }],
  },
];
