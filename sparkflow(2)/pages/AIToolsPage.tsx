
import React, { useState } from 'react';
import { ToolType } from '../types';
import LoadAnalyzer from '../components/LoadAnalyzer';
import ComponentSelector from '../components/ComponentSelector';
import ComplianceChecker from '../components/ComplianceChecker';
import PhaseBalanceTool from '../components/PhaseBalanceTool';
import ConduitCalculator from '../components/ConduitCalculator';
import GroundingCalculator from '../components/GroundingCalculator';
import { Activity, ShieldCheck, Zap, Scale, CircleDot, Sprout } from 'lucide-react';

const AIToolsPage: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.LOAD_ANALYZER);

  const TabButton = ({ type, icon: Icon, label }: { type: ToolType, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTool(type)}
      className={`
        flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
        ${activeTool === type 
          ? 'bg-white text-blue-600 shadow-sm' 
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}
      `}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold font-display text-slate-900">Инструменты ИИ</h2>
        <p className="text-slate-500 mt-2">Автоматизация расчетов на базе СП 31-110-2003 и ПУЭ</p>
      </header>

      {/* Tabs - Responsive Scroll */}
      <div className="flex gap-2 mb-8 bg-slate-200/50 p-1 rounded-xl w-full overflow-x-auto no-scrollbar">
        <TabButton type={ToolType.LOAD_ANALYZER} icon={Activity} label="Анализатор" />
        <TabButton type={ToolType.PHASE_BALANCER} icon={Scale} label="Баланс фаз" />
        <TabButton type={ToolType.COMPONENT_SELECTOR} icon={Zap} label="Кабель" />
        <TabButton type={ToolType.CONDUIT_CALCULATOR} icon={CircleDot} label="Трубы" />
        <TabButton type={ToolType.GROUNDING_CALCULATOR} icon={Sprout} label="Заземление" />
        <TabButton type={ToolType.COMPLIANCE_CHECKER} icon={ShieldCheck} label="Нормы" />
      </div>

      {/* Tool Content */}
      <div className="min-h-[500px]">
        {activeTool === ToolType.LOAD_ANALYZER && <LoadAnalyzer />}
        {activeTool === ToolType.PHASE_BALANCER && <PhaseBalanceTool />}
        {activeTool === ToolType.COMPONENT_SELECTOR && <ComponentSelector />}
        {activeTool === ToolType.CONDUIT_CALCULATOR && <ConduitCalculator />}
        {activeTool === ToolType.GROUNDING_CALCULATOR && <GroundingCalculator />}
        {activeTool === ToolType.COMPLIANCE_CHECKER && <ComplianceChecker />}
      </div>
    </div>
  );
};

export default AIToolsPage;
