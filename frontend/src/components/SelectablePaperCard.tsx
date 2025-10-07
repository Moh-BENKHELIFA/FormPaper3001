import React, { useState, useEffect } from 'react';
import { Eye, Heart, BookOpen, CheckCircle, Tag as TagIcon } from 'lucide-react';
import { paperService } from '../services/paperService';
import { Paper, Tag } from '../types/Paper';

interface SelectablePaperCardProps {
  paper: Paper;
  isSelected: boolean;
  onToggleSelection: (paperId: number) => void;
}

const SelectablePaperCard: React.FC<SelectablePaperCardProps> = ({
  paper,
  isSelected,
  onToggleSelection
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

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

  const handleCardClick = (event: React.MouseEvent) => {
    // Ignore clicks on the checkbox
    if ((event.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    onToggleSelection(paper.id);
  };

  const getStatusIcon = () => {
    switch (paper.reading_status) {
      case 'read':
        return <CheckCircle className="w-4 h-4" />;
      case 'reading':
        return <Eye className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (paper.reading_status) {
      case 'read':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'reading':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getStatusLabel = () => {
    switch (paper.reading_status) {
      case 'read':
        return 'Lu';
      case 'reading':
        return 'En cours';
      default:
        return 'Non lu';
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200
        overflow-hidden cursor-pointer border-2
        ${isSelected
          ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* Image */}
      <div className="relative h-32 bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {paper.image ? (
          <img
            src={`http://localhost:5004/api/${paper.image}`}
            alt={paper.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'http://localhost:5004/api/default-image';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 right-2 flex items-center space-x-1">
          {paper.is_favorite === 1 && (
            <div className="p-1.5 rounded-full bg-red-500 text-white shadow-lg">
              <Heart className="w-3 h-3 fill-current" />
            </div>
          )}
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full shadow-lg ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-xs font-medium">{getStatusLabel()}</span>
          </div>
        </div>

        {/* Selection Overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 dark:bg-opacity-20" />
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-1.5 min-h-[2rem]">
          {paper.title}
        </h3>

        {/* Authors */}
        <p className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-1 mb-1.5">
          {paper.authors}
        </p>

        {/* Conference */}
        {paper.conference && (
          <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-2">
            {paper.conference}
          </p>
        )}

        {/* Tags */}
        {!tagsLoading && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 relative">
            {tags.slice(0, 2).map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                }}
              >
                <TagIcon className="w-2 h-2 mr-0.5" />
                {tag.name}
              </span>
            ))}
            {tags.length > 2 && (
              <div className="relative inline-block">
                <span
                  className="text-[10px] text-gray-500 dark:text-gray-400 cursor-help px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded"
                  onMouseEnter={() => setShowAllTags(true)}
                  onMouseLeave={() => setShowAllTags(false)}
                >
                  +{tags.length - 2}
                </span>
                {showAllTags && (
                  <div
                    className="absolute left-0 bottom-full mb-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[150px]"
                    onMouseEnter={() => setShowAllTags(true)}
                    onMouseLeave={() => setShowAllTags(false)}
                  >
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(2).map(tag => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                          }}
                        >
                          <TagIcon className="w-2 h-2 mr-0.5" />
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectablePaperCard;
