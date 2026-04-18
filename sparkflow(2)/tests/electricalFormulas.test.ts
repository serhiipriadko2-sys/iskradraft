import { describe, expect, it } from 'vitest';
import {
  calculateConduitFill,
  calculateNeutralCurrent,
  calculateShortCircuitCurrent,
  calculateVoltageDrop,
  checkBreakerTrip,
} from '../utils/electricalFormulas';

describe('electricalFormulas', () => {
  it('returns zero voltage drop for invalid values', () => {
    expect(calculateVoltageDrop(0, 3.5)).toBe(0);
    expect(calculateVoltageDrop(10, 0)).toBe(0);
  });

  it('calculates voltage drop for a standard socket line', () => {
    expect(calculateVoltageDrop(10, 3.5, 230, 2.5)).toBeCloseTo(0.93, 2);
  });

  it('calculates short-circuit current with the built-in source impedance margin', () => {
    expect(calculateShortCircuitCurrent(10, 2.5, 230)).toBe(522);
  });

  it('evaluates breaker trip windows by curve type', () => {
    expect(checkBreakerTrip(100, 'C16')).toEqual({
      willTrip: false,
      minTripCurrent: 160,
    });
    expect(checkBreakerTrip(85, 'B16')).toEqual({
      willTrip: true,
      minTripCurrent: 80,
    });
  });

  it('keeps neutral current at zero for a balanced three-phase load', () => {
    expect(calculateNeutralCurrent(12, 12, 12)).toBe(0);
  });

  it('selects a conduit size that stays below the fill factor limit', () => {
    const result = calculateConduitFill([{ section: 2.5, count: 2 }]);
    expect(result.recommendedSize).toBe(32);
    expect(result.fillRatio).toBeLessThanOrEqual(0.4);
  });
});
