import React from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { Paper } from '../types/Paper';
import PaperCard from './PaperCard';

interface MainContentProps {
  papers: Paper[];
  isLoading: boolean;
  onPapersChange: () => void;
}

const MainContent: React.FC<MainContentProps> = ({
  papers,
  isLoading,
  onPapersChange
}) => {
  const { viewMode } = useNavigation();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Chargement des articles...</span>
        </div>
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📄</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun article trouvé
          </h3>
          <p className="text-gray-500 mb-4">
            Commencez par ajouter votre premier article scientifique
          </p>
        </div>
      </div>
    );
  }

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {papers.map((paper) => (
        <PaperCard
          key={paper.id}
          paper={paper}
          onStatusChange={onPapersChange}
        />
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4">
      {papers.map((paper) => (
        <div key={paper.id} className="card p-4">
          <div className="flex items-start space-x-4">
            {paper.image && (
              <img
                src={paper.image}
                alt={paper.title}
                className="w-16 h-20 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">{paper.title}</h3>
              <p className="text-sm text-gray-600 mb-1">{paper.authors}</p>
              <p className="text-xs text-gray-500">{paper.conference}</p>
              <span className={`paper-status-badge paper-status-${paper.reading_status} mt-2`}>
                {paper.reading_status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Article
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Auteurs
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Conférence
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Statut
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {papers.map((paper) => (
            <tr key={paper.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{paper.title}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{paper.authors}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{paper.conference}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`paper-status-badge paper-status-${paper.reading_status}`}>
                  {paper.reading_status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(paper.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto p-6">
      {viewMode === 'grid' && renderGridView()}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'table' && renderTableView()}
    </div>
  );
};

export default MainContent;