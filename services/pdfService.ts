import { jsPDF } from 'jspdf';
import { PdfOptions } from '../types';

const MARGIN_SIZES: Record<string, number> = {
  none: 0,
  small: 10, // mm
  big: 25,   // mm
};

const PAGE_SIZE = {
  a4: {
    width: 210,
    height: 297,
  }
};

const getImageData = (file: File): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      // Draw to canvas to ensure consistent format (JPEG) and handle transparency
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas context failed'));
        return;
      }

      // White background for PDFs
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      URL.revokeObjectURL(objectUrl);
      resolve({ dataUrl, width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
};

export const generatePdf = async (
  files: File[], 
  options: PdfOptions, 
  onProgress: (index: number) => void
): Promise<Blob> => {
  const { margin, orientation } = options;
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4',
  });

  const marginSize = MARGIN_SIZES[margin];
  
  // Determine page dimensions based on orientation
  const pageWidth = orientation === 'portrait' ? PAGE_SIZE.a4.width : PAGE_SIZE.a4.height;
  const pageHeight = orientation === 'portrait' ? PAGE_SIZE.a4.height : PAGE_SIZE.a4.width;

  const contentWidth = pageWidth - (marginSize * 2);
  const contentHeight = pageHeight - (marginSize * 2);

  for (let i = 0; i < files.length; i++) {
    onProgress(i);
    
    // Add new page for subsequent images
    if (i > 0) {
      doc.addPage();
    }

    try {
      const { dataUrl, width, height } = await getImageData(files[i]);
      
      // Calculate aspect ratio to fit within content area
      const imgRatio = width / height;
      const pageRatio = contentWidth / contentHeight;
      
      let finalWidth = contentWidth;
      let finalHeight = contentWidth / imgRatio;

      if (finalHeight > contentHeight) {
        finalHeight = contentHeight;
        finalWidth = contentHeight * imgRatio;
      }

      // Center the image
      const x = marginSize + (contentWidth - finalWidth) / 2;
      const y = marginSize + (contentHeight - finalHeight) / 2;

      doc.addImage(dataUrl, 'JPEG', x, y, finalWidth, finalHeight);
    } catch (error) {
      console.error(`Failed to add image ${i} to PDF`, error);
      // We continue even if one image fails, potentially adding a blank page or text
      doc.text(`Error loading image: ${files[i].name}`, 10, 10);
    }
  }

  return doc.output('blob');
};
