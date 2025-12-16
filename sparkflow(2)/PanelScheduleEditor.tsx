
import React, { useState, useEffect, useMemo } from 'react';
import { Zap, RefreshCcw, Box, Wand2, Plus, Trash2, X, Layout, ChevronLeft, ChevronRight, AlertCircle, Printer, FileText, Cable, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PanelConfig, PanelModule, ModuleType, BusbarType } from '../types';
import { generatePanelLayout } from '../services/geminiService';
import { useProject } from '../context/ProjectContext';
import { calculateVoltageDrop, calculateShortCircuitCurrent } from '../utils/electricalFormulas';

const PanelScheduleEditor: React.FC = () => {
  const { panelConfig, setPanelConfig, floorPlanElements, cableRuns, renameCircuit } = useProject();
  const [description, setDescription] = useState('Квартира 3 комнатная. Электроплита, 2 кондиционера, стиралка в ванной, бойлер. Свет и розетки раздельно.');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [config, setConfig] = useState<PanelConfig>({ rows: [], enclosureSize: 36 });
  const [editingModule, setEditingModule] = useState<{rowIdx: number, modIdx: number, data: PanelModule} | null>(null);

  useEffect(() => {
    if (panelConfig) {
      setConfig(panelConfig);
    }
  }, [panelConfig]);

  const syncToContext = (newConfig: PanelConfig) => {
    setConfig(newConfig);
    setPanelConfig(newConfig);
  };

  // --- Statistics & Calculations ---

  const getModuleStats = (modName: string, modRating: string) => {
     const elements = floorPlanElements.filter(e => e.circuitId === modName);
     const totalPower = elements.reduce((sum, e) => sum + (e.power || (e.type === 'light' ? 0.1 : 3.5)), 0);
     const totalCurrent = (totalPower * 1000) / 230; // approx single phase
     
     // Calculate Cable Stats (Approximate)
     // Filter runs that involve these elements
     const elIds = new Set(elements.map(e => e.id));
     const involvedRuns = cableRuns.filter(r => elIds.has(r.fromId) || elIds.has(r.toId));
     const totalLength = involvedRuns.reduce((sum, r) => sum + r.length, 0);
     
     // Max distance (approx depth)
     let maxDist = 0;
     // Simple find max single run for now, proper depth requires graph traversal
     if (involvedRuns.length > 0) {
        maxDist = Math.max(...involvedRuns.map(r => r.length));
     }

     // Voltage Drop
     const section = elements.some(e => e.type === 'light') ? 1.5 : 2.5; // Guess based on type
     const dU = calculateVoltageDrop(maxDist, totalPower, 230, section);
     
     // Protection
     const ratingVal = parseInt(modRating.match(/\d+/)?.[0] || "16");
     const isOverload = totalCurrent > ratingVal;
     
     return { elements, totalPower, totalCurrent, totalLength, dU, isOverload, section };
  };

  const getModuleLoad = (modName: string) => {
    return getModuleStats(modName, "16A").totalPower;
  };

  // Live Phase Load Calculation
  const phaseStats = useMemo(() => {
    const stats = { L1: 0, L2: 0, L3: 0 };
    
    config.rows.forEach(row => {
        let phaseIndex = 0; // For Comb Busbar tracking
        
        row.modules.forEach(mod => {
           const load = getModuleLoad(mod.name);
           
           if (mod.type === 'breaker_3p' || mod.type === 'switch_3p') {
              stats.L1 += load / 3;
              stats.L2 += load / 3;
              stats.L3 += load / 3;
              phaseIndex += 3;
           } else if (mod.type.startsWith('breaker') || mod.type === 'diff' || mod.type === 'rcd') {
              let activePhase: 'L1' | 'L2' | 'L3' = 'L1';
              
              if (row.busType === 'L1') activePhase = 'L1';
              else if (row.busType === 'L2') activePhase = 'L2';
              else if (row.busType === 'L3') activePhase = 'L3';
              else {
                  const remainder = phaseIndex % 3;
                  if (remainder === 0) activePhase = 'L1';
                  if (remainder === 1) activePhase = 'L2';
                  if (remainder === 2) activePhase = 'L3';
              }
              
              stats[activePhase] += load;
              phaseIndex += mod.width;
           } else {
               phaseIndex += mod.width;
           }
        });
    });
    
    return stats;
  }, [config, floorPlanElements]);

  const maxPhaseLoad = Math.max(phaseStats.L1, phaseStats.L2, phaseStats.L3, 1);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generatePanelLayout(description);
      syncToContext(result);
    } catch (e) {
      alert("Ошибка генерации щита.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSyncFromPlan = () => {
    const circuitIds = Array.from(new Set(floorPlanElements.map(el => el.circuitId).filter(Boolean))) as string[];
    
    if (circuitIds.length === 0) {
      alert("На плане не назначены группы (Circuit IDs).");
      return;
    }

    const newConfig = { ...config };
    if (newConfig.rows.length === 0) {
      newConfig.rows.push({ id: Date.now().toString(), modules: [] });
    }

    let addedCount = 0;
    const existingNames = new Set(newConfig.rows.flatMap(r => r.modules).map(m => m.name));

    circuitIds.forEach(cid => {
      if (!existingNames.has(cid)) {
        const targetRow = newConfig.rows[newConfig.rows.length - 1];
        // Guess type
        const isLight = floorPlanElements.some(e => e.circuitId === cid && e.type === 'light');
        const rating = isLight ? '10A' : '16A';
        
        targetRow.modules.push({
          id: `auto-${Date.now()}-${Math.random()}`,
          type: 'breaker_1p',
          name: cid,
          rating: rating,
          width: 1
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      syncToContext(newConfig);
      alert(`Добавлено ${addedCount} автоматов из плана.`);
    } else {
      alert("Все группы с плана уже есть в щите.");
    }
  };

  // --- Actions ---
  
  const addRow = () => {
    const newConfig = { ...config, rows: [...config.rows, { id: Date.now().toString(), modules: [], busType: 'comb_3p' as BusbarType }] };
    syncToContext(newConfig);
  };

  const deleteRow = (rowIdx: number) => {
    const newConfig = { ...config, rows: config.rows.filter((_, idx) => idx !== rowIdx) };
    syncToContext(newConfig);
  };
  
  const updateRowBusType = (rowIdx: number, type: BusbarType) => {
     const newRows = [...config.rows];
     newRows[rowIdx] = { ...newRows[rowIdx], busType: type };
     syncToContext({ ...config, rows: newRows });
  };

  const addModule = (rowIdx: number, type: ModuleType) => {
    const newModule: PanelModule = {
      id: Date.now().toString(),
      type: type,
      name: type === 'breaker_1p' ? 'Группа' : 'Устройство',
      rating: type.includes('breaker') ? '16A' : '40A',
      width: type === 'breaker_1p' ? 1 : type === 'breaker_3p' ? 3 : type === 'rcd' ? 2 : type === 'meter' ? 4 : 2,
    };
    const newRows = [...config.rows];
    newRows[rowIdx].modules.push(newModule);
    syncToContext({ ...config, rows: newRows });
  };

  const deleteModule = (rowIdx: number, modIdx: number) => {
    const newRows = [...config.rows];
    newRows[rowIdx].modules.splice(modIdx, 1);
    syncToContext({ ...config, rows: newRows });
    setEditingModule(null);
  };

  const moveModule = (rowIdx: number, modIdx: number, direction: 'left' | 'right') => {
    const newRows = [...config.rows];
    const modules = newRows[rowIdx].modules;
    
    if (direction === 'left' && modIdx > 0) {
      [modules[modIdx], modules[modIdx - 1]] = [modules[modIdx - 1], modules[modIdx]];
    } else if (direction === 'right' && modIdx < modules.length - 1) {
      [modules[modIdx], modules[modIdx + 1]] = [modules[modIdx + 1], modules[modIdx]];
    } else {
      return; 
    }
    syncToContext({ ...config, rows: newRows });
  };

  const updateModule = () => {
    if (!editingModule) return;
    
    // Check if name changed to trigger renameCircuit
    const originalName = config.rows[editingModule.rowIdx].modules[editingModule.modIdx].name;
    const newName = editingModule.data.name;
    
    if (originalName !== newName) {
        renameCircuit(originalName, newName);
    }

    const newRows = [...config.rows];
    newRows[editingModule.rowIdx].modules[editingModule.modIdx] = editingModule.data;
    syncToContext({ ...config, rows: newRows });
    setEditingModule(null);
  };

  // --- Visuals ---

  const getModuleColor = (type: string) => {
    switch(type) {
      case 'switch_3p': return 'bg-red-500 text-white';
      case 'rcd': return 'bg-blue-600 text-white';
      case 'diff': return 'bg-indigo-500 text-white';
      case 'relay': return 'bg-amber-500 text-white';
      case 'meter': return 'bg-slate-800 text-green-400';
      default: return 'bg-white border-slate-300 text-slate-900';
    }
  };

  const getModulePhase = (row: any, mod: PanelModule, slotIndex: number): string | null => {
      if (mod.type === 'breaker_3p' || mod.type === 'switch_3p' || mod.type === 'relay') return '3P';
      if (!mod.type.startsWith('breaker') && mod.type !== 'rcd' && mod.type !== 'diff') return null;
      
      if (row.busType === 'L1') return 'L1';
      if (row.busType === 'L2') return 'L2';
      if (row.busType === 'L3') return 'L3';
      
      const rem = slotIndex % 3;
      if (rem === 0) return 'L1';
      if (rem === 1) return 'L2';
      return 'L3';
  };

  const palette: {type: ModuleType, label: string, width: number}[] = [
    { type: 'switch_3p', label: 'Рубильник 3P', width: 3 },
    { type: 'meter', label: 'Счетчик', width: 4 },
    { type: 'relay', label: 'Реле напр.', width: 2 },
    { type: 'rcd', label: 'УЗО 2P', width: 2 },
    { type: 'diff', label: 'Диф. авт', width: 2 },
    { type: 'breaker_1p', label: 'Авт. 1P', width: 1 },
    { type: 'breaker_3p', label: 'Авт. 3P', width: 3 },
  ];

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      {/* Config Panel */}
      <div className="w-80 flex flex-col gap-4 overflow-y-auto pb-20">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-600" />
            Авто-сборка (AI)
          </h3>
          <textarea 
            className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm mb-3 resize-none outline-none focus:border-purple-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите нагрузки..."
          />
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            {isGenerating ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4" />}
            Собрать щит
          </button>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
          <button 
            onClick={handleSyncFromPlan}
            className="w-full py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 flex items-center justify-center gap-2 transition-colors"
          >
            <Layout className="w-4 h-4" />
            Синхр. с Планом
          </button>
        </div>

        {config.rows.length > 0 && (
           <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg flex-shrink-0 text-white">
             <div className="text-xs text-slate-400 uppercase font-bold mb-2">Готовность</div>
             <Link 
               to="/reports"
               className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 flex items-center justify-center gap-2 transition-colors"
             >
               <Printer className="w-4 h-4" />
               Печать Наклеек
             </Link>
           </div>
        )}

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1">
          <h3 className="font-display font-semibold mb-4">Палитра</h3>
          <div className="grid grid-cols-2 gap-2">
            {palette.map(p => (
              <button 
                key={p.type}
                onClick={() => {
                   if(config.rows.length === 0) addRow();
                   const targetRow = config.rows.length > 0 ? config.rows.length - 1 : 0;
                   addModule(targetRow, p.type); 
                }}
                className="flex flex-col items-center p-2 border border-slate-100 rounded hover:bg-slate-50 text-center transition-colors"
              >
                <div className={`w-8 h-4 mb-1 rounded-sm ${getModuleColor(p.type)} opacity-80 border border-black/10`}></div>
                <span className="text-[10px] font-medium text-slate-600">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visualization Area */}
      <div className="flex-1 flex flex-col gap-4 h-full min-w-0">
         {/* Live Stats Header */}
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-6 items-center flex-shrink-0">
             <div className="text-sm font-bold text-slate-600 uppercase tracking-wider">Баланс фаз</div>
             
             {['L1', 'L2', 'L3'].map((phase, idx) => {
                 const load = phaseStats[phase as keyof typeof phaseStats];
                 const colors = ['bg-amber-500', 'bg-emerald-500', 'bg-red-500'];
                 const widthPct = maxPhaseLoad > 0 ? (load / maxPhaseLoad) * 100 : 0;
                 return (
                    <div key={phase} className="flex-1 flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                           <span>{phase}</span>
                           <span>{load.toFixed(1)} кВт</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                           <div className={`h-full ${colors[idx]} transition-all duration-300`} style={{width: `${widthPct}%`}}></div>
                        </div>
                    </div>
                 );
             })}
         </div>

         {/* Enclosure Editor */}
         <div className="flex-1 bg-slate-100 rounded-xl p-8 overflow-auto flex flex-col items-center shadow-inner relative">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px)', backgroundSize: '100% 20px' }} />

            <div className="bg-white border-4 border-slate-300 rounded-lg shadow-2xl p-4 min-w-[600px] max-w-4xl relative">
              <div className="absolute top-0 left-0 w-full h-full bg-slate-50 opacity-50 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col gap-8">
                {config.rows.length === 0 ? (
                   <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                      <Box className="w-12 h-12 mb-2 opacity-50" />
                      <p>Щит пуст. Сгенерируйте или добавьте ряд.</p>
                      <button onClick={addRow} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm hover:bg-blue-700">
                        <Plus className="w-4 h-4" /> Добавить DIN-рейку
                      </button>
                   </div>
                ) : (
                  config.rows.map((row, rIdx) => {
                    let rowSlotIndex = 0;
                    return (
                    <div key={row.id} className="relative group/row">
                      {/* Row Controls */}
                      <div className="absolute -left-36 top-0 opacity-100 transition-opacity flex flex-col gap-2 p-2">
                         <div className="flex items-center gap-2 bg-white p-1 rounded border shadow-sm">
                             <span className="text-[9px] font-bold text-slate-400 w-6">ШИНА:</span>
                             <select 
                               value={row.busType || 'comb_3p'} 
                               onChange={(e) => updateRowBusType(rIdx, e.target.value as any)}
                               className="text-[10px] bg-slate-50 border rounded px-1 py-0.5 w-20 cursor-pointer outline-none focus:border-blue-500"
                             >
                                <option value="comb_3p">3Ф Гребенка</option>
                                <option value="L1">L1 Моно</option>
                                <option value="L2">L2 Моно</option>
                                <option value="L3">L3 Моно</option>
                             </select>
                         </div>
                         <button onClick={() => deleteRow(rIdx)} className="p-1 text-red-600 bg-white border hover:bg-red-50 rounded flex items-center justify-center gap-1 text-[10px]" title="Удалить ряд">
                            <Trash2 className="w-3 h-3"/> Удалить
                         </button>
                      </div>

                      {/* DIN Rail */}
                      <div className="h-8 bg-slate-300 rounded mx-2 shadow-inner border-t border-slate-400 flex items-center justify-center mb-1 relative">
                         <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">DIN 35mm (Ряд {rIdx + 1})</span>
                      </div>
                      
                      {/* Modules Container */}
                      <div className="flex items-end px-4 gap-[2px] h-[100px] -mt-6">
                        {row.modules.map((mod, mIdx) => {
                          const load = getModuleLoad(mod.name);
                          const phase = getModulePhase(row, mod, rowSlotIndex);
                          rowSlotIndex += mod.width;

                          return (
                            <div 
                              key={mod.id}
                              className={`
                                relative flex flex-col justify-between p-1 rounded-sm shadow-md border-b-2 border-r-2 border-black/20 group/mod
                                ${getModuleColor(mod.type)} 
                                hover:brightness-110 transition-all hover:-translate-y-1 cursor-pointer
                              `}
                              style={{ width: `${mod.width * 45}px`, height: '100%' }}
                              onClick={() => setEditingModule({rowIdx: rIdx, modIdx: mIdx, data: {...mod}})}
                            >
                               {/* Move Controls */}
                               <div className="absolute -top-7 left-0 w-full flex justify-center gap-1 opacity-0 group-hover/mod:opacity-100 transition-opacity z-20">
                                  <button onClick={(e) => { e.stopPropagation(); moveModule(rIdx, mIdx, 'left'); }} className="p-1 bg-white border shadow-sm rounded-full hover:bg-blue-50 text-slate-600 disabled:opacity-30" disabled={mIdx === 0}><ChevronLeft className="w-3 h-3"/></button>
                                  <button onClick={(e) => { e.stopPropagation(); moveModule(rIdx, mIdx, 'right'); }} className="p-1 bg-white border shadow-sm rounded-full hover:bg-blue-50 text-slate-600 disabled:opacity-30" disabled={mIdx === row.modules.length - 1}><ChevronRight className="w-3 h-3"/></button>
                               </div>

                               {/* Phase Dot */}
                               {phase && phase !== '3P' && (
                                   <div className={`absolute top-1 right-1 w-2 h-2 rounded-full border border-black/20 shadow-sm
                                     ${phase === 'L1' ? 'bg-amber-400' : phase === 'L2' ? 'bg-emerald-400' : 'bg-red-500'}
                                   `} title={`Фаза: ${phase}`}></div>
                               )}

                               <div className="w-2 h-2 rounded-full border border-black/30 bg-black/10 mx-auto"></div>
                               
                               <div className="flex flex-col items-center text-center">
                                  <span className="text-[10px] opacity-80 leading-tight line-clamp-2 px-1 font-medium">{mod.name}</span>
                                  <span className="font-bold text-sm mt-0.5">{mod.type === 'meter' ? 'Счетчик' : mod.rating}</span>
                                  
                                  {mod.type.startsWith('breaker') && (
                                    load > 0 ? (
                                      <div className="mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm border bg-green-100 text-green-700 border-green-300">
                                        <Zap className="w-2 h-2"/> {load.toFixed(1)}
                                      </div>
                                    ) : (
                                      <div className="mt-1 text-[9px] text-slate-400 border border-slate-300 rounded px-1">Пусто</div>
                                    )
                                  )}
                               </div>

                               <div className="w-4 h-8 bg-black/20 mx-auto rounded-sm relative">
                                  <div className="absolute bottom-0 w-full h-1/2 bg-black/40 rounded-sm"></div>
                               </div>
                               <div className="w-2 h-2 rounded-full border border-black/30 bg-black/10 mx-auto"></div>
                            </div>
                          );
                        })}
                        
                        <button 
                          onClick={() => addModule(rIdx, 'breaker_1p')}
                          className="h-20 w-8 ml-2 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-400 opacity-0 group-hover/row:opacity-100 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )})
                )}
                
                {config.rows.length > 0 && (
                  <div className="text-center pt-4">
                     <button onClick={addRow} className="px-4 py-2 border border-slate-300 rounded-full text-sm text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                        + Добавить ряд
                     </button>
                  </div>
                )}
              </div>
            </div>
         </div>
      </div>

      {/* Circuit Passport (Advanced Edit Modal) */}
      {editingModule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end animate-fade-in backdrop-blur-sm">
          <div className="bg-white h-full w-[450px] shadow-2xl animate-slide-in-right flex flex-col border-l border-slate-200">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-display font-bold text-xl text-slate-900">Паспорт Линии</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">ID: {editingModule.data.id}</p>
              </div>
              <button onClick={() => setEditingModule(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X className="w-6 h-6"/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* 1. Basic Info */}
              <section>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Маркировка и Тип</label>
                 <div className="flex gap-4">
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={editingModule.data.name}
                        onChange={(e) => setEditingModule({...editingModule, data: {...editingModule.data, name: e.target.value}})}
                        className="w-full text-lg font-bold border-b-2 border-slate-200 focus:border-blue-600 outline-none py-1 bg-transparent"
                        placeholder="Название (напр. Кухня)"
                      />
                      <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <RefreshCcw className="w-3 h-3"/> Обновит план
                      </div>
                    </div>
                    <div className="w-24">
                       <input 
                        type="text" 
                        value={editingModule.data.rating}
                        onChange={(e) => setEditingModule({...editingModule, data: {...editingModule.data, rating: e.target.value}})}
                        className="w-full text-lg font-mono border-b-2 border-slate-200 focus:border-blue-600 outline-none py-1 bg-transparent text-center"
                      />
                      <div className="text-xs text-slate-400 mt-1 text-center">Номинал</div>
                    </div>
                 </div>
              </section>

              {/* 2. Calculated Stats */}
              {(() => {
                 const stats = getModuleStats(editingModule.data.name, editingModule.data.rating);
                 
                 return (
                   <>
                     <section className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border ${stats.isOverload ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                           <div className="text-xs text-slate-500 uppercase font-bold mb-1">Ток (Расчет)</div>
                           <div className="flex items-baseline gap-1">
                              <span className={`text-2xl font-display font-bold ${stats.isOverload ? 'text-red-700' : 'text-green-700'}`}>
                                 {stats.totalCurrent.toFixed(1)}
                              </span>
                              <span className="text-sm font-medium opacity-70">А</span>
                           </div>
                           {stats.isOverload && <div className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Перегрузка! &gt; {editingModule.data.rating}</div>}
                        </div>
                        
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                           <div className="text-xs text-slate-500 uppercase font-bold mb-1">Мощность</div>
                           <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-display font-bold text-slate-700">
                                 {stats.totalPower.toFixed(2)}
                              </span>
                              <span className="text-sm font-medium opacity-70">кВт</span>
                           </div>
                        </div>
                     </section>

                     <section>
                        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                           <Cable className="w-4 h-4 text-slate-500"/> Кабельная линия
                        </h4>
                        <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200 text-sm">
                           <div className="flex justify-between">
                              <span className="text-slate-500">Сечение (ВВГнг):</span>
                              <span className="font-mono font-bold">{stats.section} мм²</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-slate-500">Длина (общая):</span>
                              <span className="font-mono">{stats.totalLength.toFixed(0)} м</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-slate-500">Падение напр. (dU):</span>
                              <span className={`font-mono font-bold ${stats.dU > 4 ? 'text-red-600' : 'text-green-600'}`}>
                                 {stats.dU.toFixed(2)}%
                              </span>
                           </div>
                        </div>
                     </section>

                     <section className="flex-1 min-h-0 flex flex-col">
                        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                           <Layout className="w-4 h-4 text-slate-500"/> Потребители ({stats.elements.length})
                        </h4>
                        {stats.elements.length === 0 ? (
                           <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm p-4">
                              Нет привязанных элементов на плане.
                           </div>
                        ) : (
                           <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex-1 overflow-y-auto max-h-48">
                              {stats.elements.map(el => (
                                 <div key={el.id} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                       <div className={`w-2 h-2 rounded-full ${el.type === 'light' ? 'bg-amber-400' : 'bg-blue-500'}`}></div>
                                       <span className="text-sm text-slate-700 font-medium">{el.label || 'Точка'}</span>
                                    </div>
                                    <span className="text-xs font-mono text-slate-400">
                                       {el.power} кВт
                                    </span>
                                 </div>
                              ))}
                           </div>
                        )}
                     </section>
                   </>
                 );
              })()}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 grid grid-cols-2 gap-4">
               <button 
                 onClick={() => deleteModule(editingModule.rowIdx, editingModule.modIdx)}
                 className="py-3 px-4 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
               >
                 <Trash2 className="w-4 h-4"/> Удалить
               </button>
               <button 
                 onClick={updateModule}
                 className="py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
               >
                 <CheckCircle className="w-4 h-4"/> Сохранить
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelScheduleEditor;
