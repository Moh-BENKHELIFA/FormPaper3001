import React, { useState, useEffect } from 'react';
import { useNavigation } from '../hooks/useNavigation';
import { useToast } from '../contexts/ToastContext';
import { collectionService } from '../services/collectionService';
import { Paper, PaperStats } from '../types/Paper';
import TopMenu from './TopMenu';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

const CollectionPage: React.FC = () => {
  const { selectedCollectionId, isLoading, setIsLoading, goToHome } = useNavigation();
  const { error } = useToast();
  const [collectionName, setCollectionName] = useState<string>('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<Paper[]>([]);
  const [stats, setStats] = useState<PaperStats>({
    total: 0,
    unread: 0,
    reading: 0,
    read: 0,
    favorite: 0,
  });
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCollectionId) {
      loadCollection();
    } else {
      goToHome();
    }
  }, [selectedCollectionId]);

  const loadCollection = async () => {
    if (!selectedCollectionId) return;

    try {
      setIsLoading(true);
      const data = await collectionService.getCollection(selectedCollectionId);
      setCollectionName(data.name);
      setPapers(data.papers || []);
      setFilteredPapers(data.papers || []);
      calculateStats(data.papers || []);
    } catch (err) {
      error('Erreur', 'Impossible de charger la collection');
      console.error('Error loading collection:', err);
      goToHome();
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (papersList: Paper[]) => {
    const newStats = {
      total: papersList.length,
      unread: papersList.filter(p => p.reading_status === 'unread').length,
      reading: papersList.filter(p => p.reading_status === 'reading').length,
      read: papersList.filter(p => p.reading_status === 'read').length,
      favorite: papersList.filter(p => p.is_favorite === 1).length,
    };
    setStats(newStats);
  };

  const handlePapersChange = () => {
    loadCollection();
  };

  const handlePaperUpdate = (updatedPaper: Paper) => {
    setPapers(prevPapers =>
      prevPapers.map(paper =>
        paper.id === updatedPaper.id ? updatedPaper : paper
      )
    );
    setFilteredPapers(prevFiltered =>
      prevFiltered.map(paper =>
        paper.id === updatedPaper.id ? updatedPaper : paper
      )
    );
    calculateStats(papers.map(p => p.id === updatedPaper.id ? updatedPaper : p));
  };

  const handleFilterChange = (filtered: Paper[]) => {
    setFilteredPapers(filtered);
    setActiveStatFilter(null);
  };

  const handleStatFilterClick = (filterType: string) => {
    if (activeStatFilter === filterType) {
      setActiveStatFilter(null);
      setFilteredPapers(papers);
      return;
    }

    setActiveStatFilter(filterType);

    let filtered = [...papers];
    switch (filterType) {
      case 'total':
        filtered = papers;
        break;
      case 'unread':
        filtered = papers.filter(p => p.reading_status === 'unread');
        break;
      case 'reading':
        filtered = papers.filter(p => p.reading_status === 'reading');
        break;
      case 'read':
        filtered = papers.filter(p => p.reading_status === 'read');
        break;
      case 'favorite':
        filtered = papers.filter(p => p.is_favorite === 1);
        break;
    }
    setFilteredPapers(filtered);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        stats={stats}
        onStatFilterClick={handleStatFilterClick}
        activeStatFilter={activeStatFilter}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Custom Header for Collection */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {collectionName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {papers.length} article{papers.length !== 1 ? 's' : ''} dans cette collection
              </p>
            </div>
          </div>
        </div>

        <TopMenu
          papers={papers}
          onFilterChange={handleFilterChange}
        />

        <MainContent
          papers={filteredPapers}
          isLoading={isLoading}
          onPapersChange={handlePapersChange}
          onPaperUpdate={handlePaperUpdate}
          onStatsUpdate={() => calculateStats(papers)}
        />
      </div>
    </div>
  );
};

export default CollectionPage;
