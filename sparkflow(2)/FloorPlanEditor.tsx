
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Monitor, Zap, Lightbulb, ToggleLeft, 
  Move, Cable, MousePointer2, Check, Image as ImageIcon, Trash2, Ruler, FileDown,
  ZoomIn, ZoomOut, Hand, BrickWall, Eraser, DoorOpen, Maximize, RotateCw, ArrowUpFromLine,
  Layers, Eye, Palette, Link as LinkIcon, CornerDownRight, Activity, Grid3X3, Undo2, Redo2, List,
  Plug, PlusCircle, Wand2, Loader2, X, Upload
} from 'lucide-react';
import { PlanElement, ElementType, CableRun, Wall, ViewMode, LayerConfig, LoadItem } from '../types';
import { generateDXF } from '../services/dxfService';
import { generateRoomLayout } from '../services/geminiService';
import { useProject } from '../context/ProjectContext';
import { calculateVoltageDrop } from '../utils/electricalFormulas';
import PlanImporter from './PlanImporter';

// Helper to generate consistent colors from strings (for circuit IDs)
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// History limit
const MAX_HISTORY = 30;

const FloorPlanEditor: React.FC = () => {
  const { 
    floorPlanElements, setFloorPlanElements, 
    cableRuns, setCableRuns,
    walls, setWalls,
    floorPlanBackgroundImage, setFloorPlanBackgroundImage,
    roomDimensions,
    panelConfig, setPanelConfig,
    loads
  } = useProject();

  const [mode, setMode] = useState<'move' | 'wire' | 'pan' | 'wall' | 'eraser' | 'ruler'>('move');
  const [activeTab, setActiveTab] = useState<'tools' | 'loads'>('tools');
  
  const [wireStartId, setWireStartId] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(50);
  
  // AI Layout State
  const [showAiModal, setShowAiModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [aiRoomType, setAiRoomType] = useState('Спальня');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  
  // View Settings
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [layers, setLayers] = useState<LayerConfig>({
    walls: true,
    arch: true,
    devices: true,
    cables: true,
    labels: true
  });
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [useOrthogonalRouting, setUseOrthogonalRouting] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  
  // Ruler State
  const [rulerStart, setRulerStart] = useState<{x: number, y: number} | null>(null);
  const [rulerEnd, setRulerEnd] = useState<{x: number, y: number} | null>(null);
  
  // Viewport State
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawingWall, setIsDrawingWall] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{x: number, y: number} | null>(null);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isSnapping, setIsSnapping] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Undo/Redo History State
  interface HistoryState {
    elements: PlanElement[];
    walls: Wall[];
    cables: CableRun[];
  }
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const CEILING_HEIGHT_METERS = roomDimensions.ceilingHeight || 2.7;

  // --- Derived Data ---
  
  const unplacedLoads = useMemo(() => {
    const placedCounts: Record<string, number> = {};
    floorPlanElements.forEach(el => {
      if (el.loadId) {
        placedCounts[el.loadId] = (placedCounts[el.loadId] || 0) + 1;
      }
    });

    return loads.map(l => {
      const placed = placedCounts[l.id] || 0;
      const remaining = l.count - placed;
      return { ...l, remaining };
    }).filter(l => l.remaining > 0);
  }, [loads, floorPlanElements]);

  const availableCircuits = useMemo(() => {
    if (!panelConfig) return [];
    const circuits: {id: string, name: string, type: string}[] = [];
    panelConfig.rows.forEach(row => {
        row.modules.forEach(mod => {
            if (mod.type.startsWith('breaker') || mod.type === 'diff') {
                circuits.push({
                    id: mod.name, 
                    name: `${mod.name} (${mod.rating})`,
                    type: mod.type
                });
            }
        });
    });
    return circuits;
  }, [panelConfig]);

  const primarySelection = selectedElementIds.length > 0 
    ? floorPlanElements.find(e => e.id === selectedElementIds[0]) 
    : null;

  // --- History Management ---
  
  const saveHistory = () => {
    const currentState: HistoryState = {
      elements: floorPlanElements,
      walls: walls,
      cables: cableRuns
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    setHistory(newHistory);
  };

  useEffect(() => {
    if (history.length === 0 && floorPlanElements.length > 0) {
        saveHistory();
    }
  }, []);

  const performUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const state = history[prevIndex];
      setFloorPlanElements(state.elements);
      setWalls(state.walls);
      setCableRuns(state.cables);
      setHistoryIndex(prevIndex);
      showMessage('Отмена', 'info');
    }
  };

  const performRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const state = history[nextIndex];
      setFloorPlanElements(state.elements);
      setWalls(state.walls);
      setCableRuns(state.cables);
      setHistoryIndex(nextIndex);
      showMessage('Повтор', 'info');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        performUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        performRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex]);


  // --- Helpers ---
  const snapToGrid = (val: number) => Math.round(val / 1.25) * 1.25; 

  const snapToWalls = (x: number, y: number, threshold: number = 2) => {
    let bestDist = threshold;
    let bestPoint = { x, y };
    let snapped = false;

    walls.forEach(w => {
      const d1 = Math.sqrt(Math.pow(w.x1 - x, 2) + Math.pow(w.y1 - y, 2));
      if (d1 < bestDist) { bestDist = d1; bestPoint = { x: w.x1, y: w.y1 }; snapped = true; }
      const d2 = Math.sqrt(Math.pow(w.x2 - x, 2) + Math.pow(w.y2 - y, 2));
      if (d2 < bestDist) { bestDist = d2; bestPoint = { x: w.x2, y: w.y2 }; snapped = true; }
    });
    return { point: bestPoint, snapped };
  };

  const getCanvasCoordinates = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / (rect.width)) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / (rect.height)) * 100));
    return { x, y };
  };

  // --- Zoom / Pan Logic ---
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || mode === 'pan') {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newScale = Math.min(Math.max(0.5, scale + delta), 4);
      setScale(newScale);
    }
  };

  const startPan = (clientX: number, clientY: number) => {
    setIsPanning(true);
    setLastPanPoint({ x: clientX, y: clientY });
  };

  const doPan = (clientX: number, clientY: number) => {
    if (!isPanning) return;
    const dx = clientX - lastPanPoint.x;
    const dy = clientY - lastPanPoint.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastPanPoint({ x: clientX, y: clientY });
  };

  // --- Calculations ---
  const calculate3DCableLength = (p1: PlanElement, p2: PlanElement) => {
      const dx = Math.abs(p1.x - p2.x) / 100 * roomDimensions.width;
      const dy = Math.abs(p1.y - p2.y) / 100 * roomDimensions.length;
      const horizontalDist = useOrthogonalRouting ? (dx + dy) : Math.sqrt(dx*dx + dy*dy);
      const h1 = (p1.mountingHeight || 30) / 100;
      const h2 = (p2.mountingHeight || 30) / 100;
      const drop1 = Math.max(0, CEILING_HEIGHT_METERS - h1);
      const drop2 = Math.max(0, CEILING_HEIGHT_METERS - h2);
      return parseFloat((horizontalDist + drop1 + drop2).toFixed(2));
  };

  const calculateDistance = (p1: {x:number, y:number}, p2: {x:number, y:number}) => {
      const dx = Math.abs(p1.x - p2.x) / 100 * roomDimensions.width;
      const dy = Math.abs(p1.y - p2.y) / 100 * roomDimensions.length;
      return Math.sqrt(dx*dx + dy*dy);
  };
  
  const getDistanceToSource = (elId: string, depth = 0): number => {
      if (depth > 20) return 0; 
      const run = cableRuns.find(r => r.toId === elId);
      if (run) {
          const parentId = run.fromId;
          const parentEl = floorPlanElements.find(e => e.id === parentId);
          if (parentEl) {
              if (parentEl.type === 'db') {
                  return run.length;
              } else {
                  return run.length + getDistanceToSource(parentId, depth + 1);
              }
          }
      }
      return 0;
  };

  const calculateElementVoltageDrop = (el: PlanElement) => {
      if (!el.circuitId || el.type === 'db') return 0;
      const distance = getDistanceToSource(el.id);
      if (distance === 0) return 0;
      const section = el.type === 'light' ? 1.5 : 2.5; 
      const power = el.power || (el.type === 'light' ? 0.1 : 3.5);
      return calculateVoltageDrop(distance, power, 230, section);
  };

  // --- Interactions ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || mode === 'pan') {
      e.preventDefault();
      startPan(e.clientX, e.clientY);
      return;
    }

    if (['move', 'wall', 'eraser'].includes(mode)) {
        saveHistory(); 
    }

    const coords = getCanvasCoordinates(e);
    let finalX = snapToGrid(coords.x);
    let finalY = snapToGrid(coords.y);
    
    if (mode === 'wall') {
        const snapRes = snapToWalls(coords.x, coords.y);
        if (snapRes.snapped) { finalX = snapRes.point.x; finalY = snapRes.point.y; }
    }

    if (mode === 'wall') {
      setIsDrawingWall(true);
      setStartPoint({x: finalX, y: finalY});
      setCurrentMousePos({x: finalX, y: finalY});
    } else if (mode === 'ruler') {
      setRulerStart({x: finalX, y: finalY});
      setRulerEnd({x: finalX, y: finalY});
    } else if (mode === 'move') {
      if (!dragId) {
        if (!e.shiftKey) {
            setSelectedElementIds([]);
            setSelectedWallId(null);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      doPan(e.clientX, e.clientY);
      return;
    }

    const coords = getCanvasCoordinates(e);
    let finalX = snapToGrid(coords.x);
    let finalY = snapToGrid(coords.y);

    let snapped = false;
    if (mode === 'wall') {
        const snapRes = snapToWalls(coords.x, coords.y);
        if (snapRes.snapped) { finalX = snapRes.point.x; finalY = snapRes.point.y; snapped = true; }
    }
    setIsSnapping(snapped);
    
    setCurrentMousePos({x: finalX, y: finalY});

    if (mode === 'move' && dragId) {
       setFloorPlanElements(floorPlanElements.map(el => 
        el.id === dragId ? { ...el, x: finalX, y: finalY } : el
      ));
    }
    
    if (mode === 'ruler' && rulerStart) {
        setRulerEnd({x: finalX, y: finalY});
    }
  };

  const handleMouseUp = () => {
    if (mode === 'wall' && isDrawingWall && startPoint && currentMousePos) {
      if (Math.abs(startPoint.x - currentMousePos.x) > 0.5 || Math.abs(startPoint.y - currentMousePos.y) > 0.5) {
        const newWall: Wall = {
          id: Date.now().toString(),
          x1: startPoint.x,
          y1: startPoint.y,
          x2: currentMousePos.x,
          y2: currentMousePos.y,
          thickness: 6
        };
        setWalls([...walls, newWall]);
        saveHistory();
      }
      setIsDrawingWall(false);
      setStartPoint(null);
    }
    
    if (mode === 'move' && dragId) {
        recalcCablesForElement(dragId);
        saveHistory();
    }
    
    setDragId(null);
    setIsPanning(false);
  };
  
  const recalcCablesForElement = (elId: string) => {
      const movedEl = floorPlanElements.find(e => e.id === elId);
      if (!movedEl) return;
      
      const updatedRuns = cableRuns.map(run => {
          if (run.fromId === elId || run.toId === elId) {
              const otherId = run.fromId === elId ? run.toId : run.fromId;
              const otherEl = floorPlanElements.find(e => e.id === otherId);
              if (otherEl) {
                  const newLength = calculate3DCableLength(movedEl, otherEl);
                  return { ...run, length: newLength };
              }
          }
          return run;
      });
      setCableRuns(updatedRuns);
  };

  const handleElementMouseDown = (id: string, e: React.MouseEvent) => {
    if (!layers.devices) return;
    
    if (mode === 'move') {
      e.stopPropagation();
      setDragId(id);
      
      if (e.shiftKey) {
         if (selectedElementIds.includes(id)) {
             setSelectedElementIds(selectedElementIds.filter(sid => sid !== id));
         } else {
             setSelectedElementIds([...selectedElementIds, id]);
         }
      } else {
         if (!selectedElementIds.includes(id)) {
             setSelectedElementIds([id]);
         }
      }
      setSelectedWallId(null);
    } else if (mode === 'eraser') {
      e.stopPropagation();
      setFloorPlanElements(floorPlanElements.filter(el => el.id !== id));
      setCableRuns(cableRuns.filter(run => run.fromId !== id && run.toId !== id));
      saveHistory();
    } else if (mode === 'wire') {
      e.stopPropagation();
      handleElementClick(id, e);
    }
  };

  const handleWallClick = (id: string, e: React.MouseEvent) => {
    if (!layers.walls) return;
    if (mode === 'eraser') {
      e.stopPropagation();
      setWalls(walls.filter(w => w.id !== id));
      saveHistory();
    } else if (mode === 'move') {
      e.stopPropagation();
      setSelectedWallId(id);
      setSelectedElementIds([]);
    }
  };

  const handleElementClick = (id: string, e: React.MouseEvent) => {
    if (mode === 'wire') {
      if (!wireStartId) {
        setWireStartId(id);
      } else {
        if (wireStartId === id) {
          setWireStartId(null);
          return;
        }
        const startEl = floorPlanElements.find(el => el.id === wireStartId);
        const endEl = floorPlanElements.find(el => el.id === id);
        if (startEl && endEl) {
          const length = calculate3DCableLength(startEl, endEl);
          const newRun: CableRun = {
            id: Date.now().toString(),
            fromId: wireStartId,
            toId: id,
            type: startEl.type === 'light' || endEl.type === 'light' ? 'light' : 'power',
            length: length
          };
          setCableRuns([...cableRuns, newRun]);
          saveHistory();
          showMessage(`Кабель проложен: ${newRun.length}м`, 'success');
        }
        setWireStartId(null);
      }
    }
  };

  // --- Advanced Actions ---
  
  const handleAutoChain = () => {
      if (selectedElementIds.length < 2) {
          showMessage('Выберите минимум 2 элемента', 'info');
          return;
      }
      saveHistory();
      const selectedEls = floorPlanElements.filter(e => selectedElementIds.includes(e.id));
      
      let sorted = [...selectedEls];
      const dbIndex = sorted.findIndex(e => e.type === 'db');
      
      const chain: PlanElement[] = [];
      const remaining = [...selectedEls];
      
      let current: PlanElement;
      if (dbIndex >= 0) {
          current = remaining.splice(dbIndex, 1)[0];
      } else {
          remaining.sort((a, b) => (a.x + a.y) - (b.x + b.y));
          current = remaining.shift()!;
      }
      
      chain.push(current);
      const newRuns: CableRun[] = [];
      
      while (remaining.length > 0) {
          let bestDist = Infinity;
          let bestIdx = -1;

          for (let i = 0; i < remaining.length; i++) {
              const d = calculateDistance(current, remaining[i]);
              if (d < bestDist) { bestDist = d; bestIdx = i; }
          }

          if (bestIdx >= 0) {
              const next = remaining[bestIdx];
              const length = calculate3DCableLength(current, next);
              newRuns.push({
                 id: Date.now().toString() + Math.random(),
                 fromId: current.id,
                 toId: next.id,
                 type: current.type === 'light' || next.type === 'light' ? 'light' : 'power',
                 length: length
              });
              current = next;
              chain.push(next);
              remaining.splice(bestIdx, 1);
          } else {
              break; 
          }
      }

      setCableRuns([...cableRuns, ...newRuns]);
      saveHistory();
      showMessage(`Создана цепь из ${newRuns.length} сегментов`, 'success');
  };

  const handleConnectToDB = () => {
      const dbs = floorPlanElements.filter(e => e.type === 'db');
      if (dbs.length === 0) {
          showMessage("Нет щитов (DB) на плане", "info");
          return;
      }
      
      const selected = floorPlanElements.filter(e => selectedElementIds.includes(e.id) && e.type !== 'db');
      if (selected.length === 0) return;

      saveHistory();

      // Find closest DB for the group
      let bestDB = dbs[0];
      let minDistTotal = Infinity;
      let bestElInSelection = selected[0];

      dbs.forEach(db => {
          let localMinDist = Infinity;
          let localBestEl = selected[0];
          
          selected.forEach(el => {
               const d = calculateDistance(db, el);
               if (d < localMinDist) {
                   localMinDist = d;
                   localBestEl = el;
               }
          });
          
          if (localMinDist < minDistTotal) {
             minDistTotal = localMinDist;
             bestDB = db;
             bestElInSelection = localBestEl;
          }
      });

      // Check if exists
      const exists = cableRuns.some(r => 
          (r.fromId === bestDB.id && r.toId === bestElInSelection.id) || 
          (r.toId === bestDB.id && r.fromId === bestElInSelection.id)
      );

      if (!exists) {
          const newRun: CableRun = {
              id: Date.now().toString(),
              fromId: bestDB.id,
              toId: bestElInSelection.id,
              type: bestElInSelection.type === 'light' ? 'light' : 'power',
              length: calculate3DCableLength(bestDB, bestElInSelection)
          };
          setCableRuns([...cableRuns, newRun]);
          showMessage(`Подключено к щиту (L=${newRun.length}м)`, "success");
      } else {
          showMessage("Уже подключено", "info");
      }
  };

  const handleCreateCircuit = () => {
      if (selectedElementIds.length === 0) {
          showMessage("Выберите элементы", "info");
          return;
      }
      saveHistory();

      // 1. Prepare name
      const existingGroups = floorPlanElements.map(e => e.circuitId).filter(Boolean);
      let nextIdx = 1;
      while (existingGroups.includes(`Gr-${nextIdx}`) || existingGroups.includes(`Гр-${nextIdx}`)) {
          nextIdx++;
      }
      const newName = `Гр-${nextIdx}`;
      
      // 2. Determine type based on selection
      const hasLight = floorPlanElements.some(e => selectedElementIds.includes(e.id) && e.type === 'light');
      const rating = hasLight ? '10A' : '16A';
      
      // 3. Update Panel Config
      const currentPanel = panelConfig || { rows: [{ id: 'r1', modules: [], busType: 'comb_3p' }], enclosureSize: 36 };
      const lastRowIdx = currentPanel.rows.length - 1 >= 0 ? currentPanel.rows.length - 1 : 0;
      if (currentPanel.rows.length === 0) currentPanel.rows.push({ id: 'r1', modules: [], busType: 'comb_3p' });
      
      const newModule = {
          id: `auto-${Date.now()}`,
          type: 'breaker_1p' as const,
          name: newName,
          rating: rating,
          width: 1
      };
      
      const newRows = [...currentPanel.rows];
      newRows[lastRowIdx].modules.push(newModule);
      setPanelConfig({ ...currentPanel, rows: newRows });

      // 4. Assign to Elements
      const updatedElements = floorPlanElements.map(el => 
         selectedElementIds.includes(el.id) ? { ...el, circuitId: newName } : el
      );
      setFloorPlanElements(updatedElements);
      
      showMessage(`Создана группа ${newName}`, "success");
  };

  // --- AI Layout Generation ---
  
  const handleAiGenerate = async () => {
    setIsAiGenerating(true);
    try {
        const layout = await generateRoomLayout({
            roomType: aiRoomType,
            width: roomDimensions.width,
            length: roomDimensions.length
        });
        
        // Convert layout.elements to PlanElement[]
        const newElements = layout.elements.map(el => ({
            ...el,
            id: `ai-${Date.now()}-${Math.random()}`,
            // Map types safely
            type: (['socket', 'switch', 'light', 'appliance', 'db'].includes(el.type) ? el.type : 'socket') as ElementType,
            mountingHeight: el.type === 'switch' ? 90 : el.type === 'light' ? 270 : 30,
            power: el.type === 'socket' ? 3.5 : 0.1
        }));
        
        saveHistory();
        setFloorPlanElements([...floorPlanElements, ...newElements]);
        showMessage('Расстановка создана (AI)', 'success');
        setShowAiModal(false);
    } catch (e) {
        alert("Ошибка генерации. Попробуйте еще раз.");
    } finally {
        setIsAiGenerating(false);
    }
  };

  const addElement = (type: ElementType, load?: LoadItem) => {
    saveHistory();
    let defaultHeight = 30;
    if (type === 'switch') defaultHeight = 90;
    if (type === 'light') defaultHeight = CEILING_HEIGHT_METERS * 100;
    if (type === 'db') defaultHeight = 180;
    if (type === 'door' || type === 'window') defaultHeight = 0;

    const newEl: PlanElement = {
      id: Date.now().toString(),
      type,
      x: 50,
      y: 50,
      rotation: 0,
      mountingHeight: defaultHeight,
      label: load ? load.name : (type === 'door' ? '' : 'Точка'),
      circuitId: '',
      power: load ? load.power : (type === 'socket' ? 3.5 : 0.1),
      lumens: type === 'light' ? 800 : undefined,
      loadId: load?.id
    };
    setFloorPlanElements([...floorPlanElements, newEl]);
    setSelectedElementIds([newEl.id]);
    setMode('move');
  };

  const updateSelectedElements = (updates: Partial<PlanElement>) => {
    if (selectedElementIds.length === 0) return;
    const updatedElements = floorPlanElements.map(el => 
      selectedElementIds.includes(el.id) ? { ...el, ...updates } : el
    );
    setFloorPlanElements(updatedElements);
    if (updates.mountingHeight !== undefined) {
        selectedElementIds.forEach(id => recalcCablesForElement(id));
    }
  };

  const rotateElement = () => {
      if(selectedElementIds.length === 0) return;
      saveHistory();
      const updatedElements = floorPlanElements.map(el => {
          if (selectedElementIds.includes(el.id)) {
              return { ...el, rotation: ((el.rotation || 0) + 90) % 360 };
          }
          return el;
      });
      setFloorPlanElements(updatedElements);
  };

  const deleteSelection = () => {
    if (selectedElementIds.length > 0) {
       saveHistory();
       setFloorPlanElements(floorPlanElements.filter(el => !selectedElementIds.includes(el.id)));
       setCableRuns(cableRuns.filter(run => !selectedElementIds.includes(run.fromId) && !selectedElementIds.includes(run.toId)));
       setSelectedElementIds([]);
    }
    if (selectedWallId) {
       saveHistory();
       setWalls(walls.filter(w => w.id !== selectedWallId));
       setSelectedWallId(null);
    }
  };

  const handleDownloadDXF = () => {
    const dxfContent = generateDXF(floorPlanElements, cableRuns, walls, roomDimensions);
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plan_${Date.now()}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('DXF файл скачан', 'success');
  };

  const showMessage = (msg: string, type: 'success' | 'info' = 'info') => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const getElementColor = (el: PlanElement): string => {
    if (viewMode === 'voltage' && el.type !== 'db') {
        const du = calculateElementVoltageDrop(el);
        if (du < 2) return '#22c55e'; // Green
        if (du < 4) return '#eab308'; // Yellow
        return '#ef4444'; // Red
    }
    if (viewMode === 'phase') {
        if (!el.phase) return '#64748b'; 
        if (el.phase === 'L1') return '#f59e0b'; 
        if (el.phase === 'L2') return '#10b981'; 
        if (el.phase === 'L3') return '#ef4444'; 
    }
    if (viewMode === 'circuit') {
        if (!el.circuitId) return '#64748b';
        return stringToColor(el.circuitId);
    }
    switch (el.type) {
        case 'socket': return '#2563eb';
        case 'switch': return '#16a34a';
        case 'light': return '#f59e0b';
        case 'appliance': return '#475569';
        case 'db': return '#dc2626';
        default: return '#000000';
    }
  };

  const renderElement = (el: PlanElement) => {
    const isArch = el.type === 'door' || el.type === 'window';
    const rot = el.rotation || 0;
    const color = getElementColor(el);
    
    if (el.type === 'door') {
        return (
            <div 
             className="w-10 h-10 -ml-5 -mt-5 flex items-end justify-start pointer-events-none"
             style={{ transform: `rotate(${rot}deg)` }}
            >
                <div className="absolute left-0 bottom-0 w-full h-full border-t-2 border-r-2 border-amber-800 rounded-tr-full opacity-50"></div>
                <div className="absolute left-0 bottom-0 w-[2px] h-full bg-amber-900 origin-bottom-left"></div>
            </div>
        );
    }
    if (el.type === 'window') {
        return (
            <div 
             className="w-10 h-2 -ml-5 -mt-1 bg-blue-100 border border-blue-400 pointer-events-none"
             style={{ transform: `rotate(${rot}deg)` }}
            >
                <div className="w-full h-px bg-blue-300 mt-[3px]"></div>
            </div>
        );
    }

    return (
       <div style={{ transform: `rotate(${rot}deg)` }} className="transition-colors duration-300">
          {el.type === 'socket' && <Zap className="w-5 h-5" style={{color}} />}
          {el.type === 'switch' && <ToggleLeft className="w-5 h-5" style={{color}} />}
          {el.type === 'light' && <Lightbulb className="w-5 h-5" style={{color}} />}
          {el.type === 'appliance' && <Monitor className="w-5 h-5" style={{color}} />}
          {el.type === 'db' && <div className="w-6 h-4 border-2 border-red-500 bg-red-100 text-[8px] flex items-center justify-center font-bold" style={{borderColor: color}}>ЩР</div>}
       </div>
    );
  };

  const getPath = (x1: number, y1: number, x2: number, y2: number) => {
    if (!useOrthogonalRouting) {
        return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`;
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      
      {/* Import Modal */}
      {showImportModal && (
        <PlanImporter onClose={() => setShowImportModal(false)} />
      )}

      {/* AI Modal */}
      {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-96 border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg flex items-center gap-2"><Wand2 className="w-5 h-5 text-purple-600"/> AI Расстановка</h3>
                      <button onClick={() => setShowAiModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Автоматически расставит розетки, выключатели и свет по нормам СП 31-110.</p>
                  
                  <div className="mb-4">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Тип помещения</label>
                      <input 
                        type="text" 
                        value={aiRoomType}
                        onChange={(e) => setAiRoomType(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-purple-500"
                        placeholder="Например: Кухня-гостиная"
                      />
                  </div>
                  
                  <button 
                    onClick={handleAiGenerate}
                    disabled={isAiGenerating}
                    className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 flex items-center justify-center gap-2"
                  >
                     {isAiGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                     Сгенерировать
                  </button>
              </div>
          </div>
      )}

      {/* Sidebar */}
      <div className="w-72 bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm z-20 overflow-hidden shrink-0 print:hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
           <button 
             onClick={() => setActiveTab('tools')} 
             className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'tools' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
           >
             <Move className="w-4 h-4"/> Палитра
           </button>
           <button 
             onClick={() => setActiveTab('loads')} 
             className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'loads' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
           >
             <List className="w-4 h-4"/> Из списка
             {unplacedLoads.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{unplacedLoads.reduce((acc, l) => acc + l.remaining, 0)}</span>}
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'tools' ? (
            <div className="flex flex-col gap-6">
                
                <button 
                  onClick={() => setShowImportModal(true)}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
                >
                    <Upload className="w-4 h-4"/> Импорт PDF / План
                </button>

                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setMode('move')} className={`py-1.5 rounded flex items-center justify-center gap-1 text-xs font-medium ${mode === 'move' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Move className="w-4 h-4" /> Выбор</button>
                  <button onClick={() => setMode('wall')} className={`py-1.5 rounded flex items-center justify-center gap-1 text-xs font-medium ${mode === 'wall' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><BrickWall className="w-4 h-4" /> Стена</button>
                  <button onClick={() => setMode('wire')} className={`py-1.5 rounded flex items-center justify-center gap-1 text-xs font-medium ${mode === 'wire' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Cable className="w-4 h-4" /> Кабель</button>
                  <button onClick={() => setMode('ruler')} className={`py-1.5 rounded flex items-center justify-center gap-1 text-xs font-medium ${mode === 'ruler' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Ruler className="w-4 h-4" /> Линейка</button>
                  <button onClick={() => setMode('pan')} className={`col-span-1 py-1.5 rounded flex items-center justify-center gap-1 text-xs font-medium ${mode === 'pan' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Hand className="w-4 h-4" /> Рука</button>
                  <button onClick={() => setMode('eraser')} className={`col-span-1 py-1.5 rounded flex items-center justify-center gap-1 text-xs font-medium ${mode === 'eraser' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}><Eraser className="w-4 h-4" /> Удаление</button>
                </div>
                
                <button 
                  onClick={() => setShowAiModal(true)}
                  className="w-full py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 flex items-center justify-center gap-2 transition-colors"
                >
                    <Wand2 className="w-4 h-4"/> AI Авто-расстановка
                </button>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Архитектура</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addElement('door')} className="tool-btn"><DoorOpen className="w-5 h-5 text-amber-700"/><span className="text-xs">Дверь</span></button>
                    <button onClick={() => addElement('window')} className="tool-btn"><Maximize className="w-5 h-5 text-blue-400"/><span className="text-xs">Окно</span></button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Электрика</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addElement('socket')} className="tool-btn"><Zap className="w-5 h-5 text-blue-500"/><span className="text-xs">Розетка</span></button>
                    <button onClick={() => addElement('switch')} className="tool-btn"><ToggleLeft className="w-5 h-5 text-green-500"/><span className="text-xs">Выкл.</span></button>
                    <button onClick={() => addElement('light')} className="tool-btn"><Lightbulb className="w-5 h-5 text-amber-500"/><span className="text-xs">Свет</span></button>
                    <button onClick={() => addElement('appliance')} className="tool-btn"><Monitor className="w-5 h-5 text-slate-500"/><span className="text-xs">Прибор</span></button>
                    <button onClick={() => addElement('db')} className="tool-btn"><div className="w-5 h-4 border border-red-500 rounded-sm"></div><span className="text-xs">Щит</span></button>
                  </div>
                </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Неразмещенные</h3>
              {unplacedLoads.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg">
                   Все нагрузки размещены!
                </div>
              ) : (
                unplacedLoads.map(load => (
                  <div key={load.id} className="bg-slate-50 border border-slate-200 p-3 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all group relative">
                     <div className="flex justify-between items-start">
                        <div>
                           <div className="font-medium text-sm text-slate-900">{load.name}</div>
                           <div className="text-xs text-slate-500">{load.power} кВт • {load.category === 'lighting' ? 'Свет' : 'Розетка'}</div>
                        </div>
                        <div className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                           x{load.remaining}
                        </div>
                     </div>
                     <button 
                       onClick={() => {
                          const type: ElementType = load.category === 'lighting' ? 'light' : load.category === 'heavy' || load.category === 'hvac' ? 'appliance' : 'socket';
                          addElement(type, load);
                       }}
                       className="mt-2 w-full py-1.5 bg-white border border-blue-200 text-blue-600 text-xs font-medium rounded hover:bg-blue-50 flex items-center justify-center gap-1"
                     >
                        <Move className="w-3 h-3"/> Разместить
                     </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        {selectedElementIds.length > 0 && (
          <div className="border-t border-slate-100 pt-4 p-4 bg-slate-50 animate-fade-in">
             <div className="flex justify-between items-center mb-3">
               <h3 className="font-display font-semibold text-slate-900">
                   {selectedElementIds.length > 1 ? `Выбрано: ${selectedElementIds.length}` : 'Свойства'}
               </h3>
               <button onClick={deleteSelection} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
             </div>
             
             {/* Quick Actions Grid */}
             <div className="grid grid-cols-3 gap-2 mb-3">
                <button onClick={rotateElement} className="p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 flex flex-col items-center justify-center gap-1" title="Повернуть">
                    <RotateCw className="w-4 h-4 text-slate-600"/>
                </button>
                {selectedElementIds.length > 0 && !selectedElementIds.some(id => floorPlanElements.find(e=>e.id===id)?.type === 'db') && (
                    <>
                    <button onClick={handleAutoChain} className="p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 flex flex-col items-center justify-center gap-1" title="Соединить шлейфом">
                        <LinkIcon className="w-4 h-4 text-blue-600"/>
                    </button>
                    <button onClick={handleConnectToDB} className="p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 flex flex-col items-center justify-center gap-1" title="К щиту">
                        <Plug className="w-4 h-4 text-amber-600"/>
                    </button>
                    </>
                )}
             </div>
             
             <button 
               onClick={handleCreateCircuit} 
               className="w-full py-2 mb-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
             >
               <PlusCircle className="w-3 h-3"/> СОЗДАТЬ ГРУППУ
             </button>

             <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
               {selectedElementIds.length === 1 && (
                  <input 
                    type="text" 
                    value={primarySelection?.label || ''} 
                    onChange={(e) => updateSelectedElements({label: e.target.value})} 
                    className="prop-input" 
                    placeholder="Название"
                  />
               )}
               
               {!['door', 'window'].includes(primarySelection?.type || '') && (
                 <div className="relative">
                     <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex justify-between">
                        Высота (см)
                        <ArrowUpFromLine className="w-3 h-3"/>
                     </label>
                     <input 
                      type="number" 
                      value={primarySelection?.mountingHeight || 0} 
                      onChange={(e) => updateSelectedElements({mountingHeight: Number(e.target.value)})} 
                      className="prop-input pl-2"
                     />
                 </div>
               )}
               
               {['socket', 'switch', 'light', 'appliance'].includes(primarySelection?.type || '') && (
                 <>
                   <div>
                     <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Группа</label>
                     {availableCircuits.length > 0 ? (
                       <select
                         value={primarySelection?.circuitId || ''}
                         onChange={(e) => updateSelectedElements({circuitId: e.target.value})}
                         className="prop-input bg-white"
                       >
                         <option value="">-- Не выбрано --</option>
                         {availableCircuits.map(c => (
                           <option key={c.id} value={c.id}>{c.name}</option>
                         ))}
                       </select>
                     ) : (
                       <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                         Нет групп. Создайте!
                       </div>
                     )}
                   </div>
                 </>
               )}
             </div>
          </div>
        )}
        
        <div className="border-t border-slate-100 p-4 mt-auto space-y-2">
            <button onClick={handleDownloadDXF} className="action-btn bg-slate-800 text-white"><FileDown className="w-4 h-4"/> Скачать DXF</button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 bg-slate-100 rounded-xl relative overflow-hidden shadow-inner cursor-default select-none print:border print:bg-white"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        {/* Rulers Overlay */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 print:hidden opacity-50">
            {/* Top Ruler (Width) */}
            <div className="absolute top-0 left-0 w-full h-6 border-b border-slate-300 bg-slate-50/80 flex items-end font-mono text-[10px] text-slate-500 overflow-hidden">
               {Array.from({ length: Math.ceil(roomDimensions.width) + 1 }).map((_, i) => (
                   <div 
                     key={i} 
                     className="absolute bottom-0 border-l border-slate-400 h-2 pl-1"
                     style={{ 
                         left: `${offset.x + (i / roomDimensions.width * (roomDimensions.width * 100 * scale))}px`,
                         transform: 'translateX(0px)' // Axis align
                     }}
                   >
                     {i}m
                   </div>
               ))}
            </div>
            
             {/* Left Ruler (Length) */}
            <div className="absolute top-0 left-0 h-full w-6 border-r border-slate-300 bg-slate-50/80 flex flex-col font-mono text-[10px] text-slate-500 overflow-hidden">
               {Array.from({ length: Math.ceil(roomDimensions.length) + 1 }).map((_, i) => (
                   <div 
                     key={i} 
                     className="absolute right-0 border-t border-slate-400 w-2 pt-0.5 pr-1 text-right"
                     style={{ 
                         top: `${offset.y + (i / roomDimensions.length * (roomDimensions.length * 100 * scale))}px`,
                     }}
                   >
                     {i}m
                   </div>
               ))}
            </div>
        </div>


        {/* Toolbar Top */}
        <div className="absolute top-4 left-10 flex flex-col gap-2 z-40 print:hidden">
          {/* View Modes */}
          <div className="bg-white rounded-lg shadow-md p-1 flex flex-col gap-1 border border-slate-200">
             <button onClick={() => setViewMode('default')} className={`p-2 rounded transition-colors ${viewMode === 'default' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`} title="Обычный вид"><Eye className="w-5 h-5"/></button>
             <button onClick={() => setViewMode('phase')} className={`p-2 rounded transition-colors ${viewMode === 'phase' ? 'bg-amber-100 text-amber-600' : 'text-slate-500 hover:bg-slate-50'}`} title="Фазы"><Zap className="w-5 h-5"/></button>
             <button onClick={() => setViewMode('circuit')} className={`p-2 rounded transition-colors ${viewMode === 'circuit' ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-slate-50'}`} title="Группы"><Palette className="w-5 h-5"/></button>
             <button onClick={() => setViewMode('voltage')} className={`p-2 rounded transition-colors ${viewMode === 'voltage' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:bg-slate-50'}`} title="Напряжение"><Activity className="w-5 h-5"/></button>
          </div>

          {/* Settings */}
          <div className="flex flex-col gap-1">
            <button onClick={() => setUseOrthogonalRouting(!useOrthogonalRouting)} className={`p-2 rounded-lg shadow-md border border-slate-200 hover:bg-slate-50 ${useOrthogonalRouting ? 'bg-white text-blue-600' : 'bg-slate-50 text-slate-400'}`} title="Прямые углы"><CornerDownRight className="w-5 h-5"/></button>
            <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded-lg shadow-md border border-slate-200 hover:bg-slate-50 ${showGrid ? 'bg-white text-blue-600' : 'bg-slate-50 text-slate-400'}`} title="Сетка"><Grid3X3 className="w-5 h-5"/></button>
            <div className="relative">
                <button onClick={() => setShowLayerMenu(!showLayerMenu)} className="bg-white p-2 rounded-lg shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50" title="Слои"><Layers className="w-5 h-5"/></button>
                {showLayerMenu && (
                   <div className="absolute top-0 left-12 bg-white rounded-lg shadow-xl border border-slate-200 p-3 w-48 animate-fade-in z-50">
                     <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Видимость слоев</h4>
                     <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={layers.walls} onChange={(e) => setLayers({...layers, walls: e.target.checked})} />Стены</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={layers.arch} onChange={(e) => setLayers({...layers, arch: e.target.checked})} />Двери/Окна</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={layers.devices} onChange={(e) => setLayers({...layers, devices: e.target.checked})} />Электроточки</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={layers.cables} onChange={(e) => setLayers({...layers, cables: e.target.checked})} />Кабели</label>
                     </div>
                   </div>
                )}
            </div>
          </div>

           {/* Undo / Redo */}
           <div className="flex flex-col gap-1 mt-2">
              <button 
                onClick={performUndo} 
                disabled={historyIndex <= 0}
                className="bg-white p-2 rounded-lg shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" 
                title="Отмена (Ctrl+Z)"
              >
                  <Undo2 className="w-5 h-5"/>
              </button>
              <button 
                onClick={performRedo} 
                disabled={historyIndex >= history.length - 1}
                className="bg-white p-2 rounded-lg shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" 
                title="Повтор (Ctrl+Y)"
              >
                  <Redo2 className="w-5 h-5"/>
              </button>
           </div>
        </div>
        
        {/* Heatmap Legend */}
        {viewMode === 'voltage' && (
           <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl border border-slate-200 shadow-lg z-40 text-xs">
              <h4 className="font-bold mb-2 text-slate-700">Падение напряжения (dU)</h4>
              <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> &lt; 2% (Отлично)</div>
              <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> 2-4% (Норма)</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> &gt; 4% (Внимание!)</div>
           </div>
        )}

        {/* Background Grid */}
        {showGrid && (
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none print:hidden transition-opacity"
            style={{ 
              backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', 
              backgroundSize: `${1.25 * scale}% ${1.25 * scale}%`, 
              backgroundPosition: `${offset.x}px ${offset.y}px`
            }}
          />
        )}

        <div className="absolute bottom-4 right-4 flex gap-2 z-40 print:hidden">
          <div className="bg-white/80 backdrop-blur px-2 py-1 rounded-md text-xs font-mono border self-center mr-2 shadow-sm">
            Масштаб: {(scale * 100).toFixed(0)}%
          </div>
          <button onClick={() => setScale(s => Math.min(s + 0.2, 4))} className="p-2 bg-white rounded-lg shadow border hover:bg-slate-50"><ZoomIn className="w-4 h-4"/></button>
          <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="p-2 bg-white rounded-lg shadow border hover:bg-slate-50"><ZoomOut className="w-4 h-4"/></button>
        </div>

        {message && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-down print:hidden">
            <div className={`px-4 py-2 rounded-full shadow-lg border flex items-center gap-2 text-sm font-medium bg-white text-slate-700 border-slate-200`}>
              <Check className="w-4 h-4 text-green-500" /> {message}
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div 
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: '100%', height: '100%'
          }}
          className="flex items-center justify-center w-full h-full"
        >
          <div 
            ref={canvasRef}
            className="bg-white border-2 border-slate-300 relative shadow-xl print:shadow-none print:border-black transition-shadow"
            style={{ 
              width: `${roomDimensions.width * 100}px`, 
              height: `${roomDimensions.length * 100}px`,
              cursor: mode === 'ruler' ? 'text' : 'default'
            }}
            onClick={(e) => { e.stopPropagation(); if(mode==='move' && !e.shiftKey) { setSelectedElementIds([]); setSelectedWallId(null); } }}
          >
            {floorPlanBackgroundImage && (
              <div 
                className="absolute inset-0 z-0 pointer-events-none"
                style={{ 
                  backgroundImage: `url(${floorPlanBackgroundImage})`, 
                  backgroundSize: 'cover', 
                  opacity: bgOpacity / 100
                }}
              />
            )}

            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
              
              {layers.walls && walls.map(wall => (
                 <line 
                  key={wall.id}
                  x1={`${wall.x1}%`} y1={`${wall.y1}%`}
                  x2={`${wall.x2}%`} y2={`${wall.y2}%`}
                  stroke={selectedWallId === wall.id ? "#3b82f6" : "#94a3b8"}
                  strokeWidth={wall.thickness}
                  strokeLinecap="square"
                  className="pointer-events-auto cursor-pointer hover:opacity-80 transition-colors"
                  onMouseDown={(e) => { e.stopPropagation(); handleWallClick(wall.id, e); }}
                 />
              ))}

              {isDrawingWall && startPoint && currentMousePos && (
                 <g>
                    <line 
                      x1={`${startPoint.x}%`} y1={`${startPoint.y}%`}
                      x2={`${currentMousePos.x}%`} y2={`${currentMousePos.y}%`}
                      stroke="#94a3b8"
                      strokeWidth="6"
                      strokeOpacity="0.5"
                    />
                    {isSnapping && (
                        <circle cx={`${currentMousePos.x}%`} cy={`${currentMousePos.y}%`} r="3" fill="#ef4444" />
                    )}
                 </g>
              )}

              {mode === 'ruler' && rulerStart && rulerEnd && (
                 <g>
                   <line 
                     x1={`${rulerStart.x}%`} y1={`${rulerStart.y}%`}
                     x2={`${rulerEnd.x}%`} y2={`${rulerEnd.y}%`}
                     stroke="#ef4444"
                     strokeWidth="2"
                     strokeDasharray="4,2"
                   />
                   <foreignObject 
                     x={`${(rulerStart.x + rulerEnd.x) / 2}%`} 
                     y={`${(rulerStart.y + rulerEnd.y) / 2}%`} 
                     width="100" height="30"
                     style={{overflow: 'visible'}}
                   >
                      <div className="bg-red-500 text-white text-[10px] px-1 py-0.5 rounded w-fit transform -translate-x-1/2 -translate-y-1/2 font-mono shadow-sm whitespace-nowrap">
                        {calculateDistance(rulerStart, rulerEnd).toFixed(2)} м
                      </div>
                   </foreignObject>
                 </g>
              )}

              {layers.cables && cableRuns.map(run => {
                const start = floorPlanElements.find(el => el.id === run.fromId);
                const end = floorPlanElements.find(el => el.id === run.toId);
                if (!start || !end) return null;
                
                let strokeColor = run.type === 'light' ? '#f59e0b' : '#3b82f6';
                if (viewMode === 'circuit' && start.circuitId) {
                    strokeColor = stringToColor(start.circuitId);
                }
                const opacity = viewMode === 'voltage' ? 0.3 : 0.8;

                return (
                  <g key={run.id} className="group/cable pointer-events-auto">
                    <path 
                      d={getPath(start.x, start.y, end.x, end.y).replace(/(\d+(\.\d+)?) (\d+(\.\d+)?)/g, "$1% $3%")}
                      stroke={strokeColor}
                      strokeWidth={2} 
                      fill="none"
                      strokeDasharray={run.type === 'light' ? "5,5" : ""}
                      opacity={opacity}
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
            </svg>

            {floorPlanElements.map((el) => {
              const isArch = el.type === 'door' || el.type === 'window';
              const isSelected = selectedElementIds.includes(el.id);
              if (isArch && !layers.arch) return null;
              if (!isArch && !layers.devices) return null;
              const dU = viewMode === 'voltage' ? calculateElementVoltageDrop(el) : 0;

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleElementMouseDown(el.id, e)}
                  className={`
                    absolute flex items-center justify-center transition-all z-20 group/el print:shadow-none print:border-black
                    ${isArch ? 'w-0 h-0' : 'w-8 h-8 -ml-4 -mt-4 bg-white rounded-full shadow-md border'}
                    ${mode === 'move' ? 'cursor-move' : mode === 'eraser' ? 'cursor-not-allowed opacity-50' : 'cursor-crosshair'}
                    ${isSelected && !isArch ? 'ring-2 ring-blue-500 scale-110 z-30' : ''}
                    ${isSelected && isArch ? 'opacity-75 z-30' : ''}
                    ${el.circuitId && !isArch && mode !== 'move' ? 'border-green-400' : 'border-slate-200'}
                  `}
                  style={{ left: `${el.x}%`, top: `${el.y}%` }}
                  title={viewMode === 'voltage' && !isArch ? `dU: ${dU.toFixed(2)}%` : undefined}
                >
                  {renderElement(el)}
                  
                  {layers.labels && el.circuitId && !isArch && viewMode !== 'voltage' && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-1 rounded whitespace-nowrap z-40 pointer-events-none shadow-sm">
                      {el.circuitId}
                      {el.phase && viewMode === 'phase' && <span className="ml-1 text-amber-300">({el.phase})</span>}
                    </div>
                  )}
                  
                  {viewMode === 'voltage' && !isArch && el.type !== 'db' && (
                     <div className={`absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap z-40 pointer-events-none shadow-sm border
                        ${dU < 2 ? 'bg-green-100 text-green-800 border-green-200' : dU < 4 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-red-100 text-red-800 border-red-200'}
                     `}>
                        {dU.toFixed(1)}%
                     </div>
                  )}
                  
                  {layers.labels && el.mountingHeight !== undefined && !isArch && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] text-slate-400 bg-white/80 px-0.5 rounded pointer-events-none">
                          h{el.mountingHeight}
                      </div>
                  )}

                  {isArch && isSelected && (
                     <div className="absolute -left-5 -top-5 w-10 h-10 border border-blue-400 border-dashed rounded pointer-events-none"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <style>{`
        .tool-btn { @apply flex flex-col items-center gap-1 p-2 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors; }
        .prop-input { @apply w-full border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 outline-none focus:border-blue-400; }
        .action-btn { @apply w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-medium transition-all hover:opacity-90; }
      `}</style>
    </div>
  );
};

export default FloorPlanEditor;
