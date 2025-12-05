import JSZip from 'jszip';

/**
 * Converts a WebP file to a JPEG Blob using HTML Canvas.
 */
export const convertWebPToJpeg = (file: File, quality: number = 0.9): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Fill white background for transparency handling (JPEGs don't support alpha)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Conversion failed'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
};

/**
 * Zips multiple blobs and triggers a download.
 */
export const zipAndDownload = async (files: { name: string; blob: Blob }[]): Promise<void> => {
  const zip = new JSZip();

  files.forEach((file) => {
    // Ensure the filename ends in .jpg
    const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    zip.file(fileName, file.blob);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `converted_images_${new Date().getTime()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
};
