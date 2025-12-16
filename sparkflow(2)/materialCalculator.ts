
import { PanelConfig, PlanElement, CableRun, SpecificationItem, MaterialTier } from '../types';

// Pricing and Model Database (Mock)
const CATALOG = {
  budget: {
    brand: 'IEK/EKF',
    cable: 'ГОСТ (Бюджет)',
    breaker_1p: { model: 'VA47-29', price: 250 },
    breaker_3p: { model: 'VA47-29 3P', price: 900 },
    rcd: { model: 'VD1-63', price: 1800 },
    diff: { model: 'AD-12', price: 2200 },
    switch_3p: { model: 'VN-32', price: 1200 },
    meter: { model: 'Mercury 201', price: 1500 },
    relay: { model: 'RMM-47', price: 2000 },
    cable_3x1_5: { model: 'VVGng(A)-LS 3x1.5', price: 65 },
    cable_3x2_5: { model: 'VVGng(A)-LS 3x2.5', price: 110 },
    socket: { model: 'Universal', price: 150 },
    switch: { model: '1-Key', price: 140 },
    box: { model: 'Kopobka 68mm', price: 15 },
    clip: { model: 'Clip 20mm', price: 2 },
  },
  standard: {
    brand: 'Schneider Electric (Resi9/Atlas)',
    cable: 'Nexans/Concord',
    breaker_1p: { model: 'Resi9 MCB 1P', price: 450 },
    breaker_3p: { model: 'Resi9 MCB 3P', price: 1400 },
    rcd: { model: 'Resi9 RCD', price: 3500 },
    diff: { model: 'Resi9 RCBO', price: 4200 },
    switch_3p: { model: 'Easy9 Switch', price: 2100 },
    meter: { model: 'Energomera', price: 2500 },
    relay: { model: 'Novatek', price: 4500 },
    cable_3x1_5: { model: 'VVGng(A)-LSLTx 3x1.5', price: 90 },
    cable_3x2_5: { model: 'VVGng(A)-LSLTx 3x2.5', price: 150 },
    socket: { model: 'Atlas Design', price: 350 },
    switch: { model: 'Atlas Design', price: 320 },
    box: { model: 'Schneider Green', price: 45 },
    clip: { model: 'Dowel-Clip prom', price: 5 },
  },
  premium: {
    brand: 'ABB / Legrand',
    cable: 'Prysmian/Lapp',
    breaker_1p: { model: 'ABB SH201L', price: 850 },
    breaker_3p: { model: 'ABB SH203L', price: 2800 },
    rcd: { model: 'ABB FH202', price: 6500 },
    diff: { model: 'ABB DS201', price: 8500 },
    switch_3p: { model: 'ABB OT40', price: 4500 },
    meter: { model: 'Matrix', price: 8000 },
    relay: { model: 'Meander UZM', price: 6000 },
    cable_3x1_5: { model: 'NYM 3x1.5', price: 120 },
    cable_3x2_5: { model: 'NYM 3x2.5', price: 190 },
    socket: { model: 'Legrand Valena Allure', price: 900 },
    switch: { model: 'Legrand Valena Allure', price: 850 },
    box: { model: 'Kaiser Deep', price: 150 },
    clip: { model: 'Hilti Clip', price: 12 },
  }
};

// Labor Prices (Avg Russia)
const LABOR = {
  stroba_brick: 350, // RUB per meter
  cable_lay_stroba: 100,
  cable_lay_ceiling: 150, // with clips
  install_box_flush: 350, // Drilling + install
  install_socket: 250,
  install_light: 500,
  install_panel_module: 300, // per module (assembly)
  install_panel_box: 1500,
};

export const calculateMaterials = (
  panel: PanelConfig | null,
  elements: PlanElement[],
  cables: CableRun[],
  tier: MaterialTier = 'standard'
): SpecificationItem[] => {
  const items: SpecificationItem[] = [];
  const db = CATALOG[tier];

  // 1. Cables
  let len1_5 = 0;
  let len2_5 = 0;

  // Labor Counters
  let verticalStrobaMeters = 0;
  let ceilingLayingMeters = 0;

  // Assume ceiling height 2.7 if not passed (could enhance signature later)
  const CEILING_HEIGHT = 2.7;

  cables.forEach(run => {
    // Distribute lengths
    if (run.type === 'light') len1_5 += run.length;
    else len2_5 += run.length;

    // Advanced Labor Calculation
    // We try to reverse-engineer the 3D calc: 
    // Run Length = Horiz + Drop1 + Drop2
    // We assume "Drops" are Vertical Stroba, and "Horiz" is Ceiling Laying
    
    const start = elements.find(e => e.id === run.fromId);
    const end = elements.find(e => e.id === run.toId);
    
    if (start && end) {
        const h1 = (start.mountingHeight || 30) / 100;
        const h2 = (end.mountingHeight || 30) / 100;
        
        // Vertical parts
        const drop1 = Math.max(0, CEILING_HEIGHT - h1);
        const drop2 = Math.max(0, CEILING_HEIGHT - h2);
        
        // If it's a DB (h=1.8), drop is small. If socket (0.3), drop is 2.4.
        
        // Logic check: If connecting two sockets, we go Up and Down -> 2 strobas.
        // If connecting Light (Ceiling) to Light (Ceiling) -> 0 strobas.
        
        let v = 0;
        if (start.type !== 'light' && start.type !== 'db') v += drop1; // DB is usually surface or special, count stroba if needed but usually mains comes from floor/ceiling. Let's count DB drops too.
        if (start.type === 'db') v += drop1; // Cable enters DB from top

        if (end.type !== 'light') v += drop2;
        
        // Only add if it's a "hidden" run (which is default assumption)
        verticalStrobaMeters += v;
        
        // The rest is horizontal ceiling run
        ceilingLayingMeters += (run.length - v);
    } else {
        // Fallback if elements missing
        ceilingLayingMeters += run.length; 
    }
  });

  // Margins
  const margin = 1.1; 
  
  if (len1_5 > 0) {
    items.push({
      id: 'mat-cable-1.5',
      category: 'Cable',
      name: `Кабель силовой 3x1.5 (${db.brand})`,
      model: db.cable_3x1_5.model,
      unit: 'м',
      quantity: Math.ceil(len1_5 * margin),
      estimatedPrice: db.cable_3x1_5.price,
      isAutoGenerated: true
    });
  }

  if (len2_5 > 0) {
    items.push({
      id: 'mat-cable-2.5',
      category: 'Cable',
      name: `Кабель силовой 3x2.5 (${db.brand})`,
      model: db.cable_3x2_5.model,
      unit: 'м',
      quantity: Math.ceil(len2_5 * margin),
      estimatedPrice: db.cable_3x2_5.price,
      isAutoGenerated: true
    });
  }

  // 2. Wiring Accessories (Sockets/Switches)
  let sockets = 0;
  let switches = 0;
  let lights = 0;
  
  elements.forEach(el => {
    if (el.type === 'socket') sockets++;
    if (el.type === 'switch') switches++;
    if (el.type === 'light') lights++;
  });

  if (sockets > 0) {
    items.push({
      id: 'mat-acc-socket',
      category: 'Wiring',
      name: `Розетка с з/к встраиваемая`,
      model: db.socket.model,
      unit: 'шт',
      quantity: sockets,
      estimatedPrice: db.socket.price,
      isAutoGenerated: true
    });
  }
  if (switches > 0) {
    items.push({
      id: 'mat-acc-switch',
      category: 'Wiring',
      name: `Выключатель 1-клавишный`,
      model: db.switch.model,
      unit: 'шт',
      quantity: switches,
      estimatedPrice: db.switch.price,
      isAutoGenerated: true
    });
  }

  // 3. Consumables (Calculated)
  const totalPoints = sockets + switches;
  if (totalPoints > 0) {
    items.push({
      id: 'mat-cons-box',
      category: 'Consumables',
      name: 'Коробка установочная (подрозетник)',
      model: db.box.model,
      unit: 'шт',
      quantity: totalPoints,
      estimatedPrice: db.box.price,
      isAutoGenerated: true
    });
  }

  const totalCable = (len1_5 + len2_5) * margin;
  if (totalCable > 0) {
    items.push({
      id: 'mat-cons-clip',
      category: 'Consumables',
      name: 'Дюбель-хомут / Клипса (2 шт/м)',
      model: db.clip.model,
      unit: 'шт',
      quantity: Math.ceil(totalCable * 2), // 2 clips per meter
      estimatedPrice: db.clip.price,
      isAutoGenerated: true
    });
    
    items.push({
      id: 'mat-cons-gofr',
      category: 'Consumables',
      name: 'Труба гофрированная ПВХ 20мм',
      model: 'D20 Grey',
      unit: 'м',
      quantity: Math.ceil(totalCable),
      estimatedPrice: 15,
      isAutoGenerated: true
    });
  }

  // 4. Panel Components
  let totalModules = 0;
  
  if (panel) {
    // Enclosure
    items.push({
      id: 'mat-pnl-box',
      category: 'Equipment',
      name: `Щит распределительный встраиваемый ${panel.enclosureSize}М`,
      model: `Minstrel / Tekfor ${panel.enclosureSize}`,
      unit: 'шт',
      quantity: 1,
      estimatedPrice: 2500 + (panel.enclosureSize * 50),
      isAutoGenerated: true
    });

    panel.rows.forEach(row => {
      row.modules.forEach(mod => {
        totalModules += mod.width;
        let price = 0;
        let model = mod.rating;
        
        // Map types to DB
        switch(mod.type) {
            case 'breaker_1p': price = db.breaker_1p.price; model = `${db.breaker_1p.model} ${mod.rating}`; break;
            case 'breaker_2p': price = db.breaker_1p.price * 2; model = `${db.breaker_1p.model} 2P ${mod.rating}`; break;
            case 'breaker_3p': price = db.breaker_3p.price; model = `${db.breaker_3p.model} ${mod.rating}`; break;
            case 'rcd': price = db.rcd.price; model = `${db.rcd.model} ${mod.rating}`; break;
            case 'diff': price = db.diff.price; model = `${db.diff.model} ${mod.rating}`; break;
            case 'switch_3p': price = db.switch_3p.price; model = `${db.switch_3p.model} ${mod.rating}`; break;
            case 'meter': price = db.meter.price; model = `${db.meter.model}`; break;
            case 'relay': price = db.relay.price; model = `${db.relay.model}`; break;
            default: price = 0;
        }

        items.push({
          id: `mat-mod-${mod.id}`,
          category: 'Protection',
          name: `${mod.name} (${mod.type.toUpperCase()})`,
          model: model,
          unit: 'шт',
          quantity: 1,
          estimatedPrice: price,
          isAutoGenerated: true
        });
      });
    });
  }

  // 5. SERVICES (Labor)
  
  if (verticalStrobaMeters > 0) {
      items.push({
          id: 'srv-stroba',
          category: 'Services',
          name: 'Штробление стен (бетон/кирпич) под проводку',
          unit: 'м',
          quantity: Math.ceil(verticalStrobaMeters),
          estimatedPrice: LABOR.stroba_brick,
          isAutoGenerated: true
      });
      
      // Laying cable in stroba
      items.push({
          id: 'srv-lay-stroba',
          category: 'Services',
          name: 'Укладка кабеля в готовой штробе',
          unit: 'м',
          quantity: Math.ceil(verticalStrobaMeters),
          estimatedPrice: LABOR.cable_lay_stroba,
          isAutoGenerated: true
      });
  }

  if (ceilingLayingMeters > 0) {
      items.push({
          id: 'srv-lay-ceil',
          category: 'Services',
          name: 'Прокладка кабеля открыто/в гофре (потолок)',
          unit: 'м',
          quantity: Math.ceil(ceilingLayingMeters),
          estimatedPrice: LABOR.cable_lay_ceiling,
          isAutoGenerated: true
      });
  }

  if (totalPoints > 0) {
      items.push({
          id: 'srv-drill-box',
          category: 'Services',
          name: 'Сверление отверстий + установка подрозетников',
          unit: 'шт',
          quantity: totalPoints,
          estimatedPrice: LABOR.install_box_flush,
          isAutoGenerated: true
      });
      items.push({
          id: 'srv-inst-mech',
          category: 'Services',
          name: 'Установка механизмов (розетки/выключатели) чистовая',
          unit: 'шт',
          quantity: totalPoints,
          estimatedPrice: LABOR.install_socket,
          isAutoGenerated: true
      });
  }
  
  if (lights > 0) {
      items.push({
          id: 'srv-inst-light',
          category: 'Services',
          name: 'Установка светильников (точечных/накладных)',
          unit: 'шт',
          quantity: lights,
          estimatedPrice: LABOR.install_light,
          isAutoGenerated: true
      });
  }

  if (panel) {
      items.push({
          id: 'srv-inst-panel-box',
          category: 'Services',
          name: 'Установка корпуса щита (ниша)',
          unit: 'шт',
          quantity: 1,
          estimatedPrice: LABOR.install_panel_box,
          isAutoGenerated: true
      });
      
      if (totalModules > 0) {
           items.push({
              id: 'srv-inst-panel-mod',
              category: 'Services',
              name: 'Сборка щита (коммутация модулей)',
              unit: 'мод.',
              quantity: totalModules,
              estimatedPrice: LABOR.install_panel_module,
              isAutoGenerated: true
          });
      }
  }

  return items;
};
