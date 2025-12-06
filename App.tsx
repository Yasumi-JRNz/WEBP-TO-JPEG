import React, { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FileItem, ConversionStatus, ProcessingStats, AppMode, PdfOptions } from './types';
import { convertWebPToJpeg, zipAndDownload } from './services/imageService';
import { generatePdf } from './services/pdfService';
import DropZone from './components/DropZone';
import FileCard from './components/FileCard';
import { Download, RefreshCw, Trash2, Image as ImageIcon, Zap, FileText, Settings2 } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.JPEG);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  
  const [pdfOptions, setPdfOptions] = useState<PdfOptions>({
    margin: 'small',
    orientation: 'portrait',
  });

  // Stats calculation
  const stats: ProcessingStats = useMemo(() => {
    return {
      total: files.length,
      completed: files.filter(f => f.status === ConversionStatus.COMPLETED).length,
      failed: files.filter(f => f.status === ConversionStatus.ERROR).length,
    };
  }, [files]);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const newItems: FileItem[] = newFiles.map(file => ({
      id: uuidv4(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: ConversionStatus.IDLE,
    }));
    setFiles(prev => [...prev, ...newItems]);
    setPdfBlob(null); // Reset PDF if new files added
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
    setPdfBlob(null);
  }, []);

  const handleClearAll = useCallback(() => {
    if (window.confirm("Are you sure you want to clear all files?")) {
      files.forEach(f => URL.revokeObjectURL(f.previewUrl));
      setFiles([]);
      setPdfBlob(null);
    }
  }, [files]);

  // Helper to update status
  const updateStatus = (id: string, status: ConversionStatus, extra: Partial<FileItem> = {}) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status, ...extra } : f));
  };

  const startJpegConversion = async (pendingFiles: FileItem[]) => {
    const BATCH_SIZE = 3;
    for (let i = 0; i < pendingFiles.length; i += BATCH_SIZE) {
      const batch = pendingFiles.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (item) => {
        updateStatus(item.id, ConversionStatus.CONVERTING);
        try {
          const jpegBlob = await convertWebPToJpeg(item.file);
          updateStatus(item.id, ConversionStatus.COMPLETED, { convertedBlob: jpegBlob });
        } catch (err) {
          updateStatus(item.id, ConversionStatus.ERROR, { error: 'Conversion failed' });
        }
      }));
    }
  };

  const startPdfConversion = async () => {
    // For PDF, we re-process all files to ensure order and settings
    // Visually reset them to processing
    setFiles(prev => prev.map(f => ({ ...f, status: ConversionStatus.CONVERTING })));
    
    try {
      // Use existing files array in order
      const fileObjects = files.map(f => f.file);
      
      const blob = await generatePdf(fileObjects, pdfOptions, (index) => {
         // Mark items as completed as we progress (for visual feedback)
         // Note: We are iterating through the *current* files state which might change if user interacts,
         // but since isProcessing blocks actions, safe enough.
         const itemId = files[index].id;
         updateStatus(itemId, ConversionStatus.COMPLETED);
      });
      
      setPdfBlob(blob);
    } catch (e) {
      console.error(e);
      setFiles(prev => prev.map(f => ({ ...f, status: ConversionStatus.ERROR, error: 'PDF Generation failed' })));
    }
  };

  const startConversion = useCallback(async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    if (mode === AppMode.JPEG) {
      const pendingFiles = files.filter(f => f.status === ConversionStatus.IDLE || f.status === ConversionStatus.ERROR);
      if (pendingFiles.length > 0) {
        await startJpegConversion(pendingFiles);
      }
    } else {
      await startPdfConversion();
    }

    setIsProcessing(false);
  }, [files, mode, pdfOptions]);

  const handleDownload = useCallback(async () => {
    if (mode === AppMode.JPEG) {
      const completedFiles = files.filter(f => f.status === ConversionStatus.COMPLETED && f.convertedBlob);
      if (completedFiles.length === 0) return;

      await zipAndDownload(completedFiles.map(f => ({
        name: f.file.name,
        blob: f.convertedBlob!
      })));
    } else {
      if (!pdfBlob) return;
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `converted_images_${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [files, mode, pdfBlob]);

  // Determine which files to accept based on mode
  const acceptType = mode === AppMode.PDF ? "image/*" : "image/webp";

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      
      {/* Header */}
      <header className="w-full max-w-5xl mb-8 text-center mt-8">
        <div className="inline-flex items-center justify-center p-3 bg-brand-900/30 rounded-full mb-6 border border-brand-500/20">
          <Zap className="w-6 h-6 text-brand-500 mr-2" />
          <span className="text-brand-100 font-medium">Lightning Fast Local Conversion</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
          WebP to <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-indigo-500">{mode === AppMode.JPEG ? 'JPEG' : 'PDF'}</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
          Drag, drop, and convert infinite files instantly in your browser. <br className="hidden sm:block"/>
          No servers, no upload limits, 100% private.
        </p>

        {/* Global Mode Switcher - Visible Always */}
        <div className="inline-flex bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-lg">
            <button 
            onClick={() => { setMode(AppMode.JPEG); setPdfBlob(null); }}
            disabled={isProcessing}
            className={`flex items-center justify-center px-6 py-2.5 text-sm font-bold rounded-md transition-all
                ${mode === AppMode.JPEG ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}
            `}
            >
            <ImageIcon className="w-4 h-4 mr-2" />
            JPEG Mode
            </button>
            <button 
            onClick={() => { setMode(AppMode.PDF); setFiles(prev => prev.map(f => ({...f, status: ConversionStatus.IDLE}))); }}
            disabled={isProcessing}
            className={`flex items-center justify-center px-6 py-2.5 text-sm font-bold rounded-md transition-all
                ${mode === AppMode.PDF ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}
            `}
            >
            <FileText className="w-4 h-4 mr-2" />
            PDF Mode
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-5xl flex-1 flex flex-col gap-8">
        
        {/* State: Empty */}
        {files.length === 0 && (
          <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <DropZone 
              onFilesAdded={handleFilesAdded} 
              title={mode === AppMode.PDF ? "Drop Images to create PDF" : "Drop WebP files to convert"}
              accept={acceptType}
            />
          </div>
        )}

        {/* State: Files Present */}
        {files.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full animate-in fade-in duration-500">
            
            {/* Left Column: List & Add More */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-slate-200 flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2 text-slate-500" />
                  Files ({files.length})
                </h2>
                <button 
                  onClick={handleClearAll}
                  className="text-sm text-red-400 hover:text-red-300 flex items-center transition-colors"
                  disabled={isProcessing}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Clear all
                </button>
              </div>

              {/* Scrollable List */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 h-[500px] overflow-y-auto custom-scroll">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {files.map(file => (
                    <FileCard key={file.id} item={file} onRemove={handleRemoveFile} />
                  ))}
                </div>
                {files.length === 0 && (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    No files added
                  </div>
                )}
              </div>
              
              {/* Mini Dropzone */}
              <DropZone onFilesAdded={handleFilesAdded} compact accept={acceptType} />
            </div>

            {/* Right Column: Actions & Summary */}
            <div className="lg:col-span-1">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 sticky top-8 shadow-xl">
                
                <h3 className="text-lg font-bold text-white mb-6">Action Station</h3>
                
                {/* PDF Options */}
                {mode === AppMode.PDF && (
                  <div className="mb-8 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center text-slate-300 mb-2">
                      <Settings2 className="w-4 h-4 mr-2" />
                      <span className="text-sm font-semibold">PDF Settings</span>
                    </div>
                    
                    <div>
                      <label className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-2 block">Page Margins</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['none', 'small', 'big'] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => { setPdfOptions(p => ({...p, margin: m})); setPdfBlob(null); }}
                            className={`px-2 py-2 text-xs rounded border transition-colors capitalize
                              ${pdfOptions.margin === m 
                                ? 'bg-brand-900/50 border-brand-500 text-brand-200' 
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}
                            `}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-2 block">Orientation</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['portrait', 'landscape'] as const).map((o) => (
                          <button
                            key={o}
                            onClick={() => { setPdfOptions(p => ({...p, orientation: o})); setPdfBlob(null); }}
                            className={`px-2 py-2 text-xs rounded border transition-colors capitalize
                              ${pdfOptions.orientation === o 
                                ? 'bg-brand-900/50 border-brand-500 text-brand-200' 
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}
                            `}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Total Files</span>
                    <span className="font-mono text-white">{stats.total}</span>
                  </div>
                  {mode === AppMode.JPEG && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Converted</span>
                      <span className="font-mono text-green-400">{stats.completed}</span>
                    </div>
                  )}
                  {mode === AppMode.PDF && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Status</span>
                      <span className={`font-mono ${pdfBlob ? 'text-green-400' : 'text-slate-500'}`}>
                        {pdfBlob ? 'Ready' : isProcessing ? 'Generating...' : 'Pending'}
                      </span>
                    </div>
                  )}
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-700 rounded-full h-2 mt-2 overflow-hidden">
                    <div 
                      className="bg-brand-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  {/* Conversion Button */}
                  {(!pdfBlob || mode === AppMode.JPEG) && stats.completed < stats.total && (
                    <button
                      onClick={startConversion}
                      disabled={isProcessing}
                      className={`w-full flex items-center justify-center py-3 px-4 rounded-lg font-bold text-white transition-all
                        ${isProcessing 
                          ? 'bg-slate-600 cursor-not-allowed' 
                          : 'bg-brand-600 hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-500/20 active:transform active:scale-95'
                        }`}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          {mode === AppMode.PDF ? 'Generating PDF...' : 'Converting...'}
                        </>
                      ) : (
                        <>
                          {mode === AppMode.PDF ? <FileText className="w-5 h-5 mr-2" /> : <RefreshCw className="w-5 h-5 mr-2" />}
                          {mode === AppMode.PDF ? 'Generate PDF' : 'Convert All'}
                        </>
                      )}
                    </button>
                  )}

                  {/* Download Button */}
                  {((mode === AppMode.JPEG && stats.completed > 0) || (mode === AppMode.PDF && pdfBlob)) && (
                    <button
                      onClick={handleDownload}
                      className="w-full flex items-center justify-center py-3 px-4 rounded-lg font-bold text-slate-900 bg-white hover:bg-slate-100 transition-all shadow-lg active:transform active:scale-95"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      {mode === AppMode.JPEG ? 'Download ZIP' : 'Download PDF'}
                    </button>
                  )}
                </div>
                
                <p className="mt-6 text-xs text-center text-slate-500">
                  Tip: Processing happens entirely on your device.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-16 text-slate-600 text-sm">
        WebP to JPEG & PDF Converter • Privacy First
      </footer>
    </div>
  );
};

export default App;