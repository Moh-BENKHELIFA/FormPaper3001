import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface PDFViewerProps {
  paperId: number;
  className?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ paperId, className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    // Construire l'URL du PDF
    const url = `/api/papers/${paperId}/pdf`;
    setPdfUrl(url);
    setIsLoading(true);
    setHasError(false);
  }, [paperId]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            PDF non disponible
          </h3>
          <p className="text-gray-500">
            Le PDF de cet article n'a pas pu être chargé.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-white ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Chargement du PDF...</p>
          </div>
        </div>
      )}

      <iframe
        src={pdfUrl}
        className="w-full h-full border-0"
        title="PDF Viewer"
        onLoad={handleLoad}
        onError={handleError}
        style={{ minHeight: '100%' }}
      />
    </div>
  );
};

export default PDFViewer;