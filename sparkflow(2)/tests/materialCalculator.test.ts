import { describe, expect, it } from 'vitest';
import type { CableRun, PanelConfig, PlanElement, SpecificationItem } from '../types';
import { calculateMaterials } from '../utils/materialCalculator';

const getItem = (items: SpecificationItem[], id: string) => items.find(item => item.id === id);

describe('calculateMaterials', () => {
  it('builds a deterministic base specification for a small plan', () => {
    const panel: PanelConfig = {
      enclosureSize: 12,
      rows: [
        {
          id: 'row-1',
          modules: [
            {
              id: 'mod-1',
              type: 'breaker_1p',
              name: 'Socket Group',
              rating: '16A',
              width: 1,
            },
          ],
          busType: 'comb_3p',
        },
      ],
    };

    const elements: PlanElement[] = [
      { id: 'db-1', type: 'db', x: 5, y: 5, mountingHeight: 180, label: 'DB' },
      { id: 'socket-1', type: 'socket', x: 30, y: 30, mountingHeight: 30, label: 'Socket' },
      { id: 'switch-1', type: 'switch', x: 40, y: 30, mountingHeight: 90, label: 'Switch' },
      { id: 'light-1', type: 'light', x: 70, y: 30, mountingHeight: 270, label: 'Light' },
    ];

    const cables: CableRun[] = [
      { id: 'run-1', fromId: 'db-1', toId: 'socket-1', type: 'power', length: 10 },
      { id: 'run-2', fromId: 'db-1', toId: 'light-1', type: 'light', length: 8 },
    ];

    const items = calculateMaterials(panel, elements, cables, 'standard');

    expect(getItem(items, 'mat-cable-1.5')?.quantity).toBe(9);
    expect(getItem(items, 'mat-cable-2.5')?.quantity).toBe(11);
    expect(getItem(items, 'mat-acc-socket')?.quantity).toBe(1);
    expect(getItem(items, 'mat-acc-switch')?.quantity).toBe(1);
    expect(getItem(items, 'mat-cons-box')?.quantity).toBe(2);
    expect(getItem(items, 'mat-cons-clip')?.quantity).toBe(40);
    expect(getItem(items, 'mat-cons-gofr')?.quantity).toBe(20);
    expect(getItem(items, 'mat-pnl-box')?.quantity).toBe(1);
    expect(getItem(items, 'mat-mod-mod-1')?.estimatedPrice).toBe(450);
    expect(getItem(items, 'srv-stroba')?.quantity).toBe(5);
    expect(getItem(items, 'srv-lay-ceil')?.quantity).toBe(14);
  });
});
