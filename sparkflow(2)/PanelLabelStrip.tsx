
import React from 'react';
import { PanelConfig, PanelModule } from '../types';
import { Zap, Power, Activity, ShieldAlert, MousePointer2, Info } from 'lucide-react';

interface PanelLabelStripProps {
  config: PanelConfig;
}

const PanelLabelStrip: React.FC<PanelLabelStripProps> = ({ config }) => {
  
  const getIcon = (type: string) => {
    if (type === 'switch_3p') return <Power className="w-4 h-4" />;
    if (type.includes('rcd') || type.includes('diff')) return <ShieldAlert className="w-4 h-4" />;
    if (type === 'meter') return <Activity className="w-4 h-4" />;
    return <Zap className="w-4 h-4" />;
  };

  const getBgColor = (type: string) => {
    if (type === 'switch_3p') return 'bg-red-100 border-red-300 text-red-900';
    if (type === 'rcd') return 'bg-blue-100 border-blue-300 text-blue-900';
    if (type === 'diff') return 'bg-indigo-100 border-indigo-300 text-indigo-900';
    if (type === 'meter') return 'bg-green-100 border-green-300 text-green-900';
    if (type === 'relay') return 'bg-amber-100 border-amber-300 text-amber-900';
    return 'bg-white border-slate-300 text-slate-900'; // breakers
  };

  return (
    <div className="space-y-8 font-sans print:space-y-4">
      {config.rows.map((row, idx) => (
        <div key={row.id} className="break-inside-avoid">
          <div className="text-xs font-bold text-slate-500 mb-1 print:text-black uppercase tracking-widest">
             Ряд {idx + 1} (DIN-рейка)
          </div>
          
          {/* Strip Container - Flex matches physical layout */}
          <div className="flex border-2 border-dashed border-slate-300 w-fit print:border-black">
            {row.modules.map((mod) => (
              <div
                key={mod.id}
                className={`
                  flex flex-col items-center justify-between p-1 text-center border-r last:border-r-0 border-slate-300 print:border-black relative overflow-hidden
                  ${getBgColor(mod.type)}
                `}
                style={{
                  // 1 TE = 17.5mm. We use mm for print accuracy.
                  width: `${mod.width * 17.5}mm`,
                  height: '28mm', // Standard strip height
                  minWidth: `${mod.width * 17.5}mm`, // Force print width
                }}
              >
                {/* Phase Indicator (Simulated based on likely position or prop) */}
                <div className="w-full flex justify-center pt-1">
                   {getIcon(mod.type)}
                </div>

                <div className="flex flex-col items-center justify-center flex-1 w-full overflow-hidden">
                   <div className="text-[9px] font-bold leading-tight line-clamp-2 w-full px-0.5 break-words">
                     {mod.name}
                   </div>
                </div>

                <div className="w-full border-t border-black/20 pt-0.5 mt-0.5">
                   <div className="text-[10px] font-mono font-bold">{mod.rating}</div>
                </div>
              </div>
            ))}
            
            {row.modules.length === 0 && (
              <div className="h-[28mm] w-[200mm] flex items-center justify-center text-slate-400 text-xs italic bg-slate-50">
                 Пустой ряд (Резерв)
              </div>
            )}
          </div>
          
          {/* Cut Lines */}
          <div className="flex items-center gap-2 mt-1 text-[8px] text-slate-400 print:text-black">
             <span className="print:hidden">⬆ Полоса для печати (Масштаб 100%)</span>
             <span className="hidden print:inline">✄ Линия отреза</span>
          </div>
        </div>
      ))}
      
      <div className="hidden print:block text-[8px] mt-4 text-slate-500">
         * При печати отключите масштабирование ("Fit to page" -> "Actual size" / "100%"), чтобы размеры совпали с автоматами.
      </div>
    </div>
  );
};

export default PanelLabelStrip;
