import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import CableJournal from '../components/CableJournal';
import GostStamp from '../components/GostStamp';
import PanelLabelStrip from '../components/PanelLabelStrip';
import PlanReportView from '../components/PlanReportView';
import SingleLineDiagram from '../components/SingleLineDiagram';
import SpecificationTable from '../components/SpecificationTable';
import { useProject } from '../context/ProjectContext';
import { auditProjectSpecification } from '../services/geminiService';
import { ProjectAuditResult } from '../types';

const ReportsPage: React.FC = () => {
  const {
    panelConfig,
    specification,
    cableRuns,
    floorPlanElements,
    walls,
    roomDimensions,
    projectName,
    metadata,
  } = useProject();
  const [auditResult, setAuditResult] = useState<ProjectAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const hasSpecification = specification.length > 0;

  useEffect(() => {
    setAuditResult(null);
  }, [specification]);

  const handlePrint = () => {
    window.print();
  };

  const handleAudit = async () => {
    if (!hasSpecification || isAuditing) {
      return;
    }

    setIsAuditing(true);
    try {
      const result = await auditProjectSpecification(specification);
      setAuditResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10 p-8 print:m-0 print:max-w-none print:space-y-0 print:bg-white print:p-0 print:w-full">
      <header className="mb-8 flex items-start justify-between print:hidden">
        <div>
          <h2 className="text-3xl font-bold font-display text-slate-900">Проектная документация</h2>
          <p className="mt-2 text-slate-500">Раздел ЭОМ: электроснабжение и освещение</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white shadow-lg shadow-slate-900/20 transition-colors hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" /> Печать / PDF
        </button>
      </header>

      <div className="hidden h-[297mm] flex-col justify-between border border-slate-200 p-10 print:flex print:border-none page-break-after-always">
        <div className="mt-20 text-center">
          <div className="mb-2 text-sm uppercase tracking-widest">{metadata.clientName || 'Заказчик'}</div>
          <h1 className="mb-8 text-4xl font-bold font-display uppercase">{projectName}</h1>
          <div className="mb-20 text-xl text-slate-600">{metadata.projectAddress}</div>

          <div className="inline-block border-y-4 border-black px-10 py-4">
            <h2 className="text-2xl font-bold uppercase">Проект электроснабжения</h2>
            <p className="mt-2 text-sm font-mono">Внутреннее электроосвещение и силовое оборудование</p>
          </div>
        </div>

        <div className="mb-20">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="w-1/2 py-2 pr-4 text-right font-bold">Стадия проектирования:</td>
                <td className="w-1/2 py-2">{metadata.projectStage === 'РД' ? 'Рабочая документация' : 'Эскизный проект'}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-right font-bold">Шифр проекта:</td>
                <td className="py-2">{metadata.projectCode}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-right font-bold">Главный инженер проекта:</td>
                <td className="py-2">{metadata.designerName}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-right font-bold">Дата выпуска:</td>
                <td className="py-2">{metadata.projectDate}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-center text-xs text-slate-400">Сгенерировано в SparkFlow Engineering Suite</div>
      </div>

      <div className="print:h-[297mm] print:flex print:flex-col print:justify-between print:page-break-after-always print:pt-5">
        <div className="flex flex-1 flex-col">
          <h3 className="flex items-center gap-2 pb-2 pt-4 text-xl font-bold print:pt-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs text-white">1</div>
            План расположения оборудования
          </h3>
          <div className="relative flex-1 border border-slate-300 print:border-black">
            {floorPlanElements.length > 0 ? (
              <PlanReportView elements={floorPlanElements} runs={cableRuns} walls={walls} dimensions={roomDimensions} />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">План не разработан</div>
            )}
          </div>
        </div>
        <GostStamp sheetName="План расположения" sheetNumber={1} />
      </div>

      <div className="print:h-[297mm] print:flex print:flex-col print:justify-between print:page-break-after-always print:pt-5">
        <div>
          <section className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold print:mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs text-white">2</div>
              Однолинейная расчётная схема
            </h3>
            <div className="break-inside-avoid overflow-hidden rounded-xl border border-slate-200 print:border-black print:shadow-none">
              {panelConfig && panelConfig.rows.length > 0 ? (
                <SingleLineDiagram config={panelConfig} />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-4 text-slate-500 print:hidden">
                  <p>Однолинейная схема ещё не сгенерирована.</p>
                  <Link to="/panel-schedule" className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                    Перейти к сборке
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 print:hidden">
            <div className="rounded-xl bg-slate-900 p-6 text-white shadow-lg shadow-slate-900/20">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h3 className="flex items-center gap-2 text-lg font-bold font-display">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  AI нормоконтроль
                </h3>
                <button
                  onClick={handleAudit}
                  disabled={!hasSpecification || isAuditing}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAuditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Проверить
                </button>
              </div>

              {isAuditing ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Проверяю...
                </div>
              ) : auditResult ? (
                <>
                  <div className="mb-2 flex items-baseline gap-4">
                    <span className="text-4xl font-bold font-display text-green-400">{auditResult.score}/100</span>
                    <span className="text-slate-400">Рейтинг безопасности</span>
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-slate-300 opacity-90">{auditResult.summary}</p>
                  {auditResult.missingItems.length > 0 && (
                    <div className="rounded border border-amber-800 bg-amber-900/30 p-2 text-xs text-amber-300">
                      <strong>Добавить:</strong> {auditResult.missingItems.join(', ')}
                    </div>
                  )}
                </>
              ) : hasSpecification ? (
                <div className="text-sm text-slate-400">Нажмите «Проверить», чтобы запустить нормоконтроль.</div>
              ) : (
                <div className="text-sm text-slate-400">Нет данных для аудита.</div>
              )}
            </div>
          </section>
        </div>
        <GostStamp sheetName="Схема однолинейная" sheetNumber={2} />
      </div>

      <div className="print:h-[297mm] print:flex print:flex-col print:justify-between print:page-break-after-always print:pt-5">
        <div>
          <h3 className="flex items-center gap-2 pb-4 pt-4 text-xl font-bold print:pt-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs text-white">3</div>
            Маркировка щита
          </h3>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:border-none print:p-0 print:shadow-none">
            {panelConfig ? (
              <PanelLabelStrip config={panelConfig} />
            ) : (
              <div className="text-slate-400">Щит не сконфигурирован</div>
            )}
          </div>
        </div>
        <GostStamp sheetName="Маркировка щита" sheetNumber={3} />
      </div>

      <div className="print:h-[297mm] print:flex print:flex-col print:justify-between print:page-break-after-always print:pt-5">
        <div>
          <h3 className="flex items-center gap-2 pb-4 pt-4 text-xl font-bold print:pt-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs text-white">4</div>
            Кабельный журнал
          </h3>
          <CableJournal runs={cableRuns} elements={floorPlanElements} />
        </div>
        <GostStamp sheetName="Кабельный журнал" sheetNumber={4} />
      </div>

      <div className="print:h-[297mm] print:flex print:flex-col print:justify-between print:pt-5">
        <div>
          <h3 className="flex items-center gap-2 pb-4 pt-4 text-xl font-bold print:pt-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs text-white">5</div>
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
