import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useNavigation } from '../hooks/useNavigation';
import { Paper, Tag } from '../types/Paper';
import { paperService } from '../services/paperService';
import SelectablePaperCard from './SelectablePaperCard';
import { LayoutGrid, List, ArrowLeft } from 'lucide-react';
import axios from 'axios';

type ViewMode = 'cards' | 'list';

const ExportPpt: React.FC = () => {
  const { success, error } = useToast();
  const { goToSettings } = useNavigation();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<number | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  useEffect(() => {
    loadPapers();
    loadTags();
  }, []);

  const loadPapers = async () => {
    try {
      setIsLoading(true);
      const papersData = await paperService.getAllPapers();
      setPapers(papersData);
    } catch (err) {
      error('Erreur', 'Impossible de charger les articles');
      console.error('Error loading papers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const tagsData = await paperService.getTags();
      setAllTags(tagsData);
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  const filteredPapers = papers.filter(paper => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (paper.conference && paper.conference.toLowerCase().includes(searchQuery.toLowerCase()));

    // Tag filter
    const matchesTag = filterTag === null ||
      (paper.tags && paper.tags.some(tag => tag.id === filterTag));

    return matchesSearch && matchesTag;
  });

  const handleSelectAll = () => {
    if (selectedPaperIds.size === filteredPapers.length) {
      setSelectedPaperIds(new Set());
    } else {
      setSelectedPaperIds(new Set(filteredPapers.map(p => p.id)));
    }
  };

  const handleTogglePaper = (paperId: number) => {
    const newSelected = new Set(selectedPaperIds);
    if (newSelected.has(paperId)) {
      newSelected.delete(paperId);
    } else {
      newSelected.add(paperId);
    }
    setSelectedPaperIds(newSelected);
  };

  const handleExport = async () => {
    if (selectedPaperIds.size === 0) {
      error('Erreur', 'Veuillez sélectionner au moins un article');
      return;
    }

    try {
      setIsExporting(true);

      const response = await axios.post('/api/export-ppt', {
        paperIds: Array.from(selectedPaperIds)
      });

      if (response.data.success) {
        // Download the file
        const { filename, content } = response.data.data;

        // Convert base64 to blob
        const byteCharacters = atob(content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        success('Export réussi', `${response.data.data.paperCount} article(s) exporté(s) en PowerPoint`);
      } else {
        throw new Error(response.data.error);
      }
    } catch (err: any) {
      error('Erreur', err.message || 'Impossible d\'exporter en PowerPoint');
      console.error('Error exporting to PowerPoint:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getFirstAuthor = (authors: string) => {
    const firstAuthor = authors.split(',')[0]?.trim() || 'Unknown';
    return authors.includes(',') ? `${firstAuthor} et al.` : firstAuthor;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={goToSettings}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Retour aux paramètres"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Export PowerPoint
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Sélectionnez les articles à exporter
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedPaperIds.size} article(s) sélectionné(s)
            </span>
            <button
              onClick={handleExport}
              disabled={selectedPaperIds.size === 0 || isExporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Export en cours...</span>
                </>
              ) : (
                <>
                  <span>Exporter en PowerPoint</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, auteur ou conférence..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Tag filter */}
          <select
            value={filterTag || ''}
            onChange={(e) => setFilterTag(e.target.value ? Number(e.target.value) : null)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Tous les tags</option>
            {allTags.map(tag => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>

          {/* Select all button */}
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            {selectedPaperIds.size === filteredPapers.length && filteredPapers.length > 0
              ? 'Tout désélectionner'
              : 'Tout sélectionner'}
          </button>

          {/* View mode toggle */}
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
              title="Vue cartes"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
              title="Vue liste"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Papers display */}
      <div className="p-6 pb-24">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>Chargement des articles...</p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>Aucun article trouvé</p>
          </div>
        ) : viewMode === 'cards' ? (
          /* Card View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredPapers.map(paper => (
              <SelectablePaperCard
                key={paper.id}
                paper={paper}
                isSelected={selectedPaperIds.has(paper.id)}
                onToggleSelection={handleTogglePaper}
              />
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredPapers.map(paper => (
              <div
                key={paper.id}
                onClick={() => handleTogglePaper(paper.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedPaperIds.has(paper.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Checkbox */}
                  <div className="flex-shrink-0 pt-1">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedPaperIds.has(paper.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selectedPaperIds.has(paper.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Paper info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {paper.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {getFirstAuthor(paper.authors)} - {paper.conference_short || paper.conference || 'N/A'}
                    </p>

                    {/* Tags */}
                    {paper.tags && paper.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {paper.tags.map(tag => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 text-xs rounded-full text-white"
                            style={{ backgroundColor: tag.color || '#6B7280' }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* DOI */}
                  {paper.doi && (
                    <div className="flex-shrink-0">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        DOI: {paper.doi.length > 30 ? paper.doi.substring(0, 30) + '...' : paper.doi}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with preview info */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{filteredPapers.length}</span> article(s) affiché(s)
            {selectedPaperIds.size > 0 && (
              <span className="ml-4">
                <span className="font-medium text-blue-600">{selectedPaperIds.size}</span> sélectionné(s)
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Chaque article = 1 slide PowerPoint
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPpt;
