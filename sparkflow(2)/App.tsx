
import React from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import AIToolsPage from './pages/AIToolsPage';
import FloorPlanPage from './pages/FloorPlanPage';
import PanelSchedulePage from './pages/PanelSchedulePage';
import ReportsPage from './pages/ReportsPage';
import { ProjectProvider } from './context/ProjectContext';

const App: React.FC = () => {
  return (
    <ProjectProvider>
      <MemoryRouter>
        <div className="flex min-h-screen bg-slate-50 flex-col md:flex-row">
          <Sidebar />
          <main className="flex-1 overflow-auto pt-16 md:pt-0">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/ai-tools" element={<AIToolsPage />} />
              <Route path="/floor-plan" element={<FloorPlanPage />} />
              <Route path="/panel-schedule" element={<PanelSchedulePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              {/* Placeholders for other routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </MemoryRouter>
    </ProjectProvider>
  );
};

export default App;
