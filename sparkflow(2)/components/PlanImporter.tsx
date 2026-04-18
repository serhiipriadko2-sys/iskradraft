
import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, FileText, Image as ImageIcon, Check, Wand2, AlertTriangle } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { recognizePlanFromImage } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface PlanImporterProps {
  onClose: () => void;
}

const PlanImporter: React.FC<PlanImporterProps> = ({ onClose }) => {
  const { setFloorPlanElements, setWalls, setRoomDimensions, setFloorPlanBackgroundImage } = useProject();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('Ожидание файла...');
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
       setFileType('pdf');
       await processPdf(file);
    } else if (file.type.startsWith('image/')) {
       setFileType('image');
       const reader = new FileReader();
       reader.onload = (e) => setPreviewUrl(e.target?.result as string);
       reader.readAsDataURL(file);
    } else {
       alert('Формат не поддерживается. Используйте PDF, JPG или PNG.');
    }
  };

  const processPdf = async (file: File) => {
    setStatus('Чтение PDF...');
    try {
       const arrayBuffer = await file.arrayBuffer();
       const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
       const page = await pdf.getPage(1); // Get first page
       
       const viewport = page.getViewport({ scale: 2.0 }); // High res for AI
       const canvas = document.createElement('canvas');
       const context = canvas.getContext('2d');
       canvas.height = viewport.height;
       canvas.width = viewport.width;

       if (context) {
           await page.render({ canvasContext: context, viewport: viewport }).promise;
           const imgData = canvas.toDataURL('image/jpeg', 0.8);
           setPreviewUrl(imgData);
           setStatus('PDF конвертирован в изображение');
       }
    } catch (e) {
       console.error(e);
       alert('Ошибка чтения PDF. Попробуйте конвертировать в картинку вручную.');
    }
  };

  const handleAnalyze = async () => {
    if (!previewUrl) return;
    
    setIsProcessing(true);
    setStatus('Отправка в Gemini Vision...');
    
    try {
       // Remove data:image/jpeg;base64, header
       const base64 = previewUrl.split(',')[1];
       
       setStatus('ИИ ищет стены и электрику...');
       const result = await recognizePlanFromImage(base64);
       
       setStatus('Применение данных...');
       
       // Update Context
       setFloorPlanBackgroundImage(previewUrl); // Set as background trace
       setWalls(result.walls);
       setFloorPlanElements(result.elements);
       if (result.width && result.length) {
           setRoomDimensions({ 
               width: result.width, 
               length: result.length, 
               ceilingHeight: 2.7 
           });
       }
       
       onClose();
       alert(`Распознано: ${result.walls.length} стен, ${result.elements.length} элементов.`);
       
    } catch (e) {
       console.error(e);
       alert('Ошибка распознавания. Попробуйте более четкое изображение.');
       setStatus('Ошибка');
    } finally {
       setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <div>
             <h3 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600"/>
                Импорт Плана (PDF/Image)
             </h3>
             <p className="text-xs text-slate-500 mt-1">AI автоматически найдет стены, двери и розетки</p>
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X/></button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center">
           {!previewUrl ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-64 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all group"
              >
                 <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-blue-500"/>
                 </div>
                 <p className="font-medium text-slate-700">Нажмите для загрузки файла</p>
                 <p className="text-xs text-slate-400 mt-1">Поддерживается PDF, PNG, JPG</p>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept="image/*,.pdf"
                   onChange={handleFileChange}
                 />
              </div>
           ) : (
              <div className="w-full space-y-4">
                 <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-80 flex items-center justify-center">
                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-80 object-contain" />
                    <button 
                      onClick={() => { setPreviewUrl(null); setFileType(null); }}
                      className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white text-slate-600 shadow-sm"
                    >
                       <X className="w-4 h-4"/>
                    </button>
                 </div>
                 
                 <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-3 text-sm text-amber-800">
                    <AlertTriangle className="w-5 h-5 shrink-0"/>
                    <p>
                       ИИ попытается распознать стены и масштаб. 
                       <br/>
                       <strong>Внимание:</strong> Текущий план будет перезаписан! Изображение будет установлено как подложка.
                    </p>
                 </div>

                 {isProcessing && (
                    <div className="flex items-center justify-center gap-3 py-4 text-blue-600 font-medium animate-pulse">
                       <Loader2 className="w-5 h-5 animate-spin"/>
                       {status}
                    </div>
                 )}
              </div>
           )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Отмена</button>
           <button 
             onClick={handleAnalyze}
             disabled={!previewUrl || isProcessing}
             className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
           >
              <Wand2 className="w-4 h-4"/>
              Распознать (AI)
           </button>
        </div>
      </div>
    </div>
  );
};

export default PlanImporter;
