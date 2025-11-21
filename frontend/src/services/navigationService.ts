import { NavigationState, PageType, ViewMode } from '../types/navigation';

class NavigationService {
  private listeners: Array<(state: NavigationState) => void> = [];
  private state: NavigationState = {
    currentPage: 'home',
    selectedPaperId: null,
    selectedCollectionId: null,
    viewMode: 'grid',
    isLoading: false,
  };

  subscribe(listener: (state: NavigationState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  getState(): NavigationState {
    return { ...this.state };
  }

  setCurrentPage(page: PageType): void {
    this.state = { ...this.state, currentPage: page };
    this.notify();
    this.updateURL();
  }

  setSelectedPaperId(id: number | null): void {
    this.state = { ...this.state, selectedPaperId: id };
    this.notify();
    this.updateURL();
  }

  setSelectedCollectionId(id: number | null): void {
    this.state = { ...this.state, selectedCollectionId: id };
    this.notify();
    this.updateURL();
  }

  setViewMode(mode: ViewMode): void {
    this.state = { ...this.state, viewMode: mode };
    this.notify();
    this.saveViewModePreference(mode);
  }

  setIsLoading(loading: boolean): void {
    this.state = { ...this.state, isLoading: loading };
    this.notify();
  }

  goToNotes(paperId: number): void {
    this.state = {
      ...this.state,
      currentPage: 'notes',
      selectedPaperId: paperId,
    };
    this.notify();
    this.updateURL();
  }

  goToHome(): void {
    this.state = {
      ...this.state,
      currentPage: 'home',
      selectedPaperId: null,
    };
    this.notify();
    this.updateURL();
  }

  goToAddPaper(): void {
    this.state = {
      ...this.state,
      currentPage: 'add-paper',
      selectedPaperId: null,
    };
    this.notify();
    this.updateURL();
  }

  goToManagePaper(paperId: number): void {
    this.state = {
      ...this.state,
      currentPage: 'manage-paper',
      selectedPaperId: paperId,
    };
    this.notify();
    this.updateURL();
  }

  goToSettings(): void {
    this.state = {
      ...this.state,
      currentPage: 'settings',
      selectedPaperId: null,
    };
    this.notify();
    this.updateURL();
  }

  goToCreateCollection(collectionId?: number | null): void {
    this.state = {
      ...this.state,
      currentPage: 'create-collection',
      selectedPaperId: null,
      selectedCollectionId: collectionId ?? null,
    };
    this.notify();
    this.updateURL();
  }

  goToCollection(collectionId: number): void {
    this.state = {
      ...this.state,
      currentPage: 'collection',
      selectedPaperId: null,
      selectedCollectionId: collectionId,
    };
    this.notify();
    this.updateURL();
  }

  goToExportPpt(): void {
    this.state = {
      ...this.state,
      currentPage: 'export-ppt',
      selectedPaperId: null,
    };
    this.notify();
    this.updateURL();
  }

  private updateURL(): void {
    const { currentPage, selectedPaperId, selectedCollectionId } = this.state;
    let path = '/';

    switch (currentPage) {
      case 'notes':
        if (selectedPaperId) {
          path = `/notes/${selectedPaperId}`;
        }
        break;
      case 'add-paper':
        path = '/add';
        break;
      case 'manage-paper':
        if (selectedPaperId) {
          path = `/manage/${selectedPaperId}`;
        }
        break;
      case 'settings':
        path = '/settings';
        break;
      case 'create-collection':
        if (selectedCollectionId) {
          path = `/collections/edit/${selectedCollectionId}`;
        } else {
          path = '/collections/new';
        }
        break;
      case 'collection':
        if (selectedCollectionId) {
          path = `/collections/${selectedCollectionId}`;
        }
        break;
      case 'export-ppt':
        path = '/export-ppt';
        break;
      case 'home':
      default:
        path = '/';
        break;
    }

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  }

  initializeFromURL(): void {
    const path = window.location.pathname;

    if (path.startsWith('/notes/')) {
      const paperId = parseInt(path.split('/')[2]);
      if (!isNaN(paperId)) {
        this.state = {
          ...this.state,
          currentPage: 'notes',
          selectedPaperId: paperId,
        };
      }
    } else if (path === '/add') {
      this.state = {
        ...this.state,
        currentPage: 'add-paper',
        selectedPaperId: null,
      };
    } else if (path.startsWith('/manage/')) {
      const paperId = parseInt(path.split('/')[2]);
      if (!isNaN(paperId)) {
        this.state = {
          ...this.state,
          currentPage: 'manage-paper',
          selectedPaperId: paperId,
        };
      }
    } else if (path === '/settings') {
      this.state = {
        ...this.state,
        currentPage: 'settings',
        selectedPaperId: null,
      };
    } else if (path === '/collections/new') {
      this.state = {
        ...this.state,
        currentPage: 'create-collection',
        selectedPaperId: null,
        selectedCollectionId: null,
      };
    } else if (path.startsWith('/collections/edit/')) {
      const collectionId = parseInt(path.split('/')[3]);
      if (!isNaN(collectionId)) {
        this.state = {
          ...this.state,
          currentPage: 'create-collection',
          selectedPaperId: null,
          selectedCollectionId: collectionId,
        };
      }
    } else if (path.startsWith('/collections/')) {
      const collectionId = parseInt(path.split('/')[2]);
      if (!isNaN(collectionId)) {
        this.state = {
          ...this.state,
          currentPage: 'collection',
          selectedPaperId: null,
          selectedCollectionId: collectionId,
        };
      }
    } else if (path === '/export-ppt') {
      this.state = {
        ...this.state,
        currentPage: 'export-ppt',
        selectedPaperId: null,
      };
    } else {
      this.state = {
        ...this.state,
        currentPage: 'home',
        selectedPaperId: null,
        selectedCollectionId: null,
      };
    }

    this.loadViewModePreference();
    this.notify();
  }

  private saveViewModePreference(mode: ViewMode): void {
    try {
      localStorage.setItem('formPaper_viewMode', mode);
    } catch (error) {
      console.error('Error saving view mode preference:', error);
    }
  }

  private loadViewModePreference(): void {
    try {
      const saved = localStorage.getItem('formPaper_viewMode') as ViewMode;
      if (saved && ['grid', 'list', 'table'].includes(saved)) {
        this.state = { ...this.state, viewMode: saved };
      }
    } catch (error) {
      console.error('Error loading view mode preference:', error);
    }
  }

  handleBrowserNavigation(): void {
    window.addEventListener('popstate', () => {
      this.initializeFromURL();
    });
  }
}

export const navigationService = new NavigationService();