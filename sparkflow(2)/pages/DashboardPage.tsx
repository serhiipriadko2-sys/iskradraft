
import React, { useState } from 'react';
import { ArrowRight, Activity, Layout, CircuitBoard, DollarSign, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import ProjectSettingsModal from '../components/ProjectSettingsModal';

const DashboardPage: React.FC = () => {
  const { projectName, metadata, loads, panelConfig, specification, cableRuns, resetProject } = useProject();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Metrics
  const totalPower = loads.reduce((sum, l) => sum + (l.power * l.count), 0);
  const estimatedBudget = specification.reduce((sum, item) => sum + (item.quantity * (item.estimatedPrice || 0)), 0);
  const totalCable = cableRuns.reduce((sum, run) => sum + run.length, 0);
  const breakersCount = panelConfig?.rows.reduce((sum, row) => sum + row.modules.length, 0) || 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ProjectSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      <header className="mb-10 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold font-display text-slate-900">Дашборд</h2>
          <div className="mt-2 flex items-center gap-2 group cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
             <h3 className="text-xl font-semibold text-slate-700 border-b border-dashed border-slate-300 group-hover:border-blue-500 group-hover:text-blue-600 transition-colors">
               {projectName}
             </h3>
             <Settings className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
          </div>
          <p className="text-sm text-slate-500 mt-1">{metadata.projectAddress || 'Адрес не указан'} | {metadata.clientName || 'Заказчик не указан'}</p>
        </div>
        <div className="text-right hidden sm:block">
           <div className="text-sm text-slate-400">Стадия</div>
           <div className="font-bold text-slate-800">{metadata.projectStage}</div>
           <div className="text-xs text-slate-400">{metadata.projectCode}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Power Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-6 shadow-lg shadow-blue-900/20 relative overflow-hidden group">
          <Activity className="w-8 h-8 mb-4 opacity-80" />
          <h3 className="text-lg font-bold font-display mb-1 opacity-90">Нагрузка</h3>
          <p className="text-3xl font-bold font-display mb-4">{totalPower.toFixed(2)} <span className="text-lg font-normal opacity-70">кВт</span></p>
          <Link to="/ai-tools" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium backdrop-blur-sm">
            Анализ <ArrowRight className="w-3 h-3" />
          </Link>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
        </div>
        
        {/* Budget Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-emerald-300 transition-colors group">
          <DollarSign className="w-8 h-8 mb-4 text-emerald-500 bg-emerald-50 p-1.5 rounded-lg" />
          <h3 className="text-lg font-bold font-display text-slate-900 mb-1">Бюджет</h3>
          <p className="text-3xl font-bold font-display mb-4 text-slate-700">
            {estimatedBudget > 0 ? (estimatedBudget / 1000).toFixed(1) + 'к' : '0'} <span className="text-lg font-normal text-slate-400">₽</span>
          </p>
          <Link to="/reports" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-medium transition-colors text-sm">
            Спецификация <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Cable Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-amber-300 transition-colors">
          <Layout className="w-8 h-8 mb-4 text-amber-500 bg-amber-50 p-1.5 rounded-lg" />
          <h3 className="text-lg font-bold font-display text-slate-900 mb-1">Кабель</h3>
          <p className="text-3xl font-bold font-display mb-4 text-slate-700">{totalCable.toFixed(0)} <span className="text-lg font-normal text-slate-400">м</span></p>
          <Link to="/floor-plan" className="inline-flex items-center gap-2 text-slate-500 hover:text-amber-600 font-medium transition-colors text-sm">
            На план <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Panel Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-purple-300 transition-colors">
          <CircuitBoard className="w-8 h-8 mb-4 text-purple-500 bg-purple-50 p-1.5 rounded-lg" />
          <h3 className="text-lg font-bold font-display text-slate-900 mb-1">Щит</h3>
          <p className="text-3xl font-bold font-display mb-4 text-slate-700">{breakersCount} <span className="text-lg font-normal text-slate-400">мод.</span></p>
          <Link to="/panel-schedule" className="inline-flex items-center gap-2 text-slate-500 hover:text-purple-600 font-medium transition-colors text-sm">
            Схема <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
      
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h3 className="text-lg font-bold font-display text-slate-900 mb-4">Быстрые действия</h3>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
             <Link to="/ai-tools" className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors group">
               <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                 <Activity className="w-5 h-5" />
               </div>
               <div>
                 <div className="font-semibold text-slate-900">Рассчитать нагрузку</div>
                 <div className="text-sm text-slate-500">Добавить потребителей и получить расчет мощности</div>
               </div>
               <ArrowRight className="w-5 h-5 text-slate-300 ml-auto group-hover:text-blue-500" />
             </Link>

             <Link to="/floor-plan" className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors group">
               <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                 <Layout className="w-5 h-5" />
               </div>
               <div>
                 <div className="font-semibold text-slate-900">Трассировка кабеля</div>
                 <div className="text-sm text-slate-500">Загрузить план и проложить линии</div>
               </div>
               <ArrowRight className="w-5 h-5 text-slate-300 ml-auto group-hover:text-amber-500" />
             </Link>

             <Link to="/panel-schedule" className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors group">
               <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                 <CircuitBoard className="w-5 h-5" />
               </div>
               <div>
                 <div className="font-semibold text-slate-900">Собрать щит</div>
                 <div className="text-sm text-slate-500">Скомпоновать автоматы и УЗО на DIN-рейке</div>
               </div>
               <ArrowRight className="w-5 h-5 text-slate-300 ml-auto group-hover:text-purple-500" />
             </Link>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold font-display text-slate-900 mb-4">Статус системы</h3>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
             <div className="flex items-center justify-between text-sm">
               <span className="text-slate-500">Хранилище</span>
               <span className="font-mono font-medium text-slate-700">Local Storage</span>
             </div>
             <div className="flex items-center justify-between text-sm">
               <span className="text-slate-500">Версия норм</span>
               <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">СП 31-110-2003</span>
             </div>
             <div className="flex items-center justify-between text-sm">
               <span className="text-slate-500">Экспорт</span>
               <span className="font-medium text-slate-700">JSON, CSV, SVG</span>
             </div>
             
             <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Settings className="w-3 h-3"/> Настройки проекта
                </button>
                <button 
                  onClick={resetProject} 
                  className="w-full py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
                >
                  Сбросить все данные
                </button>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
