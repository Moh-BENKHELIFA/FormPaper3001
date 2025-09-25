import React, { useState } from 'react';
import { Loader2, Heart, BookOpen, Eye, CheckCircle, Trash2, Globe } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useToast } from '../contexts/ToastContext';
import { paperService } from '../services/paperService';
import { Paper } from '../types/Paper';
import PaperCard from './PaperCard';

interface ImageCardProps {
  paper: Paper;
  onStatusChange?: () => void;
  onPaperUpdate?: (paper: Paper) => void;
  onStatsUpdate?: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ paper, onStatusChange, onPaperUpdate, onStatsUpdate }) => {
  const { goToNotes } = useNavigation();
  const { success, error } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [localPaper, setLocalPaper] = useState<Paper>(paper);

  React.useEffect(() => {
    setLocalPaper(paper);
  }, [paper]);

  const handleStatusChange = async (newStatus: Paper['reading_status'], event: React.MouseEvent) => {
    event.stopPropagation();
    if (isUpdating) return;

    try {
      setIsUpdating(true);
      await paperService.updateReadingStatus(localPaper.id, newStatus);

      const updatedPaper = { ...localPaper, reading_status: newStatus };
      setLocalPaper(updatedPaper);

      if (onPaperUpdate) {
        onPaperUpdate(updatedPaper);
      } else {
        onStatusChange?.();
      }
      onStatsUpdate?.();
    } catch (err) {
      error('Erreur', 'Impossible de mettre à jour le statut');
      setLocalPaper(paper);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFavoriteToggle = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isUpdating) return;

    try {
      setIsUpdating(true);
      const newFavoriteStatus = !localPaper.is_favorite;
      await paperService.updateFavoriteStatus(localPaper.id, newFavoriteStatus);

      const updatedPaper = { ...localPaper, is_favorite: newFavoriteStatus };
      setLocalPaper(updatedPaper);

      success(newFavoriteStatus ? 'Ajouté aux favoris' : 'Retiré des favoris');

      if (onPaperUpdate) {
        onPaperUpdate(updatedPaper);
      } else {
        onStatusChange?.();
      }
      onStatsUpdate?.();
    } catch (err) {
      error('Erreur', 'Impossible de mettre à jour les favoris');
      setLocalPaper(paper);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePaper = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isUpdating) return;

    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer l'article "${localPaper.title}" ?`
    );

    if (!confirmDelete) return;

    try {
      setIsUpdating(true);
      await paperService.deletePaper(localPaper.id);
      success('Article supprimé avec succès');
      onStatusChange?.();
    } catch (err) {
      error('Erreur', 'Impossible de supprimer l\'article');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: Paper['reading_status']) => {
    switch (status) {
      case 'unread': return <BookOpen className="w-3 h-3" />;
      case 'reading': return <Eye className="w-3 h-3" />;
      case 'read': return <CheckCircle className="w-3 h-3" />;
      default: return <BookOpen className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: Paper['reading_status']) => {
    switch (status) {
      case 'unread': return '#6B7280';
      case 'reading': return '#F59E0B';
      case 'read': return '#10B981';
      default: return '#6B7280';
    }
  };

  const statusOptions = [
    { value: 'unread', label: 'Non lu', icon: BookOpen },
    { value: 'reading', label: 'En cours', icon: Eye },
    { value: 'read', label: 'Lu', icon: CheckCircle },
  ] as const;

  const handleCardClick = () => {
    goToNotes(localPaper.id);
  };

  const handleDoiClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (localPaper.url) {
      window.open(localPaper.url, '_blank');
    }
  };

  return (
    <div
      className="relative group cursor-pointer bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200"
      onClick={handleCardClick}
    >
      {/* Image ou titre */}
      <div className="relative aspect-[3/4] bg-gray-100">
        {localPaper.image ? (
          <img
            src={`/api/${localPaper.image}`}
            alt={localPaper.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-gray-50 to-gray-100">
            <p className="text-xs text-center text-gray-700 line-clamp-4 leading-tight font-medium">
              {localPaper.title}
            </p>
          </div>
        )}

        {/* Overlay avec contrôles */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200">
          {/* Contrôles en overlay - visibles au hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* Top controls */}
            <div className="absolute top-1 right-1 flex space-x-1">
              <button
                onClick={handleFavoriteToggle}
                className="p-1.5 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-colors shadow-sm"
                disabled={isUpdating}
                title={localPaper.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Heart
                  className={`w-3 h-3 transition-colors ${
                    localPaper.is_favorite
                      ? 'text-red-500 fill-red-500'
                      : 'text-gray-600'
                  }`}
                />
              </button>
              <button
                onClick={handleDeletePaper}
                className="p-1.5 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-colors shadow-sm"
                disabled={isUpdating}
                title="Supprimer l'article"
              >
                <Trash2 className="w-3 h-3 text-red-600" />
              </button>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-1 left-1 right-1">
              {/* DOI Link */}
              {localPaper.url && (
                <div className="mb-1 flex justify-center">
                  <button
                    onClick={handleDoiClick}
                    className="p-1.5 rounded-full bg-blue-600 bg-opacity-90 hover:bg-opacity-100 transition-colors shadow-sm"
                    title="Ouvrir le DOI"
                  >
                    <Globe className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}

              {/* Status buttons */}
              <div className="flex justify-center space-x-1">
                {statusOptions.map((status) => (
                  <button
                    key={status.value}
                    onClick={(e) => handleStatusChange(status.value, e)}
                    disabled={isUpdating}
                    className={`p-1.5 rounded-full transition-all duration-200 ${
                      localPaper.reading_status === status.value
                        ? 'shadow-sm scale-105'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: localPaper.reading_status === status.value
                        ? 'rgba(255,255,255,0.95)'
                        : 'rgba(255,255,255,0.8)',
                      color: getStatusColor(status.value),
                    }}
                    title={status.label}
                  >
                    {React.createElement(status.icon, {
                      className: 'w-3 h-3'
                    })}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Status indicator - always visible */}
        <div className="absolute bottom-1 left-1">
          <div
            className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-xs font-medium shadow-sm"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: getStatusColor(localPaper.reading_status)
            }}
          >
            {getStatusIcon(localPaper.reading_status)}
          </div>
        </div>
      </div>
    </div>
  );
};

interface MainContentProps {
  papers: Paper[];
  isLoading: boolean;
  onPapersChange: () => void;
  onPaperUpdate?: (paper: Paper) => void;
  onStatsUpdate?: () => void;
}

const MainContent: React.FC<MainContentProps> = ({
  papers,
  isLoading,
  onPapersChange,
  onPaperUpdate,
  onStatsUpdate
}) => {
  const { viewMode } = useNavigation();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Chargement des articles...</span>
        </div>
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📄</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun article trouvé
          </h3>
          <p className="text-gray-500 mb-4">
            Commencez par ajouter votre premier article scientifique
          </p>
        </div>
      </div>
    );
  }

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {papers.map((paper) => (
        <PaperCard
          key={paper.id}
          paper={paper}
          onStatusChange={onPaperUpdate ? () => {} : onPapersChange}
          onPaperUpdate={onPaperUpdate}
          onStatsUpdate={onStatsUpdate}
        />
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4">
      {papers.map((paper) => (
        <div key={paper.id} className="card p-4">
          <div className="flex items-start space-x-4">
            {paper.image && (
              <img
                src={`/api/${paper.image}`}
                alt={paper.title}
                className="w-16 h-20 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">{paper.title}</h3>
              <p className="text-sm text-gray-600 mb-1">{paper.authors}</p>
              <p className="text-xs text-gray-500">{paper.conference}</p>
              <span className={`paper-status-badge paper-status-${paper.reading_status} mt-2`}>
                {paper.reading_status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Article
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Auteurs
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Conférence
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Statut
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {papers.map((paper) => (
            <tr key={paper.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{paper.title}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{paper.authors}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{paper.conference}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`paper-status-badge paper-status-${paper.reading_status}`}>
                  {paper.reading_status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(paper.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderImagesView = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {papers.map((paper) => (
          <ImageCard
            key={paper.id}
            paper={paper}
            onPaperUpdate={onPaperUpdate}
            onStatusChange={onPaperUpdate ? () => {} : onPapersChange}
            onStatsUpdate={onStatsUpdate}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      {viewMode === 'grid' && renderGridView()}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'table' && renderTableView()}
      {viewMode === 'images' && renderImagesView()}
    </div>
  );
};

export default MainContent;