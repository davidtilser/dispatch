import { describe, it, expect } from 'vitest';
import { distanceMiles } from './haversine.js';

describe('distanceMiles', () => {
  it('matches the well-known Nashville-LAX haversine reference distance within 1%', () => {
    // This exact pair/result (2887.26 km great-circle) is the worked
    // example on Wikipedia's "Haversine formula" article — a standard
    // reference for checking a haversine implementation.
    const nashville = { lat: 36.12, lng: -86.67 };
    const lax = { lat: 33.94, lng: -118.4 };
    const expectedMiles = 2887.26 / 1.609344; // km -> mi

    const actual = distanceMiles(nashville.lat, nashville.lng, lax.lat, lax.lng);

    expect(Math.abs(actual - expectedMiles) / expectedMiles).toBeLessThan(0.01);
  });

  it('is zero for the same point', () => {
    expect(distanceMiles(37.5485, -121.9886, 37.5485, -121.9886)).toBeCloseTo(0, 9);
  });

  it('is symmetric', () => {
    const a = distanceMiles(37.5, -122, 37.8, -122.3);
    const b = distanceMiles(37.8, -122.3, 37.5, -122);
    expect(a).toBeCloseTo(b, 9);
  });

  it('roughly matches a known short distance (SF to Oakland, ~8 miles)', () => {
    const sf = { lat: 37.7749, lng: -122.4194 };
    const oakland = { lat: 37.8044, lng: -122.2712 };
    const actual = distanceMiles(sf.lat, sf.lng, oakland.lat, oakland.lng);
    expect(actual).toBeGreaterThan(6);
    expect(actual).toBeLessThan(10);
  });
});
