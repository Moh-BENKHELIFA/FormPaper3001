import React from 'react';
import { ToastProvider } from './contexts/ToastContext';
import { useNavigation } from './hooks/useNavigation';
import HomePage from './components/HomePage';
import PaperNotes from './components/PaperNotes';
import AddPaper from './components/AddPaper';
import ManagePaper from './components/ManagePaper';
import Settings from './components/Settings';

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
      case 'home':
      default:
        return <HomePage />;
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        {renderCurrentPage()}
      </div>
    </ToastProvider>
  );
};

export default App;