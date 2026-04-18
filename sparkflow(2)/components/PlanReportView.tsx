
import React from 'react';
import { PlanElement, CableRun, Wall, RoomDimensions } from '../types';
import { Zap, ToggleLeft, Lightbulb, Monitor } from 'lucide-react';

interface PlanReportViewProps {
  elements: PlanElement[];
  runs: CableRun[];
  walls: Wall[];
  dimensions: RoomDimensions;
}

const PlanReportView: React.FC<PlanReportViewProps> = ({ elements, runs, walls, dimensions }) => {
  
  // Helper to render specific icons strictly via SVG for print consistency
  const renderIcon = (type: string, color: string) => {
    switch (type) {
      case 'socket': 
        return <path d="M13 2L3 14h9v8l10-12h-9l9-8z" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="scale(0.8) translate(4,4)"/>;
      case 'switch':
        return <rect x="2" y="6" width="20" height="12" rx="6" fill="none" stroke={color} strokeWidth="2" transform="scale(0.8) translate(4,4)"/>;
      case 'light':
        return <path d="M12 2v20M2 12h20" stroke={color} strokeWidth="2" transform="scale(0.7) translate(6,6)"/>; // Simple cross/bulb
      case 'db':
        return <rect x="2" y="2" width="20" height="20" fill="#fee2e2" stroke="red" strokeWidth="2" />;
      default:
        return <circle cx="12" cy="12" r="6" stroke={color} fill="none" strokeWidth="2"/>;
    }
  };

  const getPath = (x1: number, y1: number, x2: number, y2: number, type: string) => {
      // Simple orthogonal or direct line logic for print view
      // For print, cleaner direct lines often look better unless we have full A* routing
      // converting percentages to relative coordinates
      return `M ${x1} ${y1} L ${x2} ${y2}`;
  };

  return (
    <div className="w-full h-full relative bg-white overflow-hidden">
       {/* SVG Container ensuring A4 fit behavior via viewBox */}
       <svg 
         viewBox="0 0 100 100" 
         preserveAspectRatio="xMidYMid meet" 
         className="w-full h-full"
         style={{ maxHeight: '240mm' }} // Constraint for title block
       >
          {/* 1. Grid / Background (Optional, skipped for clean print) */}

          {/* 2. Walls */}
          {walls.map(w => (
             <line 
               key={w.id}
               x1={w.x1} y1={w.y1}
               x2={w.x2} y2={w.y2}
               stroke="black"
               strokeWidth="1.5"
               strokeLinecap="square"
             />
          ))}

          {/* 3. Cables */}
          {runs.map(run => {
            const start = elements.find(e => e.id === run.fromId);
            const end = elements.find(e => e.id === run.toId);
            if (!start || !end) return null;

            const color = run.type === 'light' ? '#f59e0b' : '#2563eb';
            const dash = run.type === 'light' ? '1, 1' : '';

            return (
               <path
                 key={run.id}
                 d={getPath(start.x, start.y, end.x, end.y, run.type)}
                 stroke={color}
                 strokeWidth="0.3"
                 fill="none"
                 strokeDasharray={dash}
                 opacity="0.6"
               />
            );
          })}

          {/* 4. Elements */}
          {elements.map(el => {
             if (el.type === 'door' || el.type === 'window') {
                 // Simplified Arch for print
                 return (
                    <g key={el.id} transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0})`}>
                        {el.type === 'door' && <path d="M-4 4 L-4 -4 A 8 8 0 0 1 4 4" fill="none" stroke="#78350f" strokeWidth="0.5" />}
                        {el.type === 'window' && <rect x="-4" y="-1" width="8" height="2" fill="white" stroke="#3b82f6" strokeWidth="0.3" />}
                    </g>
                 );
             }

             const color = el.type === 'light' ? '#d97706' : el.type === 'socket' ? '#1d4ed8' : '#000';
             
             return (
                <g key={el.id} transform={`translate(${el.x}, ${el.y})`}>
                   {/* Label */}
                   {el.circuitId && (
                      <text y="-3" textAnchor="middle" fontSize="2" fill="#475569" fontWeight="bold">{el.circuitId}</text>
                   )}
                   
                   {/* Icon wrapper */}
                   <g transform={`rotate(${el.rotation || 0}) translate(-2, -2)`}>
                      <svg width="4" height="4" viewBox="0 0 24 24">
                         {renderIcon(el.type, color)}
                      </svg>
                   </g>
                </g>
             );
          })}
       </svg>

       {/* Legend */}
       <div className="absolute bottom-0 left-0 bg-white border border-black p-2 text-[8px] flex gap-4">
          <div className="flex items-center gap-1"><Zap className="w-3 h-3 text-blue-600"/> Розетки (220В)</div>
          <div className="flex items-center gap-1"><Lightbulb className="w-3 h-3 text-amber-600"/> Освещение</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 border border-red-500 bg-red-100"></div> Электрощит</div>
          <div className="flex items-center gap-1"><span className="text-blue-500 font-bold">───</span> Силовая линия</div>
          <div className="flex items-center gap-1"><span className="text-amber-500 font-bold">- - -</span> Линия света</div>
       </div>
    </div>
  );
};

export default PlanReportView;
