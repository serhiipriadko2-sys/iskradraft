
import React from 'react';
import PanelScheduleEditor from '../components/PanelScheduleEditor';

const PanelSchedulePage: React.FC = () => {
  return (
    <div className="p-6 h-screen flex flex-col">
      <header className="mb-4">
        <h2 className="text-2xl font-bold font-display text-slate-900">Компоновка Щита (ЩРн)</h2>
        <p className="text-slate-500 text-sm">Автоматическая сборка схемы щита по нагрузкам (ГОСТ 32395-2013)</p>
      </header>
      <div className="flex-1 min-h-0">
        <PanelScheduleEditor />
      </div>
    </div>
  );
};

export default PanelSchedulePage;
