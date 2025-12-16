
import React, { useState } from 'react';
import { Settings, Zap, CheckCircle2, AlertTriangle, Loader2, Thermometer, Box } from 'lucide-react';
import { ComponentRequest, ComponentResult, DeratingFactors } from '../types';
import { selectComponent } from '../services/geminiService';
import { calculateDeratedCapacity, getBaseCableCapacity } from '../utils/electricalFormulas';

const ComponentSelector: React.FC = () => {
  const [request, setRequest] = useState<ComponentRequest>({
    loadCurrent: 10,
    length: 15,
    installationMethod: 'hidden',
    voltage: 220,
    derating: { tempCoeff: 1.0, groupCoeff: 1.0 }
  });
  const [result, setResult] = useState<ComponentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Manual Calculation Bypass to make it instant for simple checks, 
  // keeping Gemini for complex validation or fallback.
  // For now, we stick to the provided AI flow but display derating info visually.

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const data = await selectComponent(request);
      setResult(data);
    } catch (e) {
      alert("Ошибка подбора. Попробуйте еще раз.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateDerating = (field: keyof DeratingFactors, value: number) => {
    setRequest(prev => ({
      ...prev,
      derating: { ...prev.derating!, [field]: value }
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Input Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold font-display flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-blue-500" />
          Параметры линии
        </h3>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ток нагрузки (А)</label>
              <input
                type="number"
                value={request.loadCurrent}
                onChange={(e) => setRequest({...request, loadCurrent: Number(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Длина (м)</label>
              <input
                type="number"
                value={request.length}
                onChange={(e) => setRequest({...request, length: Number(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Напряжение</label>
              <select
                value={request.voltage}
                onChange={(e) => setRequest({...request, voltage: Number(e.target.value) as 220 | 380})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-colors"
              >
                <option value={220}>220 В (1 фаза)</option>
                <option value={380}>380 В (3 фазы)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Прокладка</label>
              <select
                value={request.installationMethod}
                onChange={(e) => setRequest({...request, installationMethod: e.target.value as any})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-colors"
              >
                <option value="hidden">Скрытая (штроба)</option>
                <option value="open">Открытая</option>
                <option value="conduit">В трубе/гофре</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
             <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
               Поправочные коэффициенты (ГОСТ Р 50571)
             </label>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                   <div className="flex items-center gap-1 text-xs text-amber-800 mb-1"><Thermometer className="w-3 h-3"/> Температура</div>
                   <select 
                    value={request.derating?.tempCoeff}
                    onChange={(e) => updateDerating('tempCoeff', Number(e.target.value))}
                    className="w-full bg-white text-sm border-none rounded shadow-sm py-1"
                   >
                     <option value={1.0}>25°C (Норма)</option>
                     <option value={0.94}>30°C (K=0.94)</option>
                     <option value={0.88}>35°C (K=0.88)</option>
                     <option value={0.82}>40°C (K=0.82)</option>
                   </select>
                </div>
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                   <div className="flex items-center gap-1 text-xs text-slate-600 mb-1"><Box className="w-3 h-3"/> Группировка</div>
                   <select 
                    value={request.derating?.groupCoeff}
                    onChange={(e) => updateDerating('groupCoeff', Number(e.target.value))}
                    className="w-full bg-white text-sm border-none rounded shadow-sm py-1"
                   >
                     <option value={1.0}>Одиночно</option>
                     <option value={0.85}>Пучок 2 шт</option>
                     <option value={0.79}>Пучок 3 шт</option>
                     <option value={0.75}>Пучок 4 шт</option>
                   </select>
                </div>
             </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all shadow-md mt-4
              ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}
            `}
          >
            {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin w-4 h-4"/> Считаю...</span> : 'Подобрать с учетом запаса'}
          </button>
        </div>
      </div>

      {/* Result Card */}
      <div className="space-y-6">
        {result ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-fade-in relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${result.isCompliant ? 'bg-green-500' : 'bg-red-500'}`}></div>
            
            <h3 className="text-lg font-semibold font-display mb-6">Результат подбора</h3>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <div className="text-sm text-slate-500">Рекомендуемый кабель</div>
                  <div className="text-xl font-bold text-slate-900">{result.cableSection}</div>
                  <div className="text-xs text-slate-400">Медь, VVGng-LS</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <ShieldCheckIcon className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm text-slate-500">Автоматический выключатель</div>
                  <div className="text-xl font-bold text-slate-900">{result.breakerRating}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-2">
                 <div className="flex justify-between">
                   <span className="text-slate-500">Доп. ток кабеля (с коэф.):</span>
                   <span className="font-medium">
                      {(getBaseCableCapacity(parseFloat(result.cableSection.split('x')[1] || '2.5')) * (request.derating?.tempCoeff || 1) * (request.derating?.groupCoeff || 1)).toFixed(1)} А
                   </span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-500">Расчетный ток нагрузки:</span>
                   <span className="font-medium">{request.loadCurrent} А</span>
                 </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                 <div className="flex justify-between items-center">
                   <span className="text-slate-600">Падение напряжения</span>
                   <span className={`font-mono font-bold ${result.voltageDrop > 4 ? 'text-red-500' : 'text-green-600'}`}>
                     {result.voltageDrop.toFixed(2)}%
                   </span>
                 </div>
                 <div className="mt-4 flex items-center gap-2">
                   {result.isCompliant ? (
                     <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                       <CheckCircle2 className="w-4 h-4" /> Соответствует ПУЭ
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm font-medium">
                       <AlertTriangle className="w-4 h-4" /> Не проходит по току или dU
                     </div>
                   )}
                 </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-8">
            <Settings className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-center">Введите параметры линии. Используйте коэффициенты, если кабель проложен в пучке или в жарком месте.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper icon
const ShieldCheckIcon = ({className}: {className?: string}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
);

export default ComponentSelector;
