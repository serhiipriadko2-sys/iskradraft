
import React, { useState } from 'react';
import { Calculator, Plus, Trash2, CircleDot } from 'lucide-react';
import { calculateConduitFill, getCableOuterDiameter } from '../utils/electricalFormulas';

const ConduitCalculator: React.FC = () => {
  const [cables, setCables] = useState<{ id: string; section: number; count: number }[]>([
    { id: '1', section: 2.5, count: 3 },
    { id: '2', section: 1.5, count: 2 },
  ]);

  const result = calculateConduitFill(cables);

  const addCable = () => {
    setCables([...cables, { id: Date.now().toString(), section: 1.5, count: 1 }]);
  };

  const updateCable = (id: string, field: keyof typeof cables[0], value: number) => {
    setCables(cables.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCable = (id: string) => {
    setCables(cables.filter(c => c.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold font-display flex items-center gap-2">
            <Calculator className="w-5 h-5 text-slate-500" />
            Калькулятор Труб (ПУЭ)
          </h3>
          <button onClick={addCable} className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
            <Plus className="w-4 h-4" /> Кабель
          </button>
        </div>

        <div className="space-y-3">
          {cables.map((cable) => (
            <div key={cable.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg">
               <div className="flex-1">
                 <label className="text-xs text-slate-500 block mb-1">Сечение (ВВГнг)</label>
                 <select 
                   value={cable.section} 
                   onChange={(e) => updateCable(cable.id, 'section', Number(e.target.value))}
                   className="w-full bg-white border border-slate-200 rounded p-1.5 text-sm font-medium outline-none"
                 >
                   <option value={1.5}>3 x 1.5 мм² (~8мм)</option>
                   <option value={2.5}>3 x 2.5 мм² (~10мм)</option>
                   <option value={4.0}>3 x 4.0 мм² (~11мм)</option>
                   <option value={6.0}>3 x 6.0 мм² (~13мм)</option>
                   <option value={10.0}>5 x 4.0 мм² (~14мм)</option>
                   <option value={10.0}>5 x 6.0 мм² (~16мм)</option>
                 </select>
               </div>
               <div className="w-20">
                 <label className="text-xs text-slate-500 block mb-1">Кол-во</label>
                 <input 
                   type="number" 
                   min="1"
                   value={cable.count}
                   onChange={(e) => updateCable(cable.id, 'count', Number(e.target.value))}
                   className="w-full bg-white border border-slate-200 rounded p-1.5 text-sm font-medium outline-none text-center"
                 />
               </div>
               <button onClick={() => removeCable(cable.id)} className="mt-5 text-slate-400 hover:text-red-500">
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-xs text-slate-500">
          * Расчет ведется по правилу 40% заполнения просвета трубы для обеспечения легкой протяжки и теплоотвода.
        </div>
      </div>

      <div className="flex flex-col justify-center">
         {result.recommendedSize > 0 ? (
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
              <div className="w-24 h-24 rounded-full border-8 border-slate-200 mx-auto flex items-center justify-center mb-4 relative">
                 <div className="absolute inset-0 rounded-full border-8 border-blue-500" style={{ clipPath: `inset(${100 - (result.fillRatio * 2.5 * 100)}% 0 0 0)` }}></div>
                 <CircleDot className="w-10 h-10 text-slate-400" />
              </div>
              
              <h3 className="text-slate-500 font-medium mb-1">Рекомендуемая гофра / труба</h3>
              <div className="text-5xl font-bold font-display text-slate-900 mb-2">
                Ø {result.recommendedSize} <span className="text-2xl text-slate-400">мм</span>
              </div>
              <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-bold">
                 {result.details}
              </div>
           </div>
         ) : (
           <div className="bg-red-50 rounded-xl border border-red-200 p-8 text-center">
             <h3 className="text-red-800 font-bold text-lg mb-2">Слишком много кабелей!</h3>
             <p className="text-red-600 text-sm">Рекомендуется использовать кабельный лоток или разделить на несколько трасс.</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default ConduitCalculator;
