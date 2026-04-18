import React from 'react';
import { Activity, Power, ShieldAlert, Zap } from 'lucide-react';
import { PanelConfig } from '../types';

interface PanelLabelStripProps {
  config: PanelConfig;
}

const PanelLabelStrip: React.FC<PanelLabelStripProps> = ({ config }) => {
  const getIcon = (type: string) => {
    if (type === 'switch_3p') return <Power className="h-4 w-4" />;
    if (type.includes('rcd') || type.includes('diff')) return <ShieldAlert className="h-4 w-4" />;
    if (type === 'meter') return <Activity className="h-4 w-4" />;
    return <Zap className="h-4 w-4" />;
  };

  const getBgColor = (type: string) => {
    if (type === 'switch_3p') return 'bg-red-100 border-red-300 text-red-900';
    if (type === 'rcd') return 'bg-blue-100 border-blue-300 text-blue-900';
    if (type === 'diff') return 'bg-indigo-100 border-indigo-300 text-indigo-900';
    if (type === 'meter') return 'bg-green-100 border-green-300 text-green-900';
    if (type === 'relay') return 'bg-amber-100 border-amber-300 text-amber-900';
    return 'bg-white border-slate-300 text-slate-900';
  };

  return (
    <div className="space-y-8 font-sans print:space-y-4">
      {config.rows.map((row, idx) => (
        <div key={row.id} className="break-inside-avoid">
          <div className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500 print:text-black">
            Ряд {idx + 1} (DIN-рейка)
          </div>

          <div className="flex w-fit border-2 border-dashed border-slate-300 print:border-black">
            {row.modules.map(mod => (
              <div
                key={mod.id}
                className={`relative flex flex-col items-center justify-between overflow-hidden border-r border-slate-300 p-1 text-center last:border-r-0 print:border-black ${getBgColor(mod.type)}`}
                style={{
                  width: `${mod.width * 17.5}mm`,
                  minWidth: `${mod.width * 17.5}mm`,
                  height: '28mm',
                }}
              >
                <div className="flex w-full justify-center pt-1">{getIcon(mod.type)}</div>

                <div className="flex w-full flex-1 flex-col items-center justify-center overflow-hidden">
                  <div className="line-clamp-2 w-full break-words px-0.5 text-[9px] font-bold leading-tight">
                    {mod.name}
                  </div>
                </div>

                <div className="mt-0.5 w-full border-t border-black/20 pt-0.5">
                  <div className="text-[10px] font-bold font-mono">{mod.rating}</div>
                </div>
              </div>
            ))}

            {row.modules.length === 0 && (
              <div className="flex h-[28mm] w-[200mm] items-center justify-center bg-slate-50 text-xs italic text-slate-400">
                Пустой ряд (резерв)
              </div>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 text-[8px] text-slate-400 print:text-black">
            <span className="print:hidden">Полоса для печати, масштаб 100%</span>
            <span className="hidden print:inline">Линия отреза</span>
          </div>
        </div>
      ))}

      <div className="mt-4 hidden text-[8px] text-slate-500 print:block">
        * При печати отключите масштабирование и выберите фактический размер 100%, чтобы размеры совпали с автоматами.
      </div>
    </div>
  );
};

export default PanelLabelStrip;
