export type BlockType = 'text' | 'heading1' | 'heading2' | 'heading3' | 'list' | 'image';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  metadata?: {
    level?: number;
    src?: string;
    alt?: string;
    caption?: string;
  };
}

export interface NotesData {
  paperId: number;
  blocks: Block[];
  lastModified: string;
}

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  type: BlockType;
  icon: string;
  keywords: string[];
}

export interface NotesStorage {
  [paperId: string]: NotesData;
}

export interface BlockProps {
  block: Block;
  index: number;
  onUpdate: (index: number, block: Block) => void;
  onDelete: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  isSelected?: boolean;
  onFocus?: () => void;
}