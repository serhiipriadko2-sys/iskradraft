import React, { useState } from 'react';
import { ShieldCheck, FileText, Send, Loader2 } from 'lucide-react';
import { checkCompliance } from '../services/geminiService';

const ComplianceChecker: React.FC = () => {
  const [description, setDescription] = useState('');
  const [report, setReport] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCheck = async () => {
    if (!description.trim()) return;
    setIsLoading(true);
    try {
      const result = await checkCompliance(description);
      setReport(result);
    } catch (e) {
      alert("Ошибка проверки.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
      <div className="flex flex-col gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
          <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            Описание проекта
          </h3>
          <textarea
            className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 resize-none font-mono text-sm"
            placeholder="Опишите вашу схему, например: 'В ванной установлена розетка IP44 без УЗО, кабель ВВГнг 3х1.5, автомат 25А...'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="mt-4 flex justify-end">
             <button
              onClick={handleCheck}
              disabled={isLoading || !description}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition-all
                ${isLoading || !description ? 'bg-slate-300' : 'bg-slate-900 hover:bg-slate-800'}
              `}
             >
               {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
               Проверить нормы
             </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-auto">
        <h3 className="font-display font-semibold mb-4 flex items-center gap-2 text-slate-900">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          Отчет нормоконтроля
        </h3>
        
        {report ? (
          <div className="prose prose-sm prose-slate max-w-none">
            <div dangerouslySetInnerHTML={{ 
              __html: report
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br/>') 
            }} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
            <ShieldCheck className="w-16 h-16 mb-4 stroke-1" />
            <p>Результат проверки появится здесь</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceChecker;
