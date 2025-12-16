
import React from 'react';
import { X, Save, User, MapPin, Calendar, Hash, Ruler, ArrowUpFromLine, Scaling } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ isOpen, onClose }) => {
  const { projectName, setProjectName, metadata, setMetadata, roomDimensions, setRoomDimensions } = useProject();

  if (!isOpen) return null;

  const handleChange = (field: keyof typeof metadata, value: string) => {
    setMetadata({ ...metadata, [field]: value });
  };

  const handleDimChange = (field: keyof typeof roomDimensions, value: number) => {
    setRoomDimensions({ ...roomDimensions, [field]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
          <h3 className="text-xl font-bold font-display text-slate-800">Настройки Проекта</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-6 space-y-8 overflow-y-auto">
          
          {/* Section: General Info */}
          <section className="space-y-4">
             <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Общая информация</h4>
             
             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Название проекта</label>
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                  placeholder="Квартира на Ленина, 5"
                />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3"/> Заказчик
                  </label>
                  <input 
                    type="text" 
                    value={metadata.clientName}
                    onChange={(e) => handleChange('clientName', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="Иванов И.И."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3"/> Проектировщик
                  </label>
                  <input 
                    type="text" 
                    value={metadata.designerName}
                    onChange={(e) => handleChange('designerName', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="Петров А.В."
                  />
                </div>
             </div>

             <div>
                <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3"/> Адрес объекта
                </label>
                <input 
                  type="text" 
                  value={metadata.projectAddress}
                  onChange={(e) => handleChange('projectAddress', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="г. Москва, ул. Строителей, д. 10, кв. 25"
                />
             </div>
          </section>

          {/* Section: Geometry */}
          <section className="space-y-4">
             <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                <Scaling className="w-4 h-4"/> Геометрия и Размеры
             </h4>
             
             <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 grid grid-cols-3 gap-6">
                <div>
                   <label className="block text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                     <Ruler className="w-3 h-3"/> Ширина (X)
                   </label>
                   <div className="relative">
                      <input 
                        type="number" 
                        value={roomDimensions.width}
                        onChange={(e) => handleDimChange('width', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 text-lg font-bold text-slate-800 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                        step="0.1"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">м</span>
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                     <Ruler className="w-3 h-3 rotate-90"/> Длина (Y)
                   </label>
                   <div className="relative">
                      <input 
                        type="number" 
                        value={roomDimensions.length}
                        onChange={(e) => handleDimChange('length', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 text-lg font-bold text-slate-800 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                        step="0.1"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">м</span>
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                     <ArrowUpFromLine className="w-3 h-3"/> Потолок (H)
                   </label>
                   <div className="relative">
                      <input 
                        type="number" 
                        value={roomDimensions.ceilingHeight}
                        onChange={(e) => handleDimChange('ceilingHeight', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 text-lg font-bold text-slate-800 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                        step="0.05"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">м</span>
                   </div>
                </div>
             </div>
             <p className="text-xs text-slate-500 ml-1">
                * Размеры рабочего поля влияют на масштаб плана и расчет длин кабелей. 
                Высота потолка используется для расчета вертикальных спусков (штроб) к розеткам.
             </p>
          </section>

          {/* Section: Meta */}
          <section className="space-y-4">
             <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Документация</h4>
             <div className="grid grid-cols-3 gap-4">
               <div>
                 <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                   <Hash className="w-3 h-3"/> Шифр
                 </label>
                 <input 
                   type="text" 
                   value={metadata.projectCode}
                   onChange={(e) => handleChange('projectCode', e.target.value)}
                   className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                   <Calendar className="w-3 h-3"/> Дата
                 </label>
                 <input 
                   type="date" 
                   value={metadata.projectDate}
                   onChange={(e) => handleChange('projectDate', e.target.value)}
                   className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-600 mb-1">Стадия</label>
                 <select 
                   value={metadata.projectStage}
                   onChange={(e) => handleChange('projectStage', e.target.value)}
                   className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                 >
                   <option value="ЭП">Эскиз (ЭП)</option>
                   <option value="РД">Рабочая (РД)</option>
                 </select>
               </div>
             </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-slate-100 flex-shrink-0 bg-slate-50">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Применить настройки
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsModal;
