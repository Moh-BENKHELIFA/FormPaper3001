export type ViewMode = 'grid' | 'list' | 'table' | 'images';

export type PageType = 'home' | 'notes' | 'add-paper' | 'manage-paper' | 'settings' | 'create-collection' | 'collection' | 'export-ppt';

export interface NavigationState {
  currentPage: PageType;
  selectedPaperId: number | null;
  selectedCollectionId: number | null;
  viewMode: ViewMode;
  isLoading: boolean;
}

export interface NavigationActions {
  setCurrentPage: (page: PageType) => void;
  setSelectedPaperId: (id: number | null) => void;
  setSelectedCollectionId: (id: number | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setIsLoading: (loading: boolean) => void;
  goToNotes: (paperId: number) => void;
  goToHome: () => void;
  goToAddPaper: () => void;
  goToManagePaper: (paperId: number) => void;
  goToSettings: () => void;
  goToCreateCollection: () => void;
  goToCollection: (collectionId: number) => void;
  goToExportPpt: () => void;
}

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isActive: boolean;
}