export type BlockType = 'text' | 'h1' | 'h2' | 'h3' | 'list' | 'quote' | 'code' | 'image' | 'table' | 'todo' | 'separator';

export interface BaseBlockData {
  id: string;
  type: BlockType;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TextBlockData extends BaseBlockData {
  type: 'text';
  content: string;
}

export interface HeadingBlockData extends BaseBlockData {
  type: 'h1' | 'h2' | 'h3';
  content: string;
}

export interface ListBlockData extends BaseBlockData {
  type: 'list';
  items: string[];
  ordered: boolean;
}

export interface QuoteBlockData extends BaseBlockData {
  type: 'quote';
  content: string;
  author?: string;
}

export interface CodeBlockData extends BaseBlockData {
  type: 'code';
  content: string;
  language?: string;
}

export interface ImageBlockData extends BaseBlockData {
  type: 'image';
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface TableBlockData extends BaseBlockData {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface TodoBlockData extends BaseBlockData {
  type: 'todo';
  text: string;
  completed: boolean;
}

export interface SeparatorBlockData extends BaseBlockData {
  type: 'separator';
  style?: 'solid' | 'dashed' | 'dotted';
}

export type Block = TextBlockData | HeadingBlockData | ListBlockData | QuoteBlockData | CodeBlockData | ImageBlockData | TableBlockData | TodoBlockData | SeparatorBlockData;

// Legacy support
export interface LegacyBlock {
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
  shortcut: string;
}

export interface NotesStorage {
  [paperId: string]: NotesData;
}

export interface BlockProps {
  block: Block;
  index: number;
  onUpdate: (index: number, block: Block) => void;
  onDelete: (index: number) => void;
  onDuplicate?: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onEnterPressed?: (index: number) => void;
  isSelected?: boolean;
  isFocused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  readonly?: boolean;
}

export interface BlockComponentProps {
  block: Block;
  isSelected: boolean;
  isFocused: boolean;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onEnterPressed: () => void;
  readonly?: boolean;
}

export interface DragDropContextType {
  draggedBlockId: string | null;
  setDraggedBlockId: (id: string | null) => void;
}

export interface BlockFactory {
  createBlock: (type: BlockType, content?: any) => Block;
  getDefaultContent: (type: BlockType) => any;
  generateId: () => string;
}