import React, { useState, useEffect } from 'react';
import { Eye, Heart, BookOpen, CheckCircle, Tag as TagIcon, Trash2 } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useToast } from '../contexts/ToastContext';
import { paperService } from '../services/paperService';
import { Paper, Tag } from '../types/Paper';

interface PaperCardProps {
  paper: Paper;
  onStatusChange?: () => void;
  onStatsUpdate?: () => void;
}

const PaperCard: React.FC<PaperCardProps> = ({ paper, onStatusChange, onStatsUpdate }) => {
  const { goToNotes } = useNavigation();
  const { success, error } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [localPaper, setLocalPaper] = useState<Paper>(paper);
  const [lastClickTime, setLastClickTime] = useState(0);

  useEffect(() => {
    loadTags();
  }, [paper.id]);

  useEffect(() => {
    setLocalPaper(paper);
  }, [paper]);

  const loadTags = async () => {
    try {
      setTagsLoading(true);
      const paperTags = await paperService.getPaperTags(localPaper.id);
      setTags(paperTags);
    } catch (err) {
      console.error('Error loading tags for paper:', err);
    } finally {
      setTagsLoading(false);
    }
  };

  const handleCardClick = () => {
    // Ne fait rien au simple clic
  };

  const handleCardMouseDown = (event: React.MouseEvent) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;

    // Si c'est un double-clic (moins de 300ms entre les clics)
    if (timeDiff < 300) {
      event.preventDefault();
      return false;
    }

    setLastClickTime(currentTime);
  };

  const handleCardDoubleClick = (event: React.MouseEvent) => {
    // Empêcher la sélection de texte lors du double-clic
    event.preventDefault();
    event.stopPropagation();
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
    goToNotes(localPaper.id);
  };

  const handleStatusChange = async (newStatus: Paper['reading_status'], event: React.MouseEvent) => {
    event.stopPropagation();

    if (isUpdating) return;

    try {
      setIsUpdating(true);
      await paperService.updateReadingStatus(localPaper.id, newStatus);

      // Mise à jour locale immédiate pour éviter le clignotement
      setLocalPaper(prev => ({ ...prev, reading_status: newStatus }));

      // Notification du parent pour recharger les données
      onStatusChange?.();
      onStatsUpdate?.();
    } catch (err) {
      error('Erreur', 'Impossible de mettre à jour le statut');
      // Restaurer l'état précédent en cas d'erreur
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

      // Mise à jour locale immédiate pour éviter le clignotement
      setLocalPaper(prev => ({ ...prev, is_favorite: newFavoriteStatus }));

      success(newFavoriteStatus ? 'Ajouté aux favoris' : 'Retiré des favoris');

      // Notification du parent pour recharger les données
      onStatusChange?.();
      onStatsUpdate?.();
    } catch (err) {
      error('Erreur', 'Impossible de mettre à jour les favoris');
      // Restaurer l'état précédent en cas d'erreur
      setLocalPaper(paper);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePaper = async (event: React.MouseEvent) => {
    event.stopPropagation();

    if (isUpdating) return;

    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer l'article "${localPaper.title}" ?\n\nCette action supprimera définitivement :\n• L'article de la base de données\n• Son dossier et tous les fichiers associés\n\nCette action est irréversible.`
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
      case 'unread':
        return <BookOpen className="w-4 h-4" />;
      case 'reading':
        return <Eye className="w-4 h-4" />;
      case 'read':
        return <CheckCircle className="w-4 h-4" />;
      case 'favorite':
        return <Heart className="w-4 h-4 fill-current" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: Paper['reading_status']) => {
    switch (status) {
      case 'unread':
        return '#6B7280'; // gray-500
      case 'reading':
        return '#F59E0B'; // yellow-500
      case 'read':
        return '#10B981'; // green-500
      default:
        return '#6B7280'; // gray-500
    }
  };

  const formatDate = () => {
    if (localPaper.year) {
      if (localPaper.month) {
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        return `${monthNames[localPaper.month - 1]} ${localPaper.year}`;
      }
      return localPaper.year.toString();
    }
    return null;
  };

  const formatCreationDate = () => {
    const date = new Date(localPaper.created_at);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const statusOptions = [
    { value: 'unread', label: 'Non lu', icon: BookOpen },
    { value: 'reading', label: 'En cours', icon: Eye },
    { value: 'read', label: 'Lu', icon: CheckCircle },
  ] as const;

  const renderTags = () => {
    if (tagsLoading) {
      return (
        <div className="flex items-center space-x-1">
          <TagIcon className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-400">Chargement...</span>
        </div>
      );
    }

    if (tags.length === 0) {
      return null;
    }

    const visibleTags = tags.slice(0, 2);
    const hiddenTags = tags.slice(2);

    return (
      <div className="flex items-center space-x-1 flex-wrap">
        {visibleTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full text-gray-700"
            style={{
              backgroundColor: `${tag.color}15`, // 15 = ~8% opacity en hex
              borderColor: tag.color,
              border: `1px solid ${tag.color}40` // 40 = ~25% opacity en hex
            }}
          >
            {tag.name}
          </span>
        ))}

        {hiddenTags.length > 0 && (
          <div className="relative group">
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-white border border-gray-300 text-gray-700 cursor-help">
              +{hiddenTags.length}
            </span>

            {/* Tooltip pour les tags cachés */}
            <div className="absolute bottom-full left-0 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
              <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                <div className="space-y-1">
                  {hiddenTags.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      ></div>
                      <span>{tag.name}</span>
                    </div>
                  ))}
                </div>
                {/* Arrow pointing down */}
                <div className="absolute top-full left-4 transform -translate-x-1/2">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="card cursor-pointer transform transition-transform hover:scale-105 flex flex-col h-full"
      onClick={handleCardClick}
      onDoubleClick={handleCardDoubleClick}
      onMouseDown={handleCardMouseDown}
    >
      {/* Image de couverture */}
      <div className="relative h-48 bg-gray-200 overflow-hidden rounded-t-lg">
        {localPaper.image ? (
          <img
            src={`/api/${localPaper.image}`}
            alt={localPaper.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-gray-400" />
          </div>
        )}

        {/* Actions en overlay */}
        <div className="absolute top-2 right-2 flex space-x-2">
          <button
            onClick={handleFavoriteToggle}
            className="p-2 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-colors shadow-sm"
            disabled={isUpdating}
            title={localPaper.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                localPaper.is_favorite
                  ? 'text-red-500 fill-red-500'
                  : 'text-gray-600'
              }`}
            />
          </button>
          <button
            onClick={handleDeletePaper}
            className="p-2 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-colors shadow-sm"
            disabled={isUpdating}
            title="Supprimer l'article"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>

        {/* Indicateur de statut en bas à gauche */}
        <div className="absolute bottom-2 left-2">
          <div
            className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium shadow-sm"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: getStatusColor(localPaper.reading_status)
            }}
          >
            {getStatusIcon(localPaper.reading_status)}
            <span>{statusOptions.find(opt => opt.value === localPaper.reading_status)?.label}</span>
          </div>
        </div>
      </div>

      {/* Contenu de la carte */}
      <div className="flex flex-col flex-grow p-4 space-y-3">
        {/* Titre */}
        <h3 className="font-semibold text-lg line-clamp-2 flex-grow">
          {localPaper.title}
        </h3>

        {/* Auteurs */}
        <p className="text-sm text-gray-700 line-clamp-2">
          {localPaper.authors}
        </p>

        {/* Conférence/Journal */}
        <p className="text-xs text-gray-500 line-clamp-1">
          {localPaper.conference}
        </p>

        {/* Informations supplémentaires */}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{formatDate()}</span>
          <span>Ajouté le {formatCreationDate()}</span>
        </div>

        {/* Tags Section */}
        <div className="min-h-[1.5rem] flex items-center">
          {renderTags()}
        </div>

        {/* Boutons de changement de statut */}
        <div className="flex space-x-1 pt-2 border-t border-gray-100">
          {statusOptions.map((status) => (
            <button
              key={status.value}
              onClick={(e) => handleStatusChange(status.value, e)}
              disabled={isUpdating}
              className={`p-2 rounded-full transition-all duration-200 ${
                localPaper.reading_status === status.value
                  ? 'shadow-sm scale-105'
                  : 'hover:scale-105 opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: localPaper.reading_status === status.value
                  ? getStatusColor(status.value) + '30'
                  : 'rgba(255,255,255,0.8)',
                color: getStatusColor(status.value),
                border: localPaper.reading_status === status.value
                  ? `2px solid ${getStatusColor(status.value)}`
                  : '2px solid transparent'
              }}
              title={status.label}
            >
              {React.createElement(status.icon, {
                className: `w-4 h-4`
              })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaperCard;