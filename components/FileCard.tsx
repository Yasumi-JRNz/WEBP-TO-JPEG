import React from 'react';
import { FileItem, ConversionStatus } from '../types';
import { CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

interface FileCardProps {
  item: FileItem;
  onRemove: (id: string) => void;
}

const FileCard: React.FC<FileCardProps> = ({ item, onRemove }) => {
  return (
    <div className="relative group flex items-center p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
      
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-12 h-12 bg-slate-900 rounded overflow-hidden mr-4 border border-slate-700">
        <img 
          src={item.previewUrl} 
          alt={item.file.name} 
          className="w-full h-full object-cover opacity-80"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-slate-200 truncate" title={item.file.name}>
          {item.file.name}
        </p>
        <p className="text-xs text-slate-500">
          {(item.file.size / 1024).toFixed(1)} KB
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center">
        {item.status === ConversionStatus.IDLE && (
          <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded">Ready</span>
        )}
        {item.status === ConversionStatus.CONVERTING && (
          <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
        )}
        {item.status === ConversionStatus.COMPLETED && (
          <CheckCircle className="w-5 h-5 text-green-500" />
        )}
        {item.status === ConversionStatus.ERROR && (
          <div className="flex items-center text-red-400" title={item.error}>
            <AlertCircle className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Remove Button (Only visible if not converting) */}
      {item.status !== ConversionStatus.CONVERTING && (
        <button
          onClick={() => onRemove(item.id)}
          className="absolute -top-2 -right-2 bg-slate-700 text-slate-300 hover:bg-red-500 hover:text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-md"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default FileCard;