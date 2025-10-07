import React from 'react';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useNavigation } from './hooks/useNavigation';
import HomePage from './components/HomePage';
import PaperNotes from './components/PaperNotes';
import AddPaper from './components/AddPaper';
import ManagePaper from './components/ManagePaper';
import Settings from './components/Settings';
import CreateCollectionPage from './components/CreateCollectionPage';
import CollectionPage from './components/CollectionPage';

const App: React.FC = () => {
  const { currentPage, selectedPaperId } = useNavigation();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'notes':
        return selectedPaperId ? <PaperNotes paperId={selectedPaperId} /> : <HomePage />;
      case 'add-paper':
        return <AddPaper />;
      case 'manage-paper':
        return selectedPaperId ? <ManagePaper paperId={selectedPaperId} /> : <HomePage />;
      case 'settings':
        return <Settings />;
      case 'create-collection':
        return <CreateCollectionPage />;
      case 'collection':
        return <CollectionPage />;
      case 'home':
      default:
        return <HomePage />;
    }
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          {renderCurrentPage()}
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;