import React, { useState, useEffect } from 'react';
import { Search, Grid, List, Table, Filter, Image } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { Paper, PaperFilters } from '../types/Paper';
import PaperFiltersComponent from './PaperFilters';

interface TopMenuProps {
  papers: Paper[];
  onFilterChange: (filteredPapers: Paper[]) => void;
  viewSize: 'small' | 'medium' | 'large';
  onViewSizeChange: (size: 'small' | 'medium' | 'large') => void;
}

const TopMenu: React.FC<TopMenuProps> = ({ papers, onFilterChange, viewSize, onViewSizeChange }) => {
  const { viewMode, setViewMode } = useNavigation();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PaperFilters>({
    search: '',
    status: '',
    category: '',
    tags: [],
    showFavorites: false,
    sortFavorites: false,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  useEffect(() => {
    applyFilters();
  }, [papers, filters, searchQuery]);

  const getFirstAuthorLastName = (authors: string): string => {
    // Séparer les auteurs par virgule et prendre le premier
    const firstAuthor = authors.split(',')[0].trim();

    // Séparer les mots du premier auteur
    const words = firstAuthor.split(' ').filter(word => word.length > 0);

    // Le nom de famille est généralement le dernier mot
    return words.length > 0 ? words[words.length - 1] : firstAuthor;
  };

  const applyFilters = () => {
    let filtered = [...papers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(paper =>
        paper.title.toLowerCase().includes(query) ||
        paper.authors.toLowerCase().includes(query) ||
        paper.conference.toLowerCase().includes(query)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(paper => paper.reading_status === filters.status);
    }

    if (filters.showFavorites) {
      filtered = filtered.filter(paper => paper.is_favorite);
    }

    if (filters.category) {
      filtered = filtered.filter(paper => paper.conference === filters.category);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(paper => {
        if (!paper.tags) {
          return false;
        }
        const hasMatchingTag = filters.tags.some(tagId =>
          paper.tags?.some(paperTag => {
            const match = Number(paperTag.id) === Number(tagId);
            return match;
          })
        );
        return hasMatchingTag;
      });
    }

    filtered.sort((a, b) => {
      // Si le tri par favoris est activé, trier d'abord par favoris
      if (filters.sortFavorites) {
        const favoriteComparison = (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0);
        if (favoriteComparison !== 0) {
          return favoriteComparison;
        }
      }

      // Ensuite, appliquer le tri principal
      let comparison = 0;

      switch (filters.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'authors':
          const lastNameA = getFirstAuthorLastName(a.authors);
          const lastNameB = getFirstAuthorLastName(b.authors);
          comparison = lastNameA.localeCompare(lastNameB);
          break;
        case 'date':
        default:
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
      }

      return filters.sortOrder === 'desc' ? comparison : -comparison;
    });

    onFilterChange(filtered);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleFiltersChange = (newFilters: PaperFilters) => {
    setFilters(newFilters);
  };

  const viewModes = [
    { mode: 'grid' as const, icon: Grid, label: 'Grille' },
    { mode: 'list' as const, icon: List, label: 'Liste' },
    { mode: 'table' as const, icon: Table, label: 'Tableau' },
    { mode: 'images' as const, icon: Image, label: 'Images' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher des articles..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="input-field pl-10 w-full"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                btn-secondary flex items-center space-x-2
                ${showFilters ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}
              `}
            >
              <Filter className="w-4 h-4" />
              <span>Filtres</span>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* View mode buttons */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Vue:</span>
              {viewModes.map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${viewMode === mode
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                    }
                  `}
                  title={label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>

            {/* View size buttons */}
            <div className="flex items-center space-x-1 border-l border-gray-300 dark:border-gray-600 pl-4">
              <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Taille:</span>
              <button
                onClick={() => onViewSizeChange('small')}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${viewSize === 'small'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                  }
                `}
                title="Petite taille"
              >
                S
              </button>
              <button
                onClick={() => onViewSizeChange('medium')}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${viewSize === 'medium'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                  }
                `}
                title="Taille moyenne"
              >
                M
              </button>
              <button
                onClick={() => onViewSizeChange('large')}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${viewSize === 'large'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                  }
                `}
                title="Grande taille"
              >
                L
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <PaperFiltersComponent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              papers={papers}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TopMenu;