
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, ArrowRight, Printer, FileText } from 'lucide-react';
import SpecificationTable from '../components/SpecificationTable';
import SingleLineDiagram from '../components/SingleLineDiagram';
import CableJournal from '../components/CableJournal';
import PanelLabelStrip from '../components/PanelLabelStrip';
import PlanReportView from '../components/PlanReportView';
import GostStamp from '../components/GostStamp';
import { ProjectAuditResult } from '../types';
import { auditProjectSpecification } from '../services/geminiService';
import { useProject } from '../context/ProjectContext';
import { Link } from 'react-router-dom';

const ReportsPage: React.FC = () => {
  const { panelConfig, specification, cableRuns, floorPlanElements, walls, roomDimensions, projectName, metadata } = useProject();
  const [auditResult, setAuditResult] = useState<ProjectAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  useEffect(() => {
    // Run audit only if we have a specification
    if (specification.length > 0) {
      const runAudit = async () => {
        setIsAuditing(true);
        try {
          const res = await auditProjectSpecification(specification);
          setAuditResult(res);
        } catch(e) {
          console.error(e);
        } finally {
          setIsAuditing(false);
        }
      };
      runAudit();
    } else {
      setAuditResult(null);
    }
  }, [specification]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 print:p-0 print:m-0 print:w-full print:max-w-none print:bg-white print:space-y-0">
      
      {/* Controls */}
      <header className="flex justify-between items-start print:hidden mb-8">
        <div>
          <h2 className="text-3xl font-bold font-display text-slate-900">Проектная документация</h2>
          <p className="text-slate-500 mt-2">Раздел ЭОМ (Электрооборудование и освещение)</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
        >
          <Printer className="w-4 h-4" /> Печать / PDF (Ctrl+P)
        </button>
      </header>

      {/* --- Page 0: Cover Page --- */}
      <div className="hidden print:flex flex-col h-[297mm] justify-between page-break-after-always p-10 border border-slate-200 print:border-none">
         <div className="text-center mt-20">
            <div className="text-sm uppercase tracking-widest mb-2">{metadata.clientName || 'ЗАКАЗЧИК'}</div>
            <h1 className="text-4xl font-bold font-display uppercase mb-8">{projectName}</h1>
            <div className="text-xl text-slate-600 mb-20">{metadata.projectAddress}</div>
            
            <div className="inline-block border-y-4 border-black py-4 px-10">
               <h2 className="text-2xl font-bold uppercase">Проект электроснабжения</h2>
               <p className="text-sm font-mono mt-2">Раздел ЭОМ (Внутреннее электроосвещение и силовое оборудование)</p>
            </div>
         </div>

         <div className="mb-20">
            <table className="w-full text-sm">
               <tbody>
                  <tr>
                     <td className="py-2 font-bold text-right pr-4 w-1/2">Стадия проектирования:</td>
                     <td className="py-2 w-1/2">{metadata.projectStage === 'РД' ? 'Рабочая документация' : 'Эскизный проект'}</td>
                  </tr>
                  <tr>
                     <td className="py-2 font-bold text-right pr-4">Шифр проекта:</td>
                     <td className="py-2">{metadata.projectCode}</td>
                  </tr>
                  <tr>
                     <td className="py-2 font-bold text-right pr-4">Главный инженер проекта:</td>
                     <td className="py-2">{metadata.designerName}</td>
                  </tr>
                  <tr>
                     <td className="py-2 font-bold text-right pr-4">Дата выпуска:</td>
                     <td className="py-2">{metadata.projectDate}</td>
                  </tr>
               </tbody>
            </table>
         </div>
         
         <div className="text-center text-xs text-slate-400">
            Сгенерировано в SparkFlow Engineering Suite
         </div>
      </div>

      {/* --- Page 1: Floor Plan (New) --- */}
      <div className="print:h-[297mm] print:flex print:flex-col print:justify-between print:page-break-after-always print:pt-5">
        <div className="flex-1 flex flex-col">
            <h3 className="font-bold text-xl mb-2 pt-4 print:pt-0 flex items-center gap-2">
              <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs">1</div>
              План расположения оборудования
            </h3>
            <div className="flex-1 border border-slate-300 print:border-black relative">
               {floorPlanElements.length > 0 ? (
                  <PlanReportView 
                    elements={floorPlanElements} 
                    runs={cableRuns} 
                    walls={walls} 
                    dimensions={roomDimensions} 
                  />
               ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">План не разработан</div>
               )}
            </div>
        </div>
        <GostStamp sheetName="План расположения" sheetNumber={1} />
      </div>

      {/* --- Page 2: Single Line Diagram --- */}
      <div className="print:h-[297mm] print:flex print:flex-col print:justify-between print:page-break-after-always print:pt-5">
        <div>
          <section className="mb-8">
            <h3 className="font-bold text-xl mb-4 print:mb-2 flex items-center gap-2">
              <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs">2</div>
              Однолинейная расчетная схема
            </h3>
            <div className="break-inside-avoid border border-slate-200 rounded-xl overflow-hidden print:border-black print:shadow-none">
              {panelConfig && panelConfig.rows.length > 0 ? (
                 <SingleLineDiagram config={panelConfig} />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-4 print:hidden">
                  <p>Однолинейная схема не сгенерирована.</p>
                  <Link to="/panel-schedule" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Перейти к сборке
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* AI Audit - Visible on screen only */}
          <section className="grid grid-cols-1 gap-6 print:hidden">
            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg shadow-slate-900/20">
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                AI Нормоконтроль
              </h3>
              {isAuditing ? (
                <div className="flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin w-4 h-4"/> Проверяю...</div>
              ) : auditResult ? (
                <>
                  <div className="flex items-baseline gap-4 mb-2">
                     <span className="text-4xl font-bold font-display text-green-400">{auditResult.score}/100</span>
                     <span className="text-slate-400">Рейтинг безопасности</span>
                  </div>
                  <p className="text-sm text-slate-300 mb-4 leading-relaxed opacity-90">{auditResult.summary}</p>
                  {auditResult.missingItems.length > 0 && (
                      <div className="text-xs text-amber-300 bg-amber-900/30 p-2 rounded border border-amber-800">
                        <strong>Добавить:</strong> {auditResult.missingItems.join(', ')}
                      </div>
                  )}
                </>
              ) : (
                 <div className="text-slate-400 text-sm">Нет данных для аудита.</div>
              )}
            </div>
          </section>
        </div>
        <GostStamp sheetName="Схема однолинейная" sheetNumber={2} />
      </div>

      {/* --- Page 3: Panel Labels --- */}
      <div className="print:h-[297mm] print:flex print:flex-col print:justify-between print:page-break-after-always print:pt-5">
        <div>
           <h3 className="font-bold text-xl mb-4 pt-4 print:pt-0 flex items-center gap-2">
              <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs">3</div>
              Маркировка щита (Наклейки)
           </h3>
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
              {panelConfig ? (
                 <PanelLabelStrip config={panelConfig} />
              ) : (
                 <div className="text-slate-400">Щит не сконфигурирован</div>
              )}
           </div>
        </div>
        <GostStamp sheetName="Маркировка щита" sheetNumber={3} />
      </div>

      {/* --- Page 4: Cable Journal --- */}
      <div className="print:h-[297mm] print:flex print:flex-col print:justify-between print:page-break-after-always print:pt-5">
        <div>
           <h3 className="font-bold text-xl mb-4 pt-4 print:pt-0 flex items-center gap-2">
              <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs">4</div>
              Кабельный журнал
           </h3>
           <CableJournal runs={cableRuns} elements={floorPlanElements} />
        </div>
        <GostStamp sheetName="Кабельный журнал" sheetNumber={4} />
      </div>

      {/* --- Page 5: Specification --- */}
      <div className="print:h-[297mm] print:flex print:flex-col print:justify-between print:pt-5">
        <div>
           <h3 className="font-bold text-xl mb-4 pt-4 print:pt-0 flex items-center gap-2">
              <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs">5</div>
              Спецификация оборудования
           </h3>
           <div className="print:border print:border-black">
              <SpecificationTable items={specification} />
           </div>
        </div>
        <GostStamp sheetName="Спецификация" sheetNumber={5} />
      </div>
      
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; }
          .page-break-after-always { page-break-after: always; }
        }
      `}</style>
    </div>
  );
};

export default ReportsPage;
