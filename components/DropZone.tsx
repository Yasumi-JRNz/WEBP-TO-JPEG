import React, { useCallback, useState } from 'react';
import { Upload, FileImage, Plus } from 'lucide-react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  compact?: boolean;
  title?: string;
  accept?: string;
}

const DropZone: React.FC<DropZoneProps> = ({ 
  onFilesAdded, 
  compact = false, 
  title, 
  accept = 'image/webp' 
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = useCallback((file: File) => {
    if (accept === 'image/*') {
      return file.type.startsWith('image/');
    }
    const acceptedTypes = accept.split(',').map(t => t.trim());
    return acceptedTypes.includes(file.type);
  }, [accept]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = (Array.from(e.dataTransfer.files) as File[]).filter(validateFile);
      
      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      } else {
        if (e.dataTransfer.files.length > 0) {
           const msg = accept === 'image/webp' ? 'Please drop WebP images only.' : 'Please drop image files only.';
           alert(msg);
        }
      }
    }
  }, [onFilesAdded, validateFile, accept]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = (Array.from(e.target.files) as File[]).filter(validateFile);
      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      }
    }
  }, [onFilesAdded, validateFile]);

  if (compact) {
    return (
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex items-center justify-center border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer
          ${isDragging 
            ? 'border-brand-500 bg-brand-500/10' 
            : 'border-slate-600 hover:border-brand-500 hover:bg-slate-800'
          }`}
      >
        <input
          type="file"
          multiple
          accept={accept}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileInput}
        />
        <div className="flex items-center space-x-2 text-slate-300">
           <Plus className="w-5 h-5" />
           <span className="text-sm font-medium">Add more files</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative group flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out cursor-pointer overflow-hidden
        ${isDragging 
          ? 'border-brand-500 bg-brand-500/10 scale-[1.01]' 
          : 'border-slate-700 bg-slate-800/50 hover:border-brand-500 hover:bg-slate-800'
        }
      `}
    >
      <input
        type="file"
        multiple
        accept={accept}
        className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
        onChange={handleFileInput}
      />
      
      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center pointer-events-none z-20">
        <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-brand-500 text-white' : 'bg-slate-700 text-brand-500 group-hover:bg-brand-500 group-hover:text-white'}`}>
          <Upload className="w-8 h-8" />
        </div>
        <p className="mb-2 text-xl font-semibold text-slate-200">
          {title || "Drop WebP files here"}
        </p>
        <p className="text-sm text-slate-400">
          or click to browse from your device
        </p>
      </div>

      {/* Background decoration */}
      <div className="absolute -right-10 -bottom-10 opacity-5">
        <FileImage className="w-48 h-48" />
      </div>
    </div>
  );
};

export default DropZone;