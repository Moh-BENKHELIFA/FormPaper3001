import React, { useState, useEffect } from 'react';
import { useNavigation } from '../hooks/useNavigation';
import { useToast } from '../contexts/ToastContext';
import { paperService } from '../services/paperService';
import { Paper, PaperStats } from '../types/Paper';
import TopMenu from './TopMenu';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

const HomePage: React.FC = () => {
  const { isLoading, setIsLoading } = useNavigation();
  const { error } = useToast();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [stats, setStats] = useState<PaperStats>({
    total: 0,
    unread: 0,
    reading: 0,
    read: 0,
    favorite: 0,
  });
  const [filteredPapers, setFilteredPapers] = useState<Paper[]>([]);
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);

  useEffect(() => {
    loadPapers();
    loadStats();
  }, []);

  const loadPapers = async () => {
    try {
      setIsLoading(true);
      const papersData = await paperService.getAllPapers();
      setPapers(papersData);
      setFilteredPapers(papersData);
    } catch (err) {
      error('Erreur', 'Impossible de charger les articles');
      console.error('Error loading papers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await paperService.getPaperStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handlePapersChange = () => {
    loadPapers();
    loadStats();
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
    loadStats(); // On recharge seulement les stats
  };

  const handleFilterChange = (filtered: Paper[]) => {
    setFilteredPapers(filtered);
    setActiveStatFilter(null); // Reset stat filter when using TopMenu filters
  };

  const handleStatFilterClick = (filterType: string) => {
    if (activeStatFilter === filterType) {
      // Si on clique sur le même filtre, on le désactive
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
        onStatsRefresh={loadStats}
        onStatFilterClick={handleStatFilterClick}
        activeStatFilter={activeStatFilter}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopMenu
          papers={papers}
          onFilterChange={handleFilterChange}
        />

        <MainContent
          papers={filteredPapers}
          isLoading={isLoading}
          onPapersChange={handlePapersChange}
          onPaperUpdate={handlePaperUpdate}
          onStatsUpdate={loadStats}
        />
      </div>
    </div>
  );
};

export default HomePage;