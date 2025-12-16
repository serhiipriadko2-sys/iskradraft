
import React, { useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { calculateNeutralCurrent } from '../utils/electricalFormulas';
import { Activity, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { LoadItem } from '../types';

const PhaseBalanceTool: React.FC = () => {
  const { loads, updateLoadPhase } = useProject();

  const phaseStats = useMemo(() => {
    const stats = {
      L1: { power: 0, current: 0, count: 0 },
      L2: { power: 0, current: 0, count: 0 },
      L3: { power: 0, current: 0, count: 0 }
    };

    loads.forEach(load => {
      const p = load.power * load.count;
      // Approx Amps per phase (assuming cosPhi 0.95 avg)
      const i = (p * 1000) / (230 * 0.95);
      
      const target = load.phase || 'L1';
      
      if (target === 'L1') {
        stats.L1.power += p;
        stats.L1.current += i;
        stats.L1.count += load.count;
      } else if (target === 'L2') {
        stats.L2.power += p;
        stats.L2.current += i;
        stats.L2.count += load.count;
      } else if (target === 'L3') {
        stats.L3.power += p;
        stats.L3.current += i;
        stats.L3.count += load.count;
      } else if (target === 'ABC') {
        // Distribute 3-phase load equally
        const perPhaseP = p / 3;
        const perPhaseI = i / 3;
        stats.L1.power += perPhaseP; stats.L1.current += perPhaseI;
        stats.L2.power += perPhaseP; stats.L2.current += perPhaseI;
        stats.L3.power += perPhaseP; stats.L3.current += perPhaseI;
      }
    });
    return stats;
  }, [loads]);

  const neutralCurrent = calculateNeutralCurrent(
    phaseStats.L1.current, 
    phaseStats.L2.current, 
    phaseStats.L3.current
  );

  const maxCurrent = Math.max(phaseStats.L1.current, phaseStats.L2.current, phaseStats.L3.current);
  const minCurrent = Math.min(phaseStats.L1.current, phaseStats.L2.current, phaseStats.L3.current);
  
  // Imbalance % based on SP 31-110 (Usually (Max-Avg)/Avg or (Max-Min)/Avg)
  // Simplified here: (Max - Min) / Max * 100
  const imbalancePercent = maxCurrent > 0 ? ((maxCurrent - minCurrent) / maxCurrent) * 100 : 0;
  const isCritical = imbalancePercent > 15; // Warning threshold

  const PhaseColumn = ({ phase, data, color }: { phase: 'L1'|'L2'|'L3', data: typeof phaseStats.L1, color: string }) => (
    <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col gap-2 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${color}`}></div>
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-lg">{phase}</h4>
        <Zap className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div className="text-3xl font-display font-bold text-slate-900">
        {data.current.toFixed(1)} <span className="text-sm font-normal text-slate-500">А</span>
      </div>
      <div className="text-sm text-slate-500 font-medium">
        {data.power.toFixed(2)} кВт
      </div>
      
      {/* Visual Bar */}
      <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`} 
          style={{ width: `${maxCurrent > 0 ? (data.current / (maxCurrent * 1.2)) * 100 : 0}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PhaseColumn phase="L1" data={phaseStats.L1} color="bg-amber-500" />
        <PhaseColumn phase="L2" data={phaseStats.L2} color="bg-emerald-500" />
        <PhaseColumn phase="L3" data={phaseStats.L3} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold font-display text-lg mb-4 text-slate-900">Распределение нагрузок</h3>
          <p className="text-sm text-slate-500 mb-4">Назначьте фазу для однофазных потребителей, чтобы выровнять нагрузку.</p>
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {loads.filter(l => l.category !== 'heavy' || l.power < 10).map(load => (
              <div key={load.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors">
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{load.name}</div>
                  <div className="text-xs text-slate-500">{load.count} шт × {load.power} кВт</div>
                </div>
                
                {load.category === 'heavy' && load.power > 3.5 ? (
                  <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">3-ФАЗЫ (ABC)</span>
                ) : (
                  <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                    {(['L1', 'L2', 'L3'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => updateLoadPhase(load.id, p)}
                        className={`
                          px-3 py-1 text-xs font-bold rounded transition-all
                          ${(load.phase || 'L1') === p 
                            ? (p === 'L1' ? 'bg-amber-100 text-amber-700' : p === 'L2' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')
                            : 'text-slate-400 hover:bg-slate-50'
                          }
                        `}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Analysis Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold font-display text-lg mb-4">Векторный Анализ</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Ток в нейтрали (In):</span>
                <span className={`font-mono font-bold text-lg ${neutralCurrent > (maxCurrent * 0.5) ? 'text-red-500' : 'text-slate-900'}`}>
                  {neutralCurrent.toFixed(1)} А
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Перекос фаз:</span>
                <span className={`font-mono font-bold text-lg ${isCritical ? 'text-red-500' : 'text-green-600'}`}>
                  {imbalancePercent.toFixed(1)}%
                </span>
              </div>

              <div className={`mt-4 p-3 rounded-lg flex gap-3 text-sm ${isCritical ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                {isCritical ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                <div>
                  {isCritical 
                    ? "Критический перекос! Распределите нагрузки равномернее, иначе возможен перегрев нуля или отключение вводного автомата."
                    : "Баланс в пределах нормы (СП 31-110)."}
                </div>
              </div>
            </div>
          </div>
          
          {/* Helper */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">Совет инженера:</p>
            <p>Старайтесь подключать мощные потребители (кухня, стиралка, бойлер) на разные фазы. Освещение потребляет мало и почти не влияет на баланс.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhaseBalanceTool;
