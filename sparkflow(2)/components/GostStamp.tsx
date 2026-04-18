
import React from 'react';
import { useProject } from '../context/ProjectContext';

interface GostStampProps {
  sheetName?: string;
  sheetNumber?: number;
}

const GostStamp: React.FC<GostStampProps> = ({ sheetName = 'План', sheetNumber = 1 }) => {
  const { projectName, metadata } = useProject();

  return (
    <div className="hidden print:block w-full border-2 border-black mt-auto text-[10px] font-sans break-inside-avoid">
      {/* Main Grid */}
      <div className="grid grid-cols-[10mm_10mm_10mm_15mm_15mm_20mm_20mm_1fr] border-b border-black">
        {/* Row 1 - Headers */}
        <div className="border-r border-black p-1 text-center italic">Изм.</div>
        <div className="border-r border-black p-1 text-center italic">Лист</div>
        <div className="border-r border-black p-1 text-center italic">№док.</div>
        <div className="border-r border-black p-1 text-center italic">Подп.</div>
        <div className="border-r border-black p-1 text-center italic">Дата</div>
        <div className="border-r border-black p-1"></div>
        <div className="border-r border-black p-1"></div>
        <div className="p-1 px-2 font-bold text-lg leading-none flex items-center">{metadata.projectCode}</div>
      </div>

      <div className="grid grid-cols-[80mm_1fr] min-h-[40mm]">
        {/* Left Side: Roles */}
        <div className="border-r border-black grid grid-rows-4">
           <div className="grid grid-cols-[20mm_25mm_15mm_20mm] border-b border-black h-[5mm]">
              <div className="border-r border-black pl-1 flex items-center">Разраб.</div>
              <div className="border-r border-black pl-1 flex items-center font-medium overflow-hidden whitespace-nowrap">{metadata.designerName}</div>
              <div className="border-r border-black"></div>
              <div className="pl-1 flex items-center">{metadata.projectDate.slice(5)}</div>
           </div>
           <div className="grid grid-cols-[20mm_25mm_15mm_20mm] border-b border-black h-[5mm]">
              <div className="border-r border-black pl-1 flex items-center">Пров.</div>
              <div className="border-r border-black"></div>
              <div className="border-r border-black"></div>
              <div className=""></div>
           </div>
           <div className="grid grid-cols-[20mm_25mm_15mm_20mm] border-b border-black h-[5mm]">
              <div className="border-r border-black pl-1 flex items-center">Т.контр.</div>
              <div className="border-r border-black"></div>
              <div className="border-r border-black"></div>
              <div className=""></div>
           </div>
           <div className="grid grid-cols-[20mm_25mm_15mm_20mm] h-[5mm]">
              <div className="border-r border-black pl-1 flex items-center">Н.контр.</div>
              <div className="border-r border-black"></div>
              <div className="border-r border-black"></div>
              <div className=""></div>
           </div>
        </div>

        {/* Right Side: Titles */}
        <div className="grid grid-rows-[1fr_1fr_10mm]">
           {/* Project Title */}
           <div className="border-b border-black p-2 flex items-center justify-center text-center font-bold text-sm leading-tight">
             {projectName} <br/> {metadata.projectAddress}
           </div>
           {/* Sheet Name */}
           <div className="border-b border-black p-2 flex items-center justify-center text-center font-medium">
             {sheetName}
           </div>
           {/* Bottom Row: Stage, Sheet, Sheets */}
           <div className="grid grid-cols-[15mm_20mm_1fr]">
              <div className="border-r border-black flex flex-col items-center justify-center">
                 <span className="text-[8px] italic -mt-1">Стадия</span>
                 <span className="font-bold">{metadata.projectStage}</span>
              </div>
              <div className="border-r border-black flex flex-col items-center justify-center">
                 <span className="text-[8px] italic -mt-1">Лист</span>
                 <span className="font-bold">{sheetNumber}</span>
              </div>
              <div className="flex flex-col items-center justify-center pl-2 items-start">
                 <span className="text-[8px] italic -mt-1">Листов</span>
                 <span className="font-bold">15</span>
              </div>
           </div>
        </div>
      </div>
       <div className="border-t border-black p-1 text-center font-bold">
          {metadata.clientName || 'SparkFlow Engineering'}
       </div>
    </div>
  );
};

export default GostStamp;
