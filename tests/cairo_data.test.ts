import { describe, it, expect } from 'vitest';
import { CAIRO_LANDMARKS, CAIRO_ROAD_NETWORK, CAIRO_SPEED_BUMPS } from '../src/world/CairoWorldData';

describe('Cairo Geographic Road Network & Landmarks', () => {
  it('contains all required Cairo landmarks with Arabic and English names', () => {
    expect(CAIRO_LANDMARKS.length).toBeGreaterThanOrEqual(5);

    const tahrir = CAIRO_LANDMARKS.find((l) => l.name.includes('Tahrir'));
    expect(tahrir).toBeDefined();
    expect(tahrir?.nameArabic).toContain('التحرير');

    const octoberBridge = CAIRO_LANDMARKS.find((l) => l.name.includes('October'));
    expect(octoberBridge).toBeDefined();
    expect(octoberBridge?.nameArabic).toContain('أكتوبر');

    const corniche = CAIRO_LANDMARKS.find((l) => l.name.includes('Corniche'));
    expect(corniche).toBeDefined();
    expect(corniche?.nameArabic).toContain('كورنيش');
  });

  it('validates connected road topology and non-empty waypoints', () => {
    for (const road of CAIRO_ROAD_NETWORK) {
      expect(road.points.length).toBeGreaterThanOrEqual(2);
      expect(road.width).toBeGreaterThan(0);
      expect(road.speedLimit).toBeGreaterThan(0);

      // Verify valid coordinates
      for (const pt of road.points) {
        expect(pt.length).toBe(3);
        expect(Number.isFinite(pt[0])).toBe(true);
        expect(Number.isFinite(pt[1])).toBe(true);
        expect(Number.isFinite(pt[2])).toBe(true);
      }
    }
  });

  it('verifies 6th of October elevated bridge deck height is elevated above street level', () => {
    const bridge = CAIRO_ROAD_NETWORK.find((r) => r.id === 'october_bridge_main_deck');
    expect(bridge).toBeDefined();
    expect(bridge?.elevation).toBe(14);
    for (const pt of bridge!.points) {
      expect(pt[1]).toBe(14); // Exactly 14m above surface roads
    }
  });

  it('verifies speed bumps exist with valid widths and aggression flags', () => {
    expect(CAIRO_SPEED_BUMPS.length).toBeGreaterThanOrEqual(4);
    for (const bump of CAIRO_SPEED_BUMPS) {
      const [x, y, z, width, rotationY, isAggressive] = bump;
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      expect(Number.isFinite(z)).toBe(true);
      expect(width).toBeGreaterThanOrEqual(6);
      expect(typeof isAggressive).toBe('boolean');
    }
  });
});
