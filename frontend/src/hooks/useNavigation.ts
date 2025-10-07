import { useState, useEffect } from 'react';
import { navigationService } from '../services/navigationService';
import { NavigationState, NavigationActions } from '../types/navigation';

export const useNavigation = (): NavigationState & NavigationActions => {
  const [state, setState] = useState<NavigationState>(navigationService.getState());

  useEffect(() => {
    const unsubscribe = navigationService.subscribe(setState);
    navigationService.initializeFromURL();
    navigationService.handleBrowserNavigation();

    return unsubscribe;
  }, []);

  const actions: NavigationActions = {
    setCurrentPage: navigationService.setCurrentPage.bind(navigationService),
    setSelectedPaperId: navigationService.setSelectedPaperId.bind(navigationService),
    setSelectedCollectionId: navigationService.setSelectedCollectionId.bind(navigationService),
    setViewMode: navigationService.setViewMode.bind(navigationService),
    setIsLoading: navigationService.setIsLoading.bind(navigationService),
    goToNotes: navigationService.goToNotes.bind(navigationService),
    goToHome: navigationService.goToHome.bind(navigationService),
    goToAddPaper: navigationService.goToAddPaper.bind(navigationService),
    goToManagePaper: navigationService.goToManagePaper.bind(navigationService),
    goToSettings: navigationService.goToSettings.bind(navigationService),
    goToCreateCollection: navigationService.goToCreateCollection.bind(navigationService),
    goToCollection: navigationService.goToCollection.bind(navigationService),
  };

  return {
    ...state,
    ...actions,
  };
};