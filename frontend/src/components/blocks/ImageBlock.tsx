import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, ExternalLink } from 'lucide-react';
import { ImageBlockData } from '../../types/BlockTypes';
import { blockFactory } from '../../utils/blockFactory';
import { imageService } from '../../services/imageService';

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

                <div>
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
                </div>
              </div>

              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
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