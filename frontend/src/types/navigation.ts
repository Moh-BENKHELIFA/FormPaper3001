export type ViewMode = 'grid' | 'list' | 'table';

export type PageType = 'home' | 'notes' | 'add-paper' | 'settings';

export interface NavigationState {
  currentPage: PageType;
  selectedPaperId: number | null;
  viewMode: ViewMode;
  isLoading: boolean;
}

export interface NavigationActions {
  setCurrentPage: (page: PageType) => void;
  setSelectedPaperId: (id: number | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setIsLoading: (loading: boolean) => void;
  goToNotes: (paperId: number) => void;
  goToHome: () => void;
  goToAddPaper: () => void;
  goToSettings: () => void;
}

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isActive: boolean;
}