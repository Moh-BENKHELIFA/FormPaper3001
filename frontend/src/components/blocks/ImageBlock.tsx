import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, ExternalLink, Grid3x3 } from 'lucide-react';
import { ImageBlockData } from '../../types/BlockTypes';
import { blockFactory } from '../../utils/blockFactory';
import { imageService } from '../../services/imageService';
import { paperService } from '../../services/paperService';

interface ImageBlockProps {
  block: ImageBlockData;
  isSelected: boolean;
  isFocused: boolean;
  onUpdate: (block: ImageBlockData) => void;
  onDelete: () => void;
  onEnterPressed: () => void;
  readonly?: boolean;
  articleId?: string;
}

const ImageBlock: React.FC<ImageBlockProps> = ({
  block,
  isSelected,
  isFocused,
  onUpdate,
  onDelete,
  onEnterPressed,
  readonly = false,
  articleId,
}) => {
  const [url, setUrl] = useState(block.url || '');
  const [width, setWidth] = useState(block.width || 100);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavedImages, setShowSavedImages] = useState(false);
  const [savedImages, setSavedImages] = useState<Array<{ filename: string; url: string; path: string }>>([]);
  const [loadingSavedImages, setLoadingSavedImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(block.url || '');
    setWidth(block.width || 100);
  }, [block.url, block.alt, block.caption, block.width]);

  useEffect(() => {
    if (isFocused && !url && urlInputRef.current) {
      urlInputRef.current.focus();
    }
  }, [isFocused, url]);

  const updateBlock = (updates: Partial<ImageBlockData>) => {
    const updatedBlock = blockFactory.updateBlock(block, updates);
    onUpdate(updatedBlock);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner un fichier image valide');
      return;
    }

    if (!articleId) {
      setError('ID d\'article manquant');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const uploadResult = await imageService.uploadImage(file, articleId);

      setUrl(uploadResult.url);
      updateBlock({
        url: uploadResult.url,
        alt: 'Image',
        caption: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    updateBlock({ url: newUrl });
  };


  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value);
    setWidth(newWidth);
    updateBlock({ width: newWidth });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnterPressed();
    }

    if (e.key === 'Backspace' && !url && !readonly) {
      e.preventDefault();
      onDelete();
    }
  };

  const handleRemoveImage = () => {
    setUrl('');
    setWidth(100);
    updateBlock({ url: '', alt: '', caption: '', width: 100 });
  };

  const handleImageError = () => {
    setError('Impossible de charger l\'image');
  };

  const loadSavedImages = async () => {
    if (!articleId) return;

    setLoadingSavedImages(true);
    try {
      const result = await paperService.getPaperSavedImages(parseInt(articleId));
      setSavedImages(result.images);
      setShowSavedImages(true);
    } catch (error) {
      console.error('Erreur lors du chargement des images:', error);
      setError('Impossible de charger les images sauvegardées');
    } finally {
      setLoadingSavedImages(false);
    }
  };

  const handleSavedImageSelect = (imageUrl: string) => {
    setUrl(imageUrl);
    updateBlock({
      url: imageUrl,
      alt: 'Image du PDF',
      caption: ''
    });
    setShowSavedImages(false);
  };

  if (!url) {
    return (
      <div className="w-full">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />

          {!readonly && (
            <>
              <div className="space-y-4">
                <div>
                  <input
                    ref={urlInputRef}
                    type="url"
                    value={url}
                    onChange={handleUrlChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Coller l'URL d'une image..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="text-gray-500 text-sm">ou</div>

                <div className="flex space-x-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isLoading ? 'Upload en cours...' : 'Upload une image'}
                  </button>

                  {articleId && (
                    <button
                      onClick={loadSavedImages}
                      disabled={loadingSavedImages}
                      className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Grid3x3 className="w-4 h-4 mr-2" />
                      {loadingSavedImages ? 'Chargement...' : 'Images du PDF'}
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Galerie des images sauvegardées */}
        {showSavedImages && (
          <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-700">Images extraites du PDF</h4>
              <button
                onClick={() => setShowSavedImages(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {savedImages.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Aucune image sauvegardée pour cet article.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {savedImages.map((image, index) => (
                  <div
                    key={index}
                    className="relative group cursor-pointer border border-gray-200 rounded-md overflow-hidden hover:border-blue-500 transition-colors"
                    onClick={() => handleSavedImageSelect(image.url)}
                  >
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="w-full h-20 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                      <div className="text-white text-xs bg-black bg-opacity-50 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Sélectionner
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="w-full"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="space-y-3">
        {/* Image display */}
        <div className="relative group">
          <img
            src={url}
            alt="Image"
            onError={handleImageError}
            className="max-w-full h-auto rounded-lg shadow-sm"
            style={{ width: `${width}%` }}
          />

          {!readonly && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleRemoveImage}
                className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                title="Supprimer l'image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Image controls */}
        {!readonly && (
          <div className="flex items-center justify-center space-x-4 py-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Ouvrir l'image dans un nouvel onglet"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Largeur:</label>
              <input
                type="range"
                min="20"
                max="100"
                value={width}
                onChange={handleWidthChange}
                className="w-32"
              />
              <span className="text-sm text-gray-600 w-12">{width}%</span>
            </div>
          </div>
        )}


        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
};

export default ImageBlock;