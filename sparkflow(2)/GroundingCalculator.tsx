
import React, { useState } from 'react';
import { Sprout, ArrowRight, Save, Info } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface SoilType {
  name: string;
  resistivity: number; // Ohm*m
}

const SOIL_TYPES: SoilType[] = [
  { name: 'Торф влажный', resistivity: 20 },
  { name: 'Суглинок, глина пластичная', resistivity: 60 },
  { name: 'Глина, чернозем', resistivity: 100 },
  { name: 'Песок влажный', resistivity: 200 },
  { name: 'Супесь', resistivity: 150 },
  { name: 'Песок сухой, каменистый грунт', resistivity: 1000 },
];

const GroundingCalculator: React.FC = () => {
  const { addToSpecification } = useProject();
  
  const [soilResistivity, setSoilResistivity] = useState(100);
  const [rodLength, setRodLength] = useState(3.0); // meters
  const [rodDiameter, setRodDiameter] = useState(0.016); // meters (16mm)
  const [targetResistance, setTargetResistance] = useState(4); // 4 Ohm for Gas/380V, 10 for 220V
  const [rodCount, setRodCount] = useState(1);

  // Formulas based on RD 153-34.0-20.525-00
  // Resistance of one vertical electrode (Rod)
  // R_v = (rho / 2*pi*L) * (ln(2L/d) + 0.5*ln((4t+L)/(4t-L)))
  // Simplified: R_v approx (rho / L) usually gives a ballpark, but let's use proper formula.
  // Assuming depth t = L/2 (top of rod at 0.5m usually, but let's assume mid-point is deeper)
  
  const calculateSingleRodResistance = (rho: number, L: number, d: number): number => {
     // Using simplified formula for vertical rod flush with ground (approx):
     // R = (rho / 2*pi*L) * ln(2L/d)
     return (rho / (2 * Math.PI * L)) * (Math.log((2 * L) / d));
  };

  // Utilization factor (K_isp) depends on count and arrangement.
  // Approximation for line arrangement:
  const getUtilizationFactor = (n: number): number => {
      if (n <= 1) return 1;
      if (n <= 3) return 0.9;
      if (n <= 5) return 0.85;
      if (n <= 10) return 0.75;
      return 0.6;
  };

  const oneRodR = calculateSingleRodResistance(soilResistivity, rodLength, rodDiameter);
  
  // Calculate Resistance for current count
  const totalR = oneRodR / (rodCount * getUtilizationFactor(rodCount));
  
  const isCompliant = totalR <= targetResistance;

  const recommendCount = () => {
      let n = 1;
      while (n < 50) {
          const r = oneRodR / (n * getUtilizationFactor(n));
          if (r <= targetResistance) {
              setRodCount(n);
              return;
          }
          n++;
      }
  };

  const handleAddToSpec = () => {
     addToSpecification([
         {
             id: `gnd-rod-${Date.now()}`,
             category: 'Equipment',
             name: 'Стержень заземления омедненный 1.5м (Комплект)',
             model: 'EZ 14mm',
             unit: 'шт',
             quantity: rodCount * Math.ceil(rodLength / 1.5), // Assuming 1.5m segments
             estimatedPrice: 1200
         },
         {
             id: `gnd-strip-${Date.now()}`,
             category: 'Equipment',
             name: 'Полоса стальная оцинкованная 40х4',
             unit: 'м',
             quantity: rodCount * 3, // Approx distance between rods
             estimatedPrice: 180
         },
         {
            id: `srv-gnd-${Date.now()}`,
            category: 'Services',
            name: 'Монтаж контура заземления (забивка + сварка)',
            unit: 'к-т',
            quantity: 1,
            estimatedPrice: 5000 + (rodCount * 1000)
         }
     ]);
     alert("Материалы заземления добавлены в смету");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
       <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold font-display flex items-center gap-2 mb-6">
             <Sprout className="w-5 h-5 text-green-600" />
             Параметры грунта и контура
          </h3>

          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Тип грунта</label>
                <select 
                  value={soilResistivity}
                  onChange={(e) => setSoilResistivity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-green-500"
                >
                   {SOIL_TYPES.map(s => (
                       <option key={s.name} value={s.resistivity}>{s.name} ({s.resistivity} Ом·м)</option>
                   ))}
                   <option value={500}>Другое (ввести вручную)</option>
                </select>
             </div>

             {soilResistivity === 500 && (
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Удельное сопротивление (Ом·м)</label>
                    <input 
                      type="number" 
                      value={soilResistivity}
                      onChange={(e) => setSoilResistivity(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none"
                    />
                 </div>
             )}

             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Длина электрода (м)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={rodLength}
                      onChange={(e) => setRodLength(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Норматив (Ом)</label>
                    <select 
                      value={targetResistance}
                      onChange={(e) => setTargetResistance(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none"
                    >
                       <option value={4}>4 Ом (380В / Газ)</option>
                       <option value={10}>10 Ом (220В / Молниезащита)</option>
                       <option value={30}>30 Ом (Повторное)</option>
                    </select>
                </div>
             </div>

             <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Количество штырей (шт)</label>
                <div className="flex items-center gap-4">
                   <input 
                     type="range" 
                     min="1" max="20"
                     value={rodCount}
                     onChange={(e) => setRodCount(Number(e.target.value))}
                     className="flex-1 accent-green-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                   />
                   <span className="font-mono font-bold text-lg w-8">{rodCount}</span>
                </div>
             </div>

             <button 
               onClick={recommendCount}
               className="w-full py-2 border-2 border-dashed border-green-500 text-green-700 rounded-lg hover:bg-green-50 font-medium text-sm flex items-center justify-center gap-2"
             >
                <Info className="w-4 h-4"/> Подобрать количество автоматически
             </button>
          </div>
       </div>

       <div className="flex flex-col gap-6">
           <div className={`rounded-xl p-6 text-white shadow-lg transition-colors ${isCompliant ? 'bg-green-600 shadow-green-200' : 'bg-red-500 shadow-red-200'}`}>
               <div className="text-sm opacity-80 mb-1">Расчетное сопротивление</div>
               <div className="text-5xl font-bold font-display mb-4">{totalR.toFixed(1)} <span className="text-2xl font-normal">Ом</span></div>
               
               <div className="flex items-center gap-3 text-sm font-medium bg-black/20 p-3 rounded-lg backdrop-blur-sm">
                   {isCompliant ? (
                       <>
                         <div className="w-6 h-6 rounded-full bg-white text-green-600 flex items-center justify-center font-bold">✓</div>
                         Соответствует нормам ПУЭ (1.7.101)
                       </>
                   ) : (
                       <>
                         <div className="w-6 h-6 rounded-full bg-white text-red-600 flex items-center justify-center font-bold">!</div>
                         Превышает норму ({targetResistance} Ом). Добавьте электродов.
                       </>
                   )}
               </div>
           </div>

           <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h4 className="font-bold text-slate-900 mb-2">Конфигурация</h4>
              <ul className="text-sm text-slate-600 space-y-2 mb-6">
                 <li className="flex justify-between">
                    <span>Сопротивление 1 штыря:</span>
                    <span className="font-mono">{oneRodR.toFixed(1)} Ом</span>
                 </li>
                 <li className="flex justify-between">
                    <span>Коэффициент использования:</span>
                    <span className="font-mono">{getUtilizationFactor(rodCount)}</span>
                 </li>
                 <li className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                    <span>Схема:</span>
                    <span>Линейная / Треугольник (шаг {rodLength}м)</span>
                 </li>
              </ul>
              
              <button 
               onClick={handleAddToSpec}
               className="w-full py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                  <Save className="w-4 h-4"/> Добавить в смету
              </button>
           </div>
       </div>
    </div>
  );
};

export default GroundingCalculator;
