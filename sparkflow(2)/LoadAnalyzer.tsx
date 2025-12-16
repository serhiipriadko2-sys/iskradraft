
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Zap, Activity, Cpu, AlertTriangle, Loader2, Save, Check, Wand2, X } from 'lucide-react';
import { LoadItem, AnalysisResult, SpecificationItem } from '../types';
import { analyzeElectricalLoads, parseLoadsFromText } from '../services/geminiService';
import { useProject } from '../context/ProjectContext';

const LoadAnalyzer: React.FC = () => {
  const { loads, setLoads, addToSpecification } = useProject();
  
  // Initialize with some defaults if empty
  useEffect(() => {
    if (loads.length === 0) {
      setLoads([
        { id: '1', name: 'Освещение (LED)', power: 0.15, count: 10, category: 'lighting' },
        { id: '2', name: 'Розетки (Общие)', power: 0.3, count: 8, category: 'socket' },
        { id: '3', name: 'Стиральная машина', power: 2.2, count: 1, category: 'heavy' },
      ]);
    }
  }, []);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const addLoad = () => {
    const newLoad: LoadItem = {
      id: Date.now().toString(),
      name: 'Новый потребитель',
      power: 0.1,
      count: 1,
      category: 'socket',
    };
    setLoads([...loads, newLoad]);
    setResult(null); // Clear previous result on change
    setIsSaved(false);
  };

  const handleSmartImport = async () => {
    if (!importText.trim()) return;
    setImportLoading(true);
    try {
        const parsedLoads = await parseLoadsFromText(importText);
        // Generate unique IDs
        const loadsWithIds = parsedLoads.map((l, i) => ({
            ...l,
            id: `imported-${Date.now()}-${i}`
        }));
        setLoads(prev => [...prev, ...loadsWithIds]);
        setIsImporting(false);
        setImportText('');
    } catch (e) {
        alert("Не удалось распознать текст. Попробуйте упростить описание.");
    } finally {
        setImportLoading(false);
    }
  };

  const updateLoad = (id: string, field: keyof LoadItem, value: any) => {
    setLoads(loads.map(l => l.id === id ? { ...l, [field]: value } : l));
    setResult(null);
    setIsSaved(false);
  };

  const removeLoad = (id: string) => {
    setLoads(loads.filter(l => l.id !== id));
    setResult(null);
    setIsSaved(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setIsSaved(false);
    try {
      const analysis = await analyzeElectricalLoads(loads);
      setResult(analysis);
    } catch (error) {
      alert("Ошибка анализа. Проверьте API ключ или интернет-соединение.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToProject = () => {
    if (!result) return;
    
    // Convert suggestions to Specification Items
    const newItems: SpecificationItem[] = [];
    
    result.suggestedGroups.forEach((group, idx) => {
      // 1. Add Breaker
      newItems.push({
        id: `brk-${Date.now()}-${idx}`,
        category: 'Protection',
        name: `Автомат. выключатель 1P ${group.breaker}`,
        model: `VA-${group.breaker}`,
        unit: 'шт',
        quantity: 1,
        estimatedPrice: 350
      });
      
      // 2. Add Cable (Assume avg 15m per group for estimation)
      newItems.push({
        id: `cbl-${Date.now()}-${idx}`,
        category: 'Cable',
        name: `Кабель силовой ${group.cable}`,
        unit: 'м',
        quantity: 15,
        estimatedPrice: 80
      });
    });

    addToSpecification(newItems);
    setIsSaved(true);
  };

  return (
    <div className="space-y-6 relative">
      {/* Import Modal */}
      {isImporting && (
          <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-xl flex items-center justify-center p-6 animate-fade-in">
             <div className="w-full max-w-lg bg-white shadow-2xl rounded-2xl border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-display font-bold text-lg flex items-center gap-2">
                      <Wand2 className="w-5 h-5 text-purple-600"/> 
                      Умный импорт (AI)
                   </h3>
                   <button onClick={() => setIsImporting(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5"/>
                   </button>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                   Вставьте описание комнаты или список техники. Например: 
                   <span className="italic bg-slate-100 px-1 rounded">"Кухня: электроплита, духовка, холодильник, 5 розеток на фартуке и люстра"</span>
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 mb-4 resize-none"
                  placeholder="Опишите нагрузки здесь..."
                />
                <button
                  onClick={handleSmartImport}
                  disabled={importLoading || !importText.trim()}
                  className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                   {importLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                   Распознать и добавить
                </button>
             </div>
          </div>
      )}

      {/* Input Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold font-display flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Список потребителей
          </h3>
          <div className="flex gap-2">
             <button
                onClick={() => setIsImporting(true)}
                className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors text-sm font-medium border border-purple-200"
              >
                <Wand2 className="w-4 h-4" />
                Импорт текста
              </button>
              <button
                onClick={addLoad}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-slate-500 px-2">
            <div className="col-span-5">Наименование</div>
            <div className="col-span-2">Мощность (кВт)</div>
            <div className="col-span-2">Кол-во</div>
            <div className="col-span-2">Категория</div>
            <div className="col-span-1"></div>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
            {loads.map((load) => (
                <div key={load.id} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-lg group border border-transparent hover:border-slate-200 transition-colors">
                <div className="col-span-5">
                    <input
                    type="text"
                    value={load.name}
                    onChange={(e) => updateLoad(load.id, 'name', e.target.value)}
                    className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none px-1 transition-colors font-medium"
                    />
                </div>
                <div className="col-span-2">
                    <input
                    type="number"
                    step="0.1"
                    value={load.power}
                    onChange={(e) => updateLoad(load.id, 'power', parseFloat(e.target.value))}
                    className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none px-1 transition-colors"
                    />
                </div>
                <div className="col-span-2">
                    <input
                    type="number"
                    value={load.count}
                    onChange={(e) => updateLoad(load.id, 'count', parseInt(e.target.value))}
                    className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none px-1 transition-colors"
                    />
                </div>
                <div className="col-span-2">
                    <select
                    value={load.category}
                    onChange={(e) => updateLoad(load.id, 'category', e.target.value)}
                    className="w-full bg-transparent text-sm outline-none cursor-pointer"
                    >
                    <option value="lighting">Освещение</option>
                    <option value="socket">Розетки</option>
                    <option value="heavy">Силовое</option>
                    <option value="hvac">Климат</option>
                    </select>
                </div>
                <div className="col-span-1 flex justify-end">
                    <button
                    onClick={() => removeLoad(load.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                    <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                </div>
            ))}
            {loads.length === 0 && (
                <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                    Список пуст. Добавьте нагрузки вручную или используйте AI-импорт.
                </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || loads.length === 0}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all
              ${isAnalyzing 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-blue-300 transform hover:-translate-y-0.5'}
            `}
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cpu className="w-5 h-5" />}
            {isAnalyzing ? 'Анализирую нормы СП 31-110...' : 'Рассчитать нагрузки'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 text-white p-5 rounded-xl">
              <div className="text-slate-400 text-sm mb-1">Установленная мощность (Pi)</div>
              <div className="text-2xl font-bold font-display">{result.totalInstalledPower.toFixed(2)} кВт</div>
            </div>
            <div className="bg-blue-600 text-white p-5 rounded-xl shadow-lg shadow-blue-200">
              <div className="text-blue-100 text-sm mb-1">Расчетная мощность (Pp)</div>
              <div className="text-2xl font-bold font-display">{result.designPower.toFixed(2)} кВт</div>
              <div className="text-xs mt-1 opacity-80">Кс = {result.demandFactor.toFixed(2)}</div>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-xl">
              <div className="text-slate-500 text-sm mb-1">Расчетный ток (Ip)</div>
              <div className="text-2xl font-bold font-display text-slate-900">{result.designCurrent.toFixed(1)} А</div>
            </div>
             <div className="bg-white border border-slate-200 p-5 rounded-xl">
              <div className="text-slate-500 text-sm mb-1">Коэффициент мощности</div>
              <div className="text-2xl font-bold font-display text-slate-900">{result.powerFactor.toFixed(2)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 relative">
              <div className="flex justify-between items-center mb-4">
                 <h4 className="font-display font-semibold text-lg">Рекомендуемые группы (Щит)</h4>
                 <button 
                  onClick={handleSaveToProject}
                  disabled={isSaved}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors 
                    ${isSaved ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}
                  `}
                 >
                   {isSaved ? <><Check className="w-4 h-4"/> Добавлено в проект</> : <><Save className="w-4 h-4"/> В спецификацию</>}
                 </button>
              </div>
              
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-4 py-3">Группа</th>
                      <th className="px-4 py-3">Нагрузка</th>
                      <th className="px-4 py-3">Автомат</th>
                      <th className="px-4 py-3">Кабель</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.suggestedGroups.map((group, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">{group.name}</td>
                        <td className="px-4 py-3 text-slate-600">{group.load} кВт</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-50 text-amber-700 font-medium text-xs">
                            {group.breaker}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">{group.cable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-6">
              <h4 className="font-display font-semibold text-lg mb-4 text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Рекомендации СП 31-110
              </h4>
              <ul className="space-y-3">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-amber-800 flex gap-2 items-start">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadAnalyzer;
