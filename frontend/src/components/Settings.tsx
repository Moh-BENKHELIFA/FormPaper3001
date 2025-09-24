import React, { useState, useEffect } from 'react';
import { useNavigation } from '../hooks/useNavigation';
import { useToast } from '../contexts/ToastContext';
import { PaperStats, Tag } from '../types/Paper';
import { paperService } from '../services/paperService';
import Sidebar from './Sidebar';
import Modal from './Modal';

const Settings: React.FC = () => {
  const { goToHome } = useNavigation();
  const { success, error } = useToast();
  const [activeSection, setActiveSection] = useState<'general' | 'tags' | 'integrations'>('general');
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [showEditTagModal, setShowEditTagModal] = useState(false);
  const [showDeleteTagModal, setShowDeleteTagModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showResetDatabaseModal, setShowResetDatabaseModal] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');

  // Form states
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3B82F6');

  const emptyStats: PaperStats = {
    total: 0,
    unread: 0,
    reading: 0,
    read: 0,
    favorite: 0,
  };

  useEffect(() => {
    if (activeSection === 'tags') {
      loadTags();
    }
  }, [activeSection]);

  const loadTags = async () => {
    try {
      setIsLoading(true);
      const tagsData = await paperService.getTags();
      setTags(tagsData);
    } catch (err) {
      error('Erreur', 'Impossible de charger les tags');
      console.error('Error loading tags:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!tagName.trim()) {
      error('Erreur', 'Le nom du tag est requis');
      return;
    }

    try {
      await paperService.createTag(tagName.trim(), tagColor);
      success('Succès', 'Tag créé avec succès');
      setShowCreateTagModal(false);
      setTagName('');
      setTagColor('#3B82F6');
      loadTags();
    } catch (err) {
      error('Erreur', 'Impossible de créer le tag');
      console.error('Error creating tag:', err);
    }
  };

  const handleEditTag = async () => {
    if (!selectedTag || !tagName.trim()) {
      error('Erreur', 'Le nom du tag est requis');
      return;
    }

    try {
      await paperService.updateTag(selectedTag.id, tagName.trim(), tagColor);
      success('Succès', 'Tag modifié avec succès');
      setShowEditTagModal(false);
      setSelectedTag(null);
      setTagName('');
      setTagColor('#3B82F6');
      loadTags();
    } catch (err) {
      error('Erreur', 'Impossible de modifier le tag');
      console.error('Error editing tag:', err);
    }
  };

  const handleDeleteTag = async () => {
    if (!selectedTag) return;

    try {
      await paperService.deleteTag(selectedTag.id);
      success('Succès', 'Tag supprimé avec succès');
      setShowDeleteTagModal(false);
      setSelectedTag(null);
      loadTags();
    } catch (err) {
      error('Erreur', 'Impossible de supprimer le tag');
      console.error('Error deleting tag:', err);
    }
  };

  const openCreateTagModal = () => {
    setTagName('');
    setTagColor('#3B82F6');
    setShowCreateTagModal(true);
  };

  const openEditTagModal = (tag: Tag) => {
    setSelectedTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setShowEditTagModal(true);
  };

  const openDeleteTagModal = (tag: Tag) => {
    setSelectedTag(tag);
    setShowDeleteTagModal(true);
  };

  const handleResetDatabase = async () => {
    if (resetConfirmationText !== 'RESET') {
      error('Erreur', 'Veuillez taper "RESET" pour confirmer');
      return;
    }

    try {
      setIsLoading(true);
      await paperService.resetDatabase();
      success('Succès', 'Base de données réinitialisée avec succès');
      setShowResetDatabaseModal(false);
      setResetConfirmationText('');
      // Recharger la page pour refléter les changements
      window.location.reload();
    } catch (err) {
      error('Erreur', 'Impossible de réinitialiser la base de données');
      console.error('Error resetting database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openResetDatabaseModal = () => {
    setResetConfirmationText('');
    setShowResetDatabaseModal(true);
  };

  const predefinedColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6',
    '#F97316', '#84CC16', '#06B6D4', '#8B5A2B'
  ];

  const menuItems = [
    { id: 'general', label: 'Général', icon: '⚙️' },
    { id: 'tags', label: 'Gestion des Tags', icon: '🏷️' },
    { id: 'integrations', label: 'Intégrations', icon: '🔗' },
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Apparence</h3>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Thème</h4>
              <p className="text-sm text-gray-500">Choisissez le thème de l'application</p>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-xs rounded bg-blue-100 text-blue-700 border">
                Clair
              </button>
              <button className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 border">
                Sombre
              </button>
              <button className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 border">
                Auto
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Préférences</h3>
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Mode d'affichage par défaut</h4>
              <p className="text-sm text-gray-500">Choisissez la vue par défaut pour les articles</p>
            </div>
            <select className="px-3 py-1 text-sm border border-gray-300 rounded">
              <option value="grid">Grille</option>
              <option value="list">Liste</option>
              <option value="table">Tableau</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Création automatique de dossiers</h4>
              <p className="text-sm text-gray-500">Créer automatiquement des dossiers pour chaque article</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Zone de Danger</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-red-900">Réinitialiser la base de données</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Supprime définitivement tous les articles, catégories, tags et données de la base.
                    Cette action est irréversible.
                  </p>
                </div>
                <button
                  onClick={openResetDatabaseModal}
                  className="ml-4 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTagsSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Gestion des Tags</h3>
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-900">Tags existants ({tags.length})</h4>
              <button
                onClick={openCreateTagModal}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                + Nouveau Tag
              </button>
            </div>
          </div>

          <div className="p-4">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                <p>Chargement des tags...</p>
              </div>
            ) : tags.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Aucun tag créé</p>
                <p className="text-sm mt-2">Créez votre premier tag pour organiser vos articles</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                      <span className="text-xs text-gray-500">#{tag.id}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditTagModal(tag)}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => openDeleteTagModal(tag)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrationsSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Intégrations</h3>
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📚</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Zotero</h4>
                  <p className="text-sm text-gray-500">Synchroniser avec votre bibliothèque Zotero</p>
                </div>
              </div>
              <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border">
                Configurer
              </button>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
              <p>Intégration Zotero en cours de développement</p>
              <p className="text-sm mt-1">Bientôt disponible pour importer/exporter vos articles</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderColorPicker = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
      <div className="grid grid-cols-6 gap-2 mb-3">
        {predefinedColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setTagColor(color)}
            className={`w-8 h-8 rounded-full border-2 ${
              tagColor === color ? 'border-gray-800' : 'border-gray-300'
            } transition-all hover:scale-110`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <input
        type="color"
        value={tagColor}
        onChange={(e) => setTagColor(e.target.value)}
        className="w-full h-10 rounded border border-gray-300"
      />
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar stats={emptyStats} />

      <div className="flex-1 flex flex-col">
        {/* Simple header for Settings page */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Paramètres</h1>
            <button
              onClick={goToHome}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span>←</span>
              <span>Retour à l'accueil</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Settings Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Paramètres</h2>
            </div>

            <nav className="p-4 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="flex-1 p-6">
            <div className="max-w-4xl">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {menuItems.find(item => item.id === activeSection)?.label}
                </h1>
              </div>

              {activeSection === 'general' && renderGeneralSettings()}
              {activeSection === 'tags' && renderTagsSettings()}
              {activeSection === 'integrations' && renderIntegrationsSettings()}
            </div>
          </div>
        </div>
      </div>

      {/* Create Tag Modal */}
      <Modal
        isOpen={showCreateTagModal}
        onClose={() => setShowCreateTagModal(false)}
        title="Créer un nouveau tag"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom du tag</label>
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Entrez le nom du tag"
              autoFocus
            />
          </div>

          {renderColorPicker()}

          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: tagColor }}
            ></div>
            <span className="text-sm text-gray-700">Aperçu: </span>
            <span
              className="px-2 py-1 text-xs rounded-full text-white"
              style={{ backgroundColor: tagColor }}
            >
              {tagName || 'Nom du tag'}
            </span>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowCreateTagModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              onClick={handleCreateTag}
              disabled={!tagName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Créer
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Tag Modal */}
      <Modal
        isOpen={showEditTagModal}
        onClose={() => setShowEditTagModal(false)}
        title="Modifier le tag"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom du tag</label>
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Entrez le nom du tag"
              autoFocus
            />
          </div>

          {renderColorPicker()}

          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: tagColor }}
            ></div>
            <span className="text-sm text-gray-700">Aperçu: </span>
            <span
              className="px-2 py-1 text-xs rounded-full text-white"
              style={{ backgroundColor: tagColor }}
            >
              {tagName || 'Nom du tag'}
            </span>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowEditTagModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              onClick={handleEditTag}
              disabled={!tagName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Modifier
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Tag Modal */}
      <Modal
        isOpen={showDeleteTagModal}
        onClose={() => setShowDeleteTagModal(false)}
        title="Supprimer le tag"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Êtes-vous sûr de vouloir supprimer le tag{' '}
            <span className="font-medium">"{selectedTag?.name}"</span> ?
          </p>

          {selectedTag && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedTag.color }}
              ></div>
              <span
                className="px-2 py-1 text-xs rounded-full text-white"
                style={{ backgroundColor: selectedTag.color }}
              >
                {selectedTag.name}
              </span>
            </div>
          )}

          <p className="text-sm text-red-600">
            ⚠️ Cette action est irréversible. Le tag sera retiré de tous les articles associés.
          </p>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowDeleteTagModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteTag}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Supprimer
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Database Modal */}
      <Modal
        isOpen={showResetDatabaseModal}
        onClose={() => setShowResetDatabaseModal(false)}
        title="⚠️ Réinitialiser la base de données"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium mb-2">
              ⚠️ ATTENTION : Cette action est irréversible !
            </p>
            <p className="text-red-700 text-sm">
              Vous êtes sur le point de supprimer définitivement :
            </p>
            <ul className="text-red-700 text-sm mt-2 ml-4 space-y-1">
              <li>• Tous les articles de recherche</li>
              <li>• Toutes les catégories et tags</li>
              <li>• Toutes les données associées</li>
              <li>• Tous les fichiers PDF et images</li>
            </ul>
            <p className="text-red-700 text-sm mt-2 font-medium">
              Cette action ne peut pas être annulée.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pour confirmer, tapez "RESET" dans le champ ci-dessous :
            </label>
            <input
              type="text"
              value={resetConfirmationText}
              onChange={(e) => setResetConfirmationText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Tapez RESET pour confirmer"
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowResetDatabaseModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              onClick={handleResetDatabase}
              disabled={resetConfirmationText !== 'RESET' || isLoading}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Réinitialisation...' : 'Réinitialiser définitivement'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;