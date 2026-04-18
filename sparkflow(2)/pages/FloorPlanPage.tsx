
import React from 'react';
import FloorPlanEditor from '../components/FloorPlanEditor';

const FloorPlanPage: React.FC = () => {
  return (
    <div className="p-6 h-screen flex flex-col">
      <header className="mb-4">
        <h2 className="text-2xl font-bold font-display text-slate-900">Поэтажный план</h2>
        <p className="text-slate-500 text-sm">Проектирование размещения электроточек (ГОСТ 21.608-84)</p>
      </header>
      <div className="flex-1 min-h-0">
        <FloorPlanEditor />
      </div>
    </div>
  );
};

export default FloorPlanPage;
