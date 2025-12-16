
import React, { useMemo } from 'react';
import { CableRun, PlanElement } from '../types';
import { calculateVoltageDrop, calculateShortCircuitCurrent, checkBreakerTrip } from '../utils/electricalFormulas';
import { Download, AlertTriangle, Check, ZapOff } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface CableJournalProps {
  runs: CableRun[];
  elements: PlanElement[];
}

const CableJournal: React.FC<CableJournalProps> = ({ runs, elements }) => {
  const { panelConfig } = useProject();

  const getElement = (id: string) => elements.find(e => e.id === id);
  const getElementName = (id: string) => {
    const el = getElement(id);
    if (!el) return "???";
    let name = el.label || "Точка";
    if (el.circuitId) name += ` (${el.circuitId})`;
    return name;
  };

  // Find breaker for a circuit to check protection
  const getBreakerForCircuit = (circuitId?: string) => {
     if (!circuitId || !panelConfig) return "C16"; // Default assumption
     for (const row of panelConfig.rows) {
         const mod = row.modules.find(m => m.name === circuitId);
         if (mod && mod.type.startsWith('breaker')) return mod.rating;
     }
     return "C16"; // Fallback
  };

  // Enhance runs with engineering calculations
  const enhancedRuns = useMemo(() => {
    return runs.map(run => {
      const endEl = getElement(run.toId);
      const startEl = getElement(run.fromId);
      const section = run.type === 'power' ? 2.5 : 1.5;
      const power = endEl?.power || (run.type === 'power' ? 3.5 : 0.1);
      
      // Voltage Drop
      const dU = calculateVoltageDrop(run.length, power, 230, section);
      
      // Short Circuit
      const isc = calculateShortCircuitCurrent(run.length, section, 230);
      
      // Protection Check
      const circuitId = startEl?.circuitId || endEl?.circuitId;
      const breakerRating = getBreakerForCircuit(circuitId);
      const protectionCheck = checkBreakerTrip(isc, breakerRating);

      return {
        ...run,
        section,
        power,
        dU,
        isc,
        circuitId,
        breakerRating,
        protectionCheck,
        isVoltageWarning: dU > 4.0
      };
    });
  }, [runs, elements, panelConfig]);

  const handleExportCSV = () => {
    const BOM = "\uFEFF";
    const headers = "Маркировка;Начало;Конец;Кабель;Длина (м);Мощность (кВт);dU (%);I к.з. (А);Автомат;Статус защиты";
    const rows = enhancedRuns.map(r => {
      const start = getElementName(r.fromId);
      const end = getElementName(r.toId);
      const cable = r.type === 'power' ? 'ВВГнг-LS 3x2.5' : 'ВВГнг-LS 3x1.5';
      const status = r.protectionCheck.willTrip ? "OK" : "FAIL (Ток КЗ мал)";
      return `Каб-${r.id.slice(-4)};${start};${end};${cable};${r.length};${r.power};${r.dU.toFixed(2)};${r.isc};${r.breakerRating};${status}`;
    }).join("\n");

    const csvContent = BOM + headers + "\n" + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cable_journal_gost.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPowerLen = enhancedRuns.filter(r => r.type === 'power').reduce((s, r) => s + r.length, 0);
  const totalLightLen = enhancedRuns.filter(r => r.type === 'light').reduce((s, r) => s + r.length, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-black print:rounded-none">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center print:border-black print:p-2">
        <div>
           <h3 className="font-display font-semibold text-slate-900">Кабельный Журнал (ГОСТ 21.608)</h3>
           <p className="text-xs text-slate-500 print:hidden">Инженерный расчет потерь (dU) и токов КЗ (Isc)</p>
        </div>
        
        <div className="flex gap-2 print:hidden">
          <div className="text-sm text-slate-500 font-mono self-center mr-4">
             Всего трасс: {runs.length}
          </div>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4"/> CSV
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 print:bg-white print:text-black print:border-black print:text-[10px]">
            <tr>
              <th className="px-4 py-3 w-12 border-r border-slate-100 print:border-black print:p-1">№</th>
              <th className="px-4 py-3 border-r border-slate-100 print:border-black print:p-1">Маркировка</th>
              <th className="px-4 py-3 border-r border-slate-100 print:border-black print:p-1">Трасса</th>
              <th className="px-4 py-3 border-r border-slate-100 print:border-black print:p-1 w-24">Кабель</th>
              <th className="px-4 py-3 text-right border-r border-slate-100 print:border-black print:p-1">L (м)</th>
              <th className="px-4 py-3 text-right border-r border-slate-100 print:border-black print:p-1" title="Падение напряжения">dU %</th>
              <th className="px-4 py-3 text-right border-r border-slate-100 print:border-black print:p-1" title="Ток короткого замыкания">I к.з.</th>
              <th className="px-4 py-3 border-r border-slate-100 print:border-black print:p-1 w-24">Защита</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-black print:text-[10px]">
            {enhancedRuns.length === 0 ? (
               <tr>
                 <td colSpan={8} className="px-6 py-8 text-center text-slate-400 italic">
                   Кабельные трассы не проложены.
                 </td>
               </tr>
            ) : (
              enhancedRuns.map((run, idx) => (
                <tr key={run.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs border-r border-slate-100 print:border-black print:text-black print:p-1">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs border-r border-slate-100 print:border-black print:p-1">
                     {run.type === 'power' ? 'W' : 'N'}{idx+1}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 border-r border-slate-100 print:border-black print:p-1 max-w-xs truncate">
                    {getElementName(run.fromId)} <span className="text-slate-400 px-1">&rarr;</span> {getElementName(run.toId)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs border-r border-slate-100 print:border-black print:p-1">
                    {run.type === 'power' ? '3x2.5' : '3x1.5'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-700 border-r border-slate-100 print:border-black print:p-1">
                    {run.length}
                  </td>
                  <td className="px-4 py-3 text-right border-r border-slate-100 print:border-black print:p-1">
                     <div className={`font-mono flex items-center justify-end gap-1 ${run.isVoltageWarning ? 'text-red-600 font-bold' : 'text-green-700'}`}>
                        {run.isVoltageWarning && <AlertTriangle className="w-3 h-3"/>}
                        {run.dU.toFixed(2)}
                     </div>
                  </td>
                  <td className="px-4 py-3 text-right border-r border-slate-100 print:border-black print:p-1">
                    <div className="flex flex-col items-end leading-tight">
                        <span className="font-mono text-slate-700">{run.isc} А</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs print:p-1">
                     <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{run.breakerRating}</span>
                        {run.protectionCheck.willTrip ? (
                            <span className="text-green-600 flex items-center gap-1 text-[9px]">
                                <Check className="w-3 h-3"/> Защищен
                            </span>
                        ) : (
                            <span className="text-red-600 flex items-center gap-1 text-[9px] font-bold" title={`Ток КЗ (${run.isc}A) меньше тока отсечки (${run.protectionCheck.minTripCurrent}A)`}>
                                <ZapOff className="w-3 h-3"/> Риск!
                            </span>
                        )}
                     </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {enhancedRuns.length > 0 && (
            <tfoot className="bg-slate-50 border-t border-slate-200 print:bg-white print:border-black print:text-[10px]">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right font-medium text-slate-600 print:p-1">Итого (с запасом 10%):</td>
                <td colSpan={4} className="px-4 py-3 text-left font-bold text-slate-900 print:p-1">
                   Сила (3х2.5): {(totalPowerLen * 1.1).toFixed(0)}м | Свет (3х1.5): {(totalLightLen * 1.1).toFixed(0)}м
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default CableJournal;
