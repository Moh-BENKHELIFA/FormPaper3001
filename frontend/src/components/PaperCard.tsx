import React, { useState, useEffect } from 'react';
import { Eye, Heart, BookOpen, CheckCircle, MoreVertical, Tag as TagIcon } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useToast } from '../contexts/ToastContext';
import { paperService } from '../services/paperService';
import { Paper, Tag } from '../types/Paper';

interface PaperCardProps {
  paper: Paper;
  onStatusChange?: () => void;
}

const PaperCard: React.FC<PaperCardProps> = ({ paper, onStatusChange }) => {
  const { goToNotes } = useNavigation();
  const { success, error } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  useEffect(() => {
    loadTags();
  }, [paper.id]);

  const loadTags = async () => {
    try {
      setTagsLoading(true);
      const paperTags = await paperService.getPaperTags(paper.id);
      setTags(paperTags);
    } catch (err) {
      console.error('Error loading tags for paper:', err);
    } finally {
      setTagsLoading(false);
    }
  };

  const handleCardClick = () => {
    goToNotes(paper.id);
  };

  const handleStatusChange = async (newStatus: Paper['reading_status'], event: React.MouseEvent) => {
    event.stopPropagation();

    if (isUpdating) return;

    try {
      setIsUpdating(true);
      await paperService.updateReadingStatus(paper.id, newStatus);
      success('Statut mis à jour');
      onStatusChange?.();
    } catch (err) {
      error('Erreur', 'Impossible de mettre à jour le statut');
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
      case 'favorite':
        return '#EF4444'; // red-500
      default:
        return '#6B7280'; // gray-500
    }
  };

  const statusOptions = [
    { value: 'unread', label: 'Non lu', icon: BookOpen },
    { value: 'reading', label: 'En cours', icon: Eye },
    { value: 'read', label: 'Lu', icon: CheckCircle },
    { value: 'favorite', label: 'Favori', icon: Heart },
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
      className="card p-4 cursor-pointer transform transition-transform hover:scale-105 flex flex-col h-full"
      onClick={handleCardClick}
    >
      <div className="w-full h-48 mb-4 overflow-hidden rounded-lg flex-shrink-0">
        <img
          src={paper.image ? `/api/${paper.image}` : '/api/default-image'}
          alt={paper.title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col h-full space-y-3">
        {/* Header - titre, auteurs, conférence */}
        <div className="flex-grow">
          <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 min-h-[2.5rem]">
            {paper.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-1 mb-1">
            {paper.authors}
          </p>
          <p className="text-xs text-gray-500">
            {paper.conference}
          </p>
        </div>

        {/* Tags Section */}
        <div className="min-h-[1.5rem] flex items-center">
          {renderTags()}
        </div>

        {/* Status Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getStatusColor(paper.reading_status) }}
            ></div>
            <span className="text-sm text-gray-700">
              {statusOptions.find(opt => opt.value === paper.reading_status)?.label}
            </span>
          </div>

          <div className="relative group">
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-gray-100"
              disabled={isUpdating}
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>

            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="whitespace-nowrap">
                {statusOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={(e) => handleStatusChange(option.value, e)}
                      className={`
                        w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2
                        ${paper.reading_status === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                      `}
                      disabled={isUpdating}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Section - toujours à la fin */}
        <div className="mt-auto space-y-2">
          {paper.doi && (
            <div className="text-xs text-gray-500 truncate">
              DOI: {paper.doi}
            </div>
          )}
          <div className="text-xs text-gray-400">
            Ajouté le {new Date(paper.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperCard;