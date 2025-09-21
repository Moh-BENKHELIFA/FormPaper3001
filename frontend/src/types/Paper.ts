export interface Paper {
  id: number;
  title: string;
  authors: string;
  publication_date: string;
  conference: string;
  conference_short?: string;
  reading_status: 'unread' | 'reading' | 'read' | 'favorite';
  image: string | null;
  doi: string | null;
  url: string | null;
  folder_path: string | null;
  created_at: string;
  categories?: Category[];
  description?: Description;
  tags?: Tag[];
}

export interface Category {
  id: number;
  name: string;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
}

export interface Description {
  id: number;
  paper_id: number;
  texte: string;
  images: string[];
}

export interface PaperFormData {
  title: string;
  authors: string;
  publication_date: string;
  conference: string;
  conference_short?: string;
  doi?: string;
  url?: string;
  categories: string[];
  tags: string[];
}

export interface DOIMetadata {
  title: string;
  authors: string;
  year: number;
  month?: number;
  journal: string;
  journal_short?: string;
  abstract?: string;
  doi: string;
  url?: string;
}

export interface ExtractedImages {
  images: string[];
  total: number;
}

export interface PaperStats {
  total: number;
  unread: number;
  reading: number;
  read: number;
  favorite: number;
}

export interface PaperFilters {
  search: string;
  status: string;
  category: string;
  sortBy: 'date' | 'title' | 'authors';
  sortOrder: 'asc' | 'desc';
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}