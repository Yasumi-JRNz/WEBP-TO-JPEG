export enum ConversionStatus {
  IDLE = 'IDLE',
  CONVERTING = 'CONVERTING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface FileItem {
  id: string;
  file: File;
  previewUrl: string;
  status: ConversionStatus;
  convertedBlob?: Blob;
  error?: string;
}

export interface ProcessingStats {
  total: number;
  completed: number;
  failed: number;
}
