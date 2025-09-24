import { Block, BlockType, BlockFactory } from '../types/BlockTypes';

class BlockFactoryImpl implements BlockFactory {
  generateId(): string {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  createBlock(type: BlockType, content?: any): Block {
    const baseData = {
      id: this.generateId(),
      type,
      order: 0, // Will be set by the parent component
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    };

    switch (type) {
      case 'text':
        return {
          ...baseData,
          type: 'text',
          content: content || '',
        };

      case 'h1':
      case 'h2':
      case 'h3':
        return {
          ...baseData,
          type,
          content: content || '',
        };

      case 'list':
        return {
          ...baseData,
          type: 'list',
          items: content?.items || [''],
          ordered: content?.ordered || false,
        };

      case 'quote':
        return {
          ...baseData,
          type: 'quote',
          content: content?.content || '',
          author: content?.author || undefined,
        };

      case 'code':
        return {
          ...baseData,
          type: 'code',
          content: content?.content || '',
          language: content?.language || 'text',
        };

      case 'image':
        return {
          ...baseData,
          type: 'image',
          url: content?.url || '',
          alt: content?.alt || '',
          caption: content?.caption || '',
          width: content?.width || 100,
        };

      case 'table':
        return {
          ...baseData,
          type: 'table',
          headers: content?.headers || ['Colonne 1', 'Colonne 2'],
          rows: content?.rows || [['', '']],
        };

      case 'todo':
        return {
          ...baseData,
          type: 'todo',
          items: content?.items || [{ text: '', completed: false }],
        };

      default:
        // Fallback to text block
        return {
          ...baseData,
          type: 'text',
          content: '',
        };
    }
  }

  getDefaultContent(type: BlockType): any {
    switch (type) {
      case 'text':
        return '';
      case 'h1':
      case 'h2':
      case 'h3':
        return '';
      case 'list':
        return { items: [''], ordered: false };
      case 'quote':
        return { content: '', author: undefined };
      case 'code':
        return { content: '', language: 'text' };
      case 'image':
        return { url: '', alt: '', caption: '', width: 100 };
      case 'table':
        return { headers: ['Colonne 1', 'Colonne 2'], rows: [['', '']] };
      case 'todo':
        return { items: [{ text: '', completed: false }] };
      default:
        return '';
    }
  }

  // Method to update block timestamps
  updateBlock(block: Block, updates: Partial<Block>): Block {
    return {
      ...block,
      ...updates,
      updatedAt: this.getCurrentTimestamp(),
    };
  }

  // Method to duplicate a block with new ID and timestamps
  duplicateBlock(block: Block): Block {
    const newBlock = { ...block };
    newBlock.id = this.generateId();
    newBlock.createdAt = this.getCurrentTimestamp();
    newBlock.updatedAt = this.getCurrentTimestamp();
    return newBlock;
  }
}

export const blockFactory = new BlockFactoryImpl();