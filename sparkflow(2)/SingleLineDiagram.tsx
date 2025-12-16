
import React, { useRef } from 'react';
import { PanelConfig, PanelModule } from '../types';
import { Download, Info } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface SingleLineDiagramProps {
  config: PanelConfig;
}

// Structure for Hierarchical Rendering
interface GroupNode {
  id: string;
  rcd?: PanelModule; // The parent RCD (optional)
  breakers: PanelModule[]; // Children
  width: number; // Visual width units
}

const SingleLineDiagram: React.FC<SingleLineDiagramProps> = ({ config }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { floorPlanElements, cableRuns } = useProject();
  
  // --- Data Helpers ---
  const getCircuitStats = (circuitId: string) => {
    // Find elements on this circuit
    const elements = floorPlanElements.filter(e => e.circuitId === circuitId);
    if (elements.length === 0) return null;

    const power = elements.reduce((sum, e) => sum + (e.power || 0), 0);
    
    // Calculate length (Approximation: sum of all cable runs connected to these elements)
    // Note: This sums all segments. 
    const elementIds = new Set(elements.map(e => e.id));
    const length = cableRuns
      .filter(r => elementIds.has(r.fromId) || elementIds.has(r.toId))
      .reduce((sum, r) => sum + r.length, 0);

    // Determine cable type based on majority of elements
    const isLighting = elements.some(e => e.type === 'light');
    const isHeavy = elements.some(e => e.power && e.power > 3.0);
    const cable = isHeavy ? '3x4.0' : isLighting ? '3x1.5' : '3x2.5';

    return { power, length, cable, count: elements.length };
  };

  // 1. Parse Logic: Transform flat rows into hierarchical groups
  const parseHierarchy = (): { input: PanelModule | null, groups: GroupNode[] } => {
    const groups: GroupNode[] = [];
    let inputModule: PanelModule | null = null;

    // Temporary bucket for breakers that are directly on the main bus (no RCD)
    let directBreakers: PanelModule[] = [];

    config.rows.forEach(row => {
      let currentRCD: PanelModule | null = null;
      let currentRCDBreakers: PanelModule[] = [];

      row.modules.forEach(mod => {
        // Identify Input
        if (!inputModule && (mod.type === 'switch_3p' || mod.name.toLowerCase().includes('ввод'))) {
          inputModule = mod;
          return;
        }

        if (mod.type === 'rcd' || mod.type === 'diff') {
          // If we were collecting for a previous RCD, push that group
          if (currentRCD) {
            groups.push({ 
              id: currentRCD.id, 
              rcd: currentRCD, 
              breakers: currentRCDBreakers, 
              width: Math.max(1, currentRCDBreakers.length) 
            });
          } else {
            // Flush direct breakers if any before this RCD
            if (directBreakers.length > 0) {
               groups.push({ id: `direct-${Math.random()}`, breakers: [...directBreakers], width: directBreakers.length });
               directBreakers = [];
            }
          }
          
          // Start new RCD group
          currentRCD = mod;
          currentRCDBreakers = [];
          
          // Logic for Diff (RCBO):
          // If it's a Diff, it often acts as a standalone breaker+RCD. 
          // We can treat it as an RCD with NO children in this logic, 
          // but we want to render line info for it.
          // For SLD visualization, we'll keep it as an RCD Group.
          
        } else if (mod.type.startsWith('breaker')) {
          if (currentRCD) {
            currentRCDBreakers.push(mod);
          } else {
            directBreakers.push(mod);
          }
        }
      });

      // End of row cleanup
      if (currentRCD) {
        groups.push({ 
          id: currentRCD.id, 
          rcd: currentRCD, 
          breakers: currentRCDBreakers, 
          width: Math.max(1, currentRCDBreakers.length) 
        });
      } else if (directBreakers.length > 0) {
         groups.push({ id: `direct-${Math.random()}`, breakers: [...directBreakers], width: directBreakers.length });
         directBreakers = [];
      }
    });

    // Catch-all for direct breakers at end
    if (directBreakers.length > 0) {
       groups.push({ id: `direct-end`, breakers: [...directBreakers], width: directBreakers.length });
    }

    return { input: inputModule, groups };
  };

  const { input, groups } = parseHierarchy();

  // Layout Constants
  const START_X = 120;
  const MODULE_WIDTH = 70; // Wider for text
  const GROUP_GAP = 40;
  const BUS_Y = 220;
  const SUB_BUS_Y = 320;
  const BREAKER_Y = 360;
  const RCD_Y = 270;
  const LINE_INFO_START_Y = 420; // Where line annotations start
  
  // Calculate Total Width
  let totalWidth = 0;
  groups.forEach(g => {
     totalWidth += (Math.max(g.breakers.length, 1) * MODULE_WIDTH) + GROUP_GAP;
  });
  
  const CANVAS_WIDTH = Math.max(800, START_X + totalWidth + 100);
  const CANVAS_HEIGHT = 600; // Increased for annotations

  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "single_line_diagram.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderModuleBox = (mod: PanelModule, x: number, y: number, color: string = 'white', stroke: string = '#334155') => (
    <g>
      <rect x={x - 20} y={y} width="40" height="30" rx="2" fill={color} stroke={stroke} strokeWidth="1.5" />
      <text x={x} y={y + 15} textAnchor="middle" fontSize="9" fontWeight="500" fill="#1e293b" style={{pointerEvents:'none'}}>
        {mod.name.substring(0, 8)}
      </text>
      <text x={x} y={y + 26} textAnchor="middle" fontSize="8" fill="#64748b" style={{pointerEvents:'none'}}>
        {mod.rating}
      </text>
    </g>
  );

  const renderLineInfo = (mod: PanelModule, x: number, y: number) => {
    const stats = getCircuitStats(mod.name);
    
    // Draw vertical line extension
    const endY = y + 120;
    
    return (
      <g>
        <line x1={x} y1={y} x2={x} y2={endY} stroke="#94a3b8" strokeWidth="1" />
        
        {/* Load Info Block */}
        {stats ? (
          <g transform={`translate(${x + 4}, ${y + 10})`}>
            {/* Cable */}
            <text x="0" y="0" fontSize="9" fontFamily="monospace" fill="#0f172a" transform="rotate(90, 0, 0)">
              {stats.cable}
            </text>
             {/* Length */}
            <text x="0" y="50" fontSize="9" fontFamily="monospace" fill="#475569" transform="rotate(90, 0, 50)">
              L={stats.length.toFixed(0)}м
            </text>
            {/* Power */}
            <text x="0" y="90" fontSize="9" fontWeight="bold" fill="#0f172a" transform="rotate(90, 0, 90)">
              P={stats.power.toFixed(2)}kW
            </text>
            
            {/* Consumer Count Indicator */}
            <circle cx="-4" cy="115" r="8" fill="#f1f5f9" stroke="#cbd5e1" />
            <text x="-4" y="118" textAnchor="middle" fontSize="8" fill="#64748b">{stats.count}</text>
          </g>
        ) : (
          <text x={x+4} y={y+20} fontSize="8" fill="#cbd5e1" transform="rotate(90, 0, 0)">Резерв</text>
        )}
      </g>
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h3 className="font-display font-semibold text-slate-900">Однолинейная Схема (ГОСТ 2.702-2011)</h3>
           <p className="text-xs text-slate-500">Автоматически дополнена данными по нагрузкам и длинам кабелей</p>
        </div>
        <button 
          onClick={handleDownloadSVG}
          className="flex items-center gap-2 text-slate-600 hover:text-blue-600 text-sm font-medium transition-colors border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
        >
          <Download className="w-4 h-4" /> Скачать SVG
        </button>
      </div>
      
      <div className="overflow-x-auto pb-4">
        <svg ref={svgRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-white" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
            </marker>
          </defs>

          {/* --- Input Section --- */}
          <g transform="translate(50, 0)">
            <line x1="50" y1="20" x2="50" y2="80" stroke="#0f172a" strokeWidth="3" />
            <text x="60" y="50" fontSize="12" fill="#64748b">Ввод</text>
            
            {/* Input Device */}
            {renderModuleBox(input || {name: 'Ввод', rating: '40A', type:'switch_3p', id:'in', width:3}, 50, 80, '#f1f5f9')}
            
            <line x1="50" y1="110" x2="50" y2={BUS_Y} stroke="#0f172a" strokeWidth="3" />
          </g>

          {/* --- Main Busbar --- */}
          <line x1="80" y1={BUS_Y} x2={CANVAS_WIDTH - 50} y2={BUS_Y} stroke="#0f172a" strokeWidth="4" />
          <text x="100" y={BUS_Y - 10} fontSize="12" fontWeight="bold" fill="#334155">ГРЩ Шина 0.4кВ</text>

          {/* --- Groups Rendering --- */}
          {(() => {
            let currentX = START_X;
            
            return groups.map((group) => {
              const groupWidthPx = Math.max(group.breakers.length, 1) * MODULE_WIDTH;
              const groupCenterX = currentX + (groupWidthPx / 2) - (MODULE_WIDTH / 2);
              
              const render = (
                 <g key={group.id}>
                    {/* Case A: RCD Protected Group */}
                    {group.rcd ? (
                       <g>
                          {/* RCD Connection to Main Bus */}
                          <line x1={groupCenterX} y1={BUS_Y} x2={groupCenterX} y2={RCD_Y} stroke="#3b82f6" strokeWidth="2" />
                          {/* RCD Device */}
                          {renderModuleBox(group.rcd, groupCenterX, RCD_Y, '#eff6ff', '#3b82f6')}
                          
                          {/* Info Line for RCD itself (if it's a Diff) */}
                          {group.breakers.length === 0 && (
                             <g>
                                <line x1={groupCenterX} y1={RCD_Y+30} x2={groupCenterX} y2={RCD_Y+50} stroke="#64748b" strokeWidth="1" markerEnd="url(#arrow)"/>
                                {renderLineInfo(group.rcd, groupCenterX, RCD_Y+50)}
                             </g>
                          )}

                          {/* Sub-Bus under RCD */}
                          {group.breakers.length > 0 && (
                             <g>
                                <line x1={groupCenterX} y1={RCD_Y + 30} x2={groupCenterX} y2={SUB_BUS_Y} stroke="#3b82f6" strokeWidth="2" />
                                <line 
                                  x1={currentX} 
                                  y1={SUB_BUS_Y} 
                                  x2={currentX + (group.breakers.length - 1) * MODULE_WIDTH} 
                                  y2={SUB_BUS_Y} 
                                  stroke="#3b82f6" 
                                  strokeWidth="2" 
                                />
                                <circle cx={groupCenterX} cy={SUB_BUS_Y} r="3" fill="#3b82f6" />
                                <text x={currentX} y={SUB_BUS_Y-5} fontSize="8" fill="#3b82f6">Групповая УЗО</text>
                                
                                {/* Child Breakers */}
                                {group.breakers.map((brk, idx) => {
                                   const bx = currentX + (idx * MODULE_WIDTH);
                                   return (
                                     <g key={brk.id}>
                                        <line x1={bx} y1={SUB_BUS_Y} x2={bx} y2={BREAKER_Y} stroke="#3b82f6" strokeWidth="1.5" />
                                        {renderModuleBox(brk, bx, BREAKER_Y)}
                                        {/* Arrow out */}
                                        <line x1={bx} y1={BREAKER_Y+30} x2={bx} y2={BREAKER_Y+50} stroke="#64748b" strokeWidth="1" markerEnd="url(#arrow)"/>
                                        {/* Line Info */}
                                        {renderLineInfo(brk, bx, BREAKER_Y+50)}
                                     </g>
                                   );
                                })}
                             </g>
                          )}
                       </g>
                    ) : (
                       // Case B: Direct Breakers (No RCD)
                       <g>
                          {group.breakers.map((brk, idx) => {
                             const bx = currentX + (idx * MODULE_WIDTH);
                             return (
                               <g key={brk.id}>
                                  <line x1={bx} y1={BUS_Y} x2={bx} y2={BREAKER_Y} stroke="#334155" strokeWidth="2" />
                                  <circle cx={bx} cy={BUS_Y} r="3" fill="#334155" />
                                  {renderModuleBox(brk, bx, BREAKER_Y)}
                                  <line x1={bx} y1={BREAKER_Y+30} x2={bx} y2={BREAKER_Y+50} stroke="#64748b" strokeWidth="1" markerEnd="url(#arrow)"/>
                                  {renderLineInfo(brk, bx, BREAKER_Y+50)}
                               </g>
                             );
                          })}
                       </g>
                    )}
                 </g>
              );

              // Advance X
              currentX += groupWidthPx + GROUP_GAP;
              return render;
            });
          })()}

        </svg>
      </div>
      
      <div className="mt-4 flex gap-6 justify-center text-xs text-slate-500 border-t border-slate-100 pt-4">
         <div className="flex items-center gap-2"><div className="w-3 h-3 border border-slate-500 bg-white"></div> Автомат (MCB)</div>
         <div className="flex items-center gap-2"><div className="w-3 h-3 border border-blue-500 bg-blue-50"></div> УЗО / Диф (RCD)</div>
         <div className="flex items-center gap-2 ml-4"><span className="font-mono">P=2.1kW</span> Расчетная мощность</div>
         <div className="flex items-center gap-2"><span className="font-mono">L=45м</span> Длина линии (трасса)</div>
      </div>
    </div>
  );
};

export default SingleLineDiagram;
