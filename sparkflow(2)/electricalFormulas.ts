
export const calculateVoltageDrop = (
  lengthMeters: number, 
  powerKw: number, 
  voltage: number = 230, 
  sectionMm2: number = 2.5, 
  material: 'copper' | 'aluminum' = 'copper'
): number => {
  // Formula: dU% = (P * L * 100) / (gamma * S * U^2)
  // gamma copper = 57 m/(Ohm*mm2), alum = 32
  
  if (powerKw <= 0 || lengthMeters <= 0) return 0;

  const gamma = material === 'copper' ? 57 : 32;
  const powerWatts = powerKw * 1000;
  
  // Calculate percentage drop
  // Simplified for resistive load: dU = (2 * P * L) / (gamma * S * U)
  // dU% = (dU / U) * 100
  
  const dropPercent = (2 * powerWatts * lengthMeters * 100) / (gamma * sectionMm2 * voltage * voltage);
  
  return dropPercent;
};

export const getRecommendedCableSection = (type: string): number => {
  if (type === 'light') return 1.5;
  if (type === 'heavy') return 4.0; // e.g. stove
  return 2.5; // standard socket
};

// Short Circuit Calculation (Approximate method for loop impedance)
export const calculateShortCircuitCurrent = (
  lengthMeters: number, 
  sectionMm2: number, 
  voltage: number = 230
): number => {
  // Z_loop approx = Z_transform + Z_line
  // Z_line = 2 * L / (gamma * S)  (phase + neutral)
  // Z_transform (typ. 0.4kV) approx 0.04 Ohm usually, but let's take a safe margin or assume input impedance.
  // Let's assume Z_source = 0.3 Ohm conservatively (typical for old grid).
  
  const gamma = 57; // Copper
  const r_line = (2 * lengthMeters) / (gamma * sectionMm2);
  const z_source = 0.3; 
  
  const z_total = z_source + r_line;
  
  return Math.round(voltage / z_total);
};

export const checkBreakerTrip = (
  isc: number, 
  breakerRating: string // e.g., "C16", "B10"
): { willTrip: boolean; minTripCurrent: number } => {
  const char = breakerRating.charAt(0).toUpperCase(); // B, C, D
  const rating = parseInt(breakerRating.match(/\d+/)?.[0] || "16");
  
  let multiplier = 10; // Default C curve upper bound (5-10 In)
  if (char === 'B') multiplier = 5; // 3-5 In
  if (char === 'D') multiplier = 20; // 10-20 In
  
  // To be safe (reliable electromagnetic trip), Isc must be > upper bound
  const minTripCurrent = rating * multiplier;
  
  return {
    willTrip: isc >= minTripCurrent,
    minTripCurrent
  };
};

/**
 * Calculates current on Neutral wire in a 3-phase unbalanced system.
 * Uses vector addition: In = sqrt(Ia^2 + Ib^2 + Ic^2 - Ia*Ib - Ib*Ic - Ic*Ia)
 */
export const calculateNeutralCurrent = (iA: number, iB: number, iC: number): number => {
  const val = (iA*iA) + (iB*iB) + (iC*iC) - (iA*iB) - (iB*iC) - (iC*iA);
  return Math.sqrt(Math.max(0, val));
};

/**
 * Calculates max allowable current for cable considering environmental factors
 * GOST R 50571.5.52
 */
export const calculateDeratedCapacity = (
  baseCapacity: number, // e.g., 27A for 2.5mm2
  tempCoeff: number = 1.0, // K1
  groupCoeff: number = 1.0 // K2
): number => {
  return baseCapacity * tempCoeff * groupCoeff;
};

export const getBaseCableCapacity = (section: number): number => {
  // Simple lookup for Copper, Hidden (C) or Conduit (B) - avg values
  switch (section) {
    case 1.5: return 19;
    case 2.5: return 27;
    case 4.0: return 38;
    case 6.0: return 46;
    case 10.0: return 63;
    default: return 0;
  }
};

/**
 * Conduit Fill Calculation
 */
export const getCableOuterDiameter = (section: number): number => {
  // Approximate outer diameter (mm) for round cable VVGng-LS
  if (section <= 1.5) return 8.2; // 3x1.5
  if (section <= 2.5) return 9.6; // 3x2.5
  if (section <= 4.0) return 11.2;
  if (section <= 6.0) return 12.5;
  if (section <= 10.0) return 15.5;
  return 10; 
};

export const calculateConduitFill = (
  cables: { section: number; count: number }[]
): { recommendedSize: number; fillRatio: number; details: string } => {
  const FILL_FACTOR_LIMIT = 0.40; // 40% rule per PUÉ for easy pulling

  // Calculate Total Cross-Sectional Area of Cables
  // A = pi * r^2 = pi * (d/2)^2
  let totalCableArea = 0;
  
  cables.forEach(c => {
    const d = getCableOuterDiameter(c.section);
    const area = Math.PI * Math.pow(d / 2, 2);
    totalCableArea += area * c.count;
  });

  // Standard Pipe Sizes (Outer / Inner approx)
  // 16 (10.7), 20 (14.1), 25 (18.3), 32 (24.5), 40 (31.2), 50 (39.6) - Heavy/Standard PVC
  const pipes = [
    { outer: 16, inner: 11 },
    { outer: 20, inner: 15 },
    { outer: 25, inner: 19 },
    { outer: 32, inner: 26 },
    { outer: 40, inner: 33 },
    { outer: 50, inner: 42 },
    { outer: 63, inner: 55 }
  ];

  for (const pipe of pipes) {
    const pipeArea = Math.PI * Math.pow(pipe.inner / 2, 2);
    const fill = totalCableArea / pipeArea;
    
    if (fill <= FILL_FACTOR_LIMIT) {
      return {
        recommendedSize: pipe.outer,
        fillRatio: fill,
        details: `Заполнение ${(fill*100).toFixed(0)}% (Макс 40%)`
      };
    }
  }
  
  return {
    recommendedSize: 0, // None found
    fillRatio: 1,
    details: "Требуется лоток или труба >63мм"
  };
};
