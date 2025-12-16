
import React, { useRef, useState } from 'react';
import { LayoutDashboard, Wand2, FileText, Settings, Map, CircuitBoard, Download, Upload, Trash2, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { projectName, setProjectName, exportProject, importProject, resetProject } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { path: '/', label: 'Дашборд', icon: LayoutDashboard },
    { path: '/ai-tools', label: 'ИИ Инструменты', icon: Wand2 },
    { path: '/floor-plan', label: 'Поэтажный план', icon: Map },
    { path: '/panel-schedule', label: 'Схема щита', icon: CircuitBoard },
    { path: '/reports', label: 'Отчеты', icon: FileText },
  ];

  const handleExport = () => {
    const json = exportProject();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sparkflow-${projectName.replace(/\s+/g, '_')}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
        alert("Ошибка: Для восстановления проекта выберите файл .json.\n\nЕсли вы хотите загрузить план помещения (PDF/Картинку), перейдите в раздел 'Поэтажный план' и нажмите кнопку 'Импорт PDF'.");
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if(importProject(content)) {
          alert("Проект успешно загружен!");
        } else {
          alert("Не удалось прочитать файл проекта. Возможно, он поврежден.");
        }
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-slate-900 text-white p-4 z-50 flex justify-between items-center shadow-md">
         <div className="font-display font-bold text-lg flex items-center gap-2">
           <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-sm">S</div>
           SparkFlow
         </div>
         <button onClick={() => setIsMobileOpen(!isMobileOpen)}>
            {isMobileOpen ? <X /> : <Menu />}
         </button>
      </div>

      {/* Sidebar Container */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 z-40 pt-16 md:pt-0 print:hidden
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:block">
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">S</span>
            </div>
            SparkFlow
          </h1>
          <div className="mt-4">
             <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Проект</label>
             <input 
              type="text" 
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-slate-800 border-none rounded text-sm text-white px-2 py-1 mt-1 focus:ring-1 focus:ring-blue-500 outline-none"
             />
          </div>
        </div>

        {/* Mobile Project Name Input */}
        <div className="p-4 md:hidden border-b border-slate-800">
           <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Проект</label>
           <input 
            type="text" 
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full bg-slate-800 border-none rounded text-sm text-white px-2 py-1 mt-1 focus:ring-1 focus:ring-blue-500 outline-none"
           />
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-2 md:mt-0">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${active 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                    : 'hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <label className="text-xs uppercase tracking-wider text-slate-600 font-bold px-2">Управление</label>
          
          <button onClick={handleExport} className="flex items-center gap-3 px-4 py-2 w-full rounded-lg hover:bg-slate-800 transition-colors text-left text-sm">
            <Download className="w-4 h-4 text-slate-400" />
            <span>Скачать (.json)</span>
          </button>

          <button onClick={handleImportClick} className="flex items-center gap-3 px-4 py-2 w-full rounded-lg hover:bg-slate-800 transition-colors text-left text-sm">
            <Upload className="w-4 h-4 text-slate-400" />
            <span>Открыть</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />

          <button onClick={resetProject} className="flex items-center gap-3 px-4 py-2 w-full rounded-lg hover:bg-red-900/20 text-red-400 hover:text-red-300 transition-colors text-left text-sm mt-2">
            <Trash2 className="w-4 h-4" />
            <span>Сброс</span>
          </button>
        </div>
      </aside>
      
      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
