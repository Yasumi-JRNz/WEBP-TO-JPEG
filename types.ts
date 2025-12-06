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

export enum AppMode {
  JPEG = 'JPEG',
  PDF = 'PDF',
}

export type PdfMargin = 'none' | 'small' | 'big';
export type PdfOrientation = 'portrait' | 'landscape';

export interface PdfOptions {
  margin: PdfMargin;
  orientation: PdfOrientation;
}
