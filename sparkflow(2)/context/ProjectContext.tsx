
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProjectContextType, LoadItem, PanelConfig, SpecificationItem, PlanElement, CableRun, RoomDimensions, ProjectMetadata, Wall } from '../types';

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'sparkflow_project_data';
const AUTOSAVE_DELAY_MS = 500;

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state function to check localStorage first
  const getInitialState = <T,>(key: string, defaultVal: T): T => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed[key] !== undefined ? parsed[key] : defaultVal;
      }
    } catch (e) {
      console.error("Failed to load from local storage", e);
    }
    return defaultVal;
  };

  const [projectName, setProjectName] = useState<string>(() => getInitialState('projectName', "Новый Проект"));
  
  const [metadata, setMetadata] = useState<ProjectMetadata>(() => getInitialState('metadata', {
    clientName: '',
    projectAddress: '',
    designerName: '',
    projectDate: new Date().toISOString().split('T')[0],
    projectStage: 'ЭП',
    projectCode: 'ЭОМ-01'
  }));

  const [loads, setLoads] = useState<LoadItem[]>(() => getInitialState('loads', []));
  const [panelConfig, setPanelConfig] = useState<PanelConfig | null>(() => getInitialState('panelConfig', null));
  const [specification, setSpecification] = useState<SpecificationItem[]>(() => getInitialState('specification', []));
  const [floorPlanElements, setFloorPlanElements] = useState<PlanElement[]>(() => getInitialState('floorPlanElements', []));
  const [walls, setWalls] = useState<Wall[]>(() => getInitialState('walls', []));
  const [cableRuns, setCableRuns] = useState<CableRun[]>(() => getInitialState('cableRuns', []));
  const [floorPlanBackgroundImage, setFloorPlanBackgroundImage] = useState<string | null>(() => getInitialState('floorPlanBackgroundImage', null));
  const [roomDimensions, setRoomDimensions] = useState<RoomDimensions>(() => getInitialState('roomDimensions', { width: 6, length: 4, ceilingHeight: 2.7 }));

  // Auto-save effect
  useEffect(() => {
    const dataToSave = {
      projectName,
      metadata,
      loads,
      panelConfig,
      specification,
      floorPlanElements,
      walls,
      cableRuns,
      floorPlanBackgroundImage,
      roomDimensions
    };

    const autosaveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
        console.error("Failed to save project to local storage", e);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(autosaveTimer);
  }, [projectName, metadata, loads, panelConfig, specification, floorPlanElements, walls, cableRuns, floorPlanBackgroundImage, roomDimensions]);

  const updateLoadPhase = (id: string, phase: 'L1' | 'L2' | 'L3' | 'ABC') => {
    setLoads(prev => prev.map(l => l.id === id ? { ...l, phase } : l));
  };

  const addToSpecification = (newItems: SpecificationItem[]) => {
    setSpecification(prev => {
      const combined = [...prev];
      newItems.forEach(newItem => {
        const existingIdx = combined.findIndex(i => i.name === newItem.name && i.model === newItem.model);
        if (existingIdx >= 0) {
          combined[existingIdx] = {
            ...combined[existingIdx],
            quantity: combined[existingIdx].quantity + newItem.quantity
          };
        } else {
          combined.push(newItem);
        }
      });
      return combined;
    });
  };

  const updateSpecificationItem = (id: string, updates: Partial<SpecificationItem>) => {
    setSpecification(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const clearSpecification = () => setSpecification([]);

  const renameCircuit = (oldName: string, newName: string) => {
    if (oldName === newName) return;

    // 1. Update Panel Config
    if (panelConfig) {
      const newRows = panelConfig.rows.map(row => ({
        ...row,
        modules: row.modules.map(mod => 
          mod.name === oldName ? { ...mod, name: newName } : mod
        )
      }));
      setPanelConfig({ ...panelConfig, rows: newRows });
    }

    // 2. Update Floor Plan Elements
    const newElements = floorPlanElements.map(el => 
      el.circuitId === oldName ? { ...el, circuitId: newName } : el
    );
    setFloorPlanElements(newElements);
  };

  const exportProject = () => {
    const data = {
      version: 3,
      timestamp: Date.now(),
      projectName,
      metadata,
      loads,
      panelConfig,
      specification,
      floorPlanElements,
      walls,
      cableRuns,
      floorPlanBackgroundImage,
      roomDimensions
    };
    return JSON.stringify(data, null, 2);
  };

  const importProject = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.projectName) setProjectName(data.projectName);
      if (data.metadata) setMetadata(data.metadata);
      if (data.loads) setLoads(data.loads);
      if (data.panelConfig) setPanelConfig(data.panelConfig);
      if (data.specification) setSpecification(data.specification);
      if (data.floorPlanElements) setFloorPlanElements(data.floorPlanElements);
      if (data.walls) setWalls(data.walls);
      if (data.cableRuns) setCableRuns(data.cableRuns);
      if (data.floorPlanBackgroundImage) setFloorPlanBackgroundImage(data.floorPlanBackgroundImage);
      if (data.roomDimensions) setRoomDimensions(data.roomDimensions);
      return true;
    } catch (e) {
      console.warn("Import warning: Failed to parse project file.", e);
      return false;
    }
  };

  const resetProject = () => {
    if(confirm("Вы уверены? Все данные текущего проекта будут удалены.")) {
      setProjectName("Новый Проект");
      setMetadata({
        clientName: '',
        projectAddress: '',
        designerName: '',
        projectDate: new Date().toISOString().split('T')[0],
        projectStage: 'ЭП',
        projectCode: 'ЭОМ-01'
      });
      setLoads([]);
      setPanelConfig(null);
      setSpecification([]);
      setFloorPlanElements([]);
      setWalls([]);
      setCableRuns([]);
      setFloorPlanBackgroundImage(null);
      setRoomDimensions({ width: 6, length: 4, ceilingHeight: 2.7 });
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <ProjectContext.Provider value={{
      projectName,
      setProjectName,
      metadata,
      setMetadata,
      loads,
      setLoads,
      updateLoadPhase,
      panelConfig,
      setPanelConfig,
      floorPlanElements,
      setFloorPlanElements,
      walls,
      setWalls,
      cableRuns,
      setCableRuns,
      floorPlanBackgroundImage,
      setFloorPlanBackgroundImage,
      roomDimensions,
      setRoomDimensions,
      specification,
      setSpecification,
      addToSpecification,
      updateSpecificationItem,
      clearSpecification,
      renameCircuit,
      exportProject,
      importProject,
      resetProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
