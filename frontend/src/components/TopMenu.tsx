import React, { useState, useEffect } from 'react';
import { Search, Grid, List, Table, Filter } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { Paper, PaperFilters } from '../types/Paper';
import PaperFiltersComponent from './PaperFilters';

interface TopMenuProps {
  papers: Paper[];
  onFilterChange: (filteredPapers: Paper[]) => void;
}

const TopMenu: React.FC<TopMenuProps> = ({ papers, onFilterChange }) => {
  const { viewMode, setViewMode } = useNavigation();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PaperFilters>({
    search: '',
    status: '',
    category: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  useEffect(() => {
    applyFilters();
  }, [papers, filters, searchQuery]);

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

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'authors':
          comparison = a.authors.localeCompare(b.authors);
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
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                ${showFilters ? 'bg-blue-100 text-blue-700' : ''}
              `}
            >
              <Filter className="w-4 h-4" />
              <span>Filtres</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 mr-2">Vue:</span>
            {viewModes.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${viewMode === mode
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }
                `}
                title={label}
              >
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
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