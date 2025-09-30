import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Block, BlockType } from '../types/BlockTypes';
import { blockFactory } from '../utils/blockFactory';
import { SlashCommandMatcher, SLASH_COMMANDS } from '../utils/slashCommands';
import { imageService } from '../services/imageService';

// Import all block components
import BaseBlock from './blocks/BaseBlock';
import TextBlock from './blocks/TextBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ListBlock from './blocks/ListBlock';
import QuoteBlock from './blocks/QuoteBlock';
import CodeBlock from './blocks/CodeBlock';
import ImageBlock from './blocks/ImageBlock';
import TableBlock from './blocks/TableBlock';
import TodoBlock from './blocks/TodoBlock';
import SeparatorBlock from './blocks/SeparatorBlock';

interface BlockEditorProps {
  articleId?: string;
  initialBlocks?: Block[];
  readonly?: boolean;
  onSave?: (blocks: Block[]) => void;
}

interface SlashCommandSuggestion {
  id: string;
  label: string;
  description: string;
  icon: string;
  type: BlockType;
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  articleId,
  initialBlocks = [],
  readonly = false,
  onSave,
}) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [focusedBlockIndex, setFocusedBlockIndex] = useState<number | null>(null);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashSuggestions, setSlashSuggestions] = useState<SlashCommandSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [slashMenuPosition, setSlashMenuPosition] = useState<{x: number, y: number} | null>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize with empty text block if no blocks
  useEffect(() => {
    if (blocks.length === 0) {
      const initialBlock = blockFactory.createBlock('text');
      setBlocks([initialBlock]);
      setFocusedBlockIndex(0);
    }
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (blocks.length > 0 && onSave) {
      const timeoutId = setTimeout(() => {
        onSave(blocks);
      }, 1000); // Auto-save after 1 second of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [blocks, onSave]);

  const handleBlockUpdate = useCallback((index: number, updatedBlock: Block) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      newBlocks[index] = {
        ...updatedBlock,
        order: index,
        updatedAt: new Date().toISOString(),
      };
      return newBlocks;
    });

    // Handle slash command detection in text blocks
    if (updatedBlock.type === 'text' && 'content' in updatedBlock) {
      const content = updatedBlock.content as string;
      if (SlashCommandMatcher.isSlashCommand(content)) {
        setSlashQuery(content);
        const suggestions = SlashCommandMatcher.searchCommands(content);
        setSlashSuggestions(suggestions);
        setShowSlashCommands(suggestions.length > 0);
        setSelectedSuggestionIndex(0);

        // Calculate menu position based on current block
        setTimeout(() => {
          const blockElement = blockRefs.current[index];
          if (blockElement && editorRef.current) {
            const blockRect = blockElement.getBoundingClientRect();
            const editorRect = editorRef.current.getBoundingClientRect();
            setSlashMenuPosition({
              x: blockRect.left - editorRect.left + 50,
              y: blockRect.bottom - editorRect.top + 10
            });
          }
        }, 0);
      } else {
        setShowSlashCommands(false);
        setSlashQuery('');
        setSlashMenuPosition(null);
      }
    }
  }, []);

  const handleBlockDelete = useCallback((index: number) => {
    if (blocks.length === 1) {
      // If it's the only block, replace with empty text block
      const newBlock = blockFactory.createBlock('text');
      setBlocks([newBlock]);
      setFocusedBlockIndex(0);
    } else {
      setBlocks(prevBlocks => {
        const newBlocks = prevBlocks.filter((_, i) => i !== index);
        return newBlocks.map((block, i) => ({ ...block, order: i }));
      });

      // Adjust focus
      const newFocusIndex = Math.max(0, index - 1);
      setFocusedBlockIndex(newFocusIndex);
    }
  }, [blocks.length]);

  const handleBlockDuplicate = useCallback((index: number) => {
    const blockToDuplicate = blocks[index];
    const duplicatedBlock = {
      ...blockFactory.createBlock(blockToDuplicate.type),
      ...(blockToDuplicate as any), // Copy all properties
      id: blockFactory.generateId(), // Generate new ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      newBlocks.splice(index + 1, 0, duplicatedBlock);
      return newBlocks.map((block, i) => ({ ...block, order: i }));
    });

    setFocusedBlockIndex(index + 1);
  }, [blocks]);

  const handleBlockFocus = useCallback((index: number) => {
    setFocusedBlockIndex(index);
    setSelectedBlockIndex(index);
  }, []);

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    // Check if the click is on the editor background (not on a block or its children)
    const target = e.target as HTMLElement;
    const isEditorBackground = target === e.currentTarget || target.classList.contains('editor-background');

    if (isEditorBackground) {
      // Defocus all blocks
      setFocusedBlockIndex(null);
      setSelectedBlockIndex(null);
      setShowSlashCommands(false);
      setSlashQuery('');
      setSlashMenuPosition(null);
    }
  }, []);

  const handleCreateNewBlock = useCallback(() => {
    if (focusedBlockIndex !== null) {
      // Create new block after the focused block
      const newBlock = blockFactory.createBlock('text');
      setBlocks(prevBlocks => {
        const newBlocks = [...prevBlocks];
        newBlocks.splice(focusedBlockIndex + 1, 0, newBlock);
        return newBlocks.map((block, i) => ({ ...block, order: i }));
      });

      // Focus the new block
      setTimeout(() => {
        setFocusedBlockIndex(focusedBlockIndex + 1);
      }, 0);
    } else {
      // Create new block at the end if no block is focused
      const newBlock = blockFactory.createBlock('text');
      setBlocks(prevBlocks => {
        const newBlocks = [...prevBlocks, newBlock];
        return newBlocks.map((block, i) => ({ ...block, order: i }));
      });

      // Focus the new block
      setTimeout(() => {
        setFocusedBlockIndex(blocks.length);
      }, 0);
    }
  }, [focusedBlockIndex, blocks.length]);

  // Global keyboard event listener for Ctrl+Enter
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Handle Ctrl+Enter to create new block - works even when no block is focused
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleCreateNewBlock();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleCreateNewBlock]);

  const handleEnterPressed = useCallback((index: number) => {
    // Hide slash commands when creating new block
    setShowSlashCommands(false);
    setSlashQuery('');

    // Create new text block after current block
    const newBlock = blockFactory.createBlock('text');
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks.map((block, i) => ({ ...block, order: i }));
    });

    // Focus the new block
    setTimeout(() => {
      setFocusedBlockIndex(index + 1);
    }, 0);
  }, []);

  const handleSlashCommandSelect = useCallback((command: SlashCommandSuggestion) => {
    if (focusedBlockIndex === null) return;

    // Replace current block with the selected block type
    const newBlock = blockFactory.createBlock(command.type);
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      newBlocks[focusedBlockIndex] = {
        ...newBlock,
        order: focusedBlockIndex,
      };
      return newBlocks;
    });

    setShowSlashCommands(false);
    setSlashQuery('');

    // Refocus the block
    setTimeout(() => {
      setFocusedBlockIndex(focusedBlockIndex);
    }, 0);
  }, [focusedBlockIndex]);

  const handleBlockDragStart = useCallback((index: number) => {
    setDraggedBlockIndex(index);
  }, []);

  const handleBlockDragEnd = useCallback(() => {
    setDraggedBlockIndex(null);
    setDropTargetIndex(null);
  }, []);

  const handleBlockDragOver = useCallback((index: number) => {
    if (draggedBlockIndex !== null && draggedBlockIndex !== index) {
      setDropTargetIndex(index);
    }
  }, [draggedBlockIndex]);

  const handleBlockDrop = useCallback((targetIndex: number) => {
    if (draggedBlockIndex !== null && draggedBlockIndex !== targetIndex) {
      setBlocks(prevBlocks => {
        const newBlocks = [...prevBlocks];
        const draggedBlock = newBlocks[draggedBlockIndex];

        // Remove the dragged block
        newBlocks.splice(draggedBlockIndex, 1);

        // Calculate the new insertion index
        const insertIndex = draggedBlockIndex < targetIndex ? targetIndex - 1 : targetIndex;

        // Insert the block at the new position
        newBlocks.splice(insertIndex, 0, draggedBlock);

        // Update the order of all blocks
        return newBlocks.map((block, i) => ({ ...block, order: i }));
      });

      // Update focus to follow the moved block
      const newIndex = draggedBlockIndex < targetIndex ? targetIndex - 1 : targetIndex;
      setFocusedBlockIndex(newIndex);
      setSelectedBlockIndex(newIndex);
    }

    setDraggedBlockIndex(null);
    setDropTargetIndex(null);
  }, [draggedBlockIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showSlashCommands) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev =>
            Math.min(prev + 1, slashSuggestions.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (slashSuggestions[selectedSuggestionIndex]) {
            handleSlashCommandSelect(slashSuggestions[selectedSuggestionIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSlashCommands(false);
          setSlashQuery('');
          break;
      }
      return;
    }

    // Handle Ctrl+Enter to create new block
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleCreateNewBlock();
      return;
    }

    // Handle arrow key navigation between blocks
    if (!e.ctrlKey && !e.shiftKey && !e.altKey && focusedBlockIndex !== null) {
      const activeElement = document.activeElement;
      if (!activeElement) return;

      // Skip navigation if we're inside a table, todo block, or list block - let them handle their own navigation
      if (activeElement.closest('table') || activeElement.closest('[data-todo-block="true"]') || activeElement.closest('[data-list-block="true"]')) {
        return;
      }

      if (e.key === 'ArrowUp' && focusedBlockIndex > 0) {
        // Get cursor position for text elements
        let shouldMoveUp = false;

        if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
          const input = activeElement as HTMLInputElement | HTMLTextAreaElement;
          const cursorPosition = input.selectionStart || 0;
          const textBeforeCursor = input.value.substring(0, cursorPosition);
          const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');

          // If cursor is on the first line (no newline before cursor position)
          shouldMoveUp = lastNewlineIndex === -1;
        } else if (activeElement.getAttribute('contenteditable') === 'true') {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const elementRect = activeElement.getBoundingClientRect();

            // Check if cursor is at the top line (within 30px of element top)
            shouldMoveUp = rect.top - elementRect.top <= 30;
          }
        }

        if (shouldMoveUp) {
          e.preventDefault();
          setFocusedBlockIndex(focusedBlockIndex - 1);
          setTimeout(() => {
            const prevBlock = blockRefs.current[focusedBlockIndex - 1];
            if (prevBlock) {
              const focusableElement = prevBlock.querySelector('input, textarea, [contenteditable]') as HTMLElement;
              if (focusableElement) {
                focusableElement.focus();
                // Move cursor to end for previous block
                if (focusableElement.tagName === 'INPUT' || focusableElement.tagName === 'TEXTAREA') {
                  const input = focusableElement as HTMLInputElement;
                  input.setSelectionRange(input.value.length, input.value.length);
                } else if (focusableElement.getAttribute('contenteditable') === 'true') {
                  // Move cursor to end of contenteditable
                  const range = document.createRange();
                  const selection = window.getSelection();
                  range.selectNodeContents(focusableElement);
                  range.collapse(false);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                }
              }
            }
          }, 0);
        }
      } else if (e.key === 'ArrowDown' && focusedBlockIndex < blocks.length - 1) {
        // Get cursor position for text elements
        let shouldMoveDown = false;

        if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
          const input = activeElement as HTMLInputElement | HTMLTextAreaElement;
          const cursorPosition = input.selectionStart || 0;
          const textAfterCursor = input.value.substring(cursorPosition);
          const nextNewlineIndex = textAfterCursor.indexOf('\n');

          // If cursor is on the last line (no newline after cursor position)
          shouldMoveDown = nextNewlineIndex === -1;
        } else if (activeElement.getAttribute('contenteditable') === 'true') {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const elementRect = activeElement.getBoundingClientRect();

            // Check if cursor is at the bottom line (within 30px of element bottom)
            shouldMoveDown = elementRect.bottom - rect.bottom <= 30;
          }
        }

        if (shouldMoveDown) {
          e.preventDefault();
          setFocusedBlockIndex(focusedBlockIndex + 1);
          setTimeout(() => {
            const nextBlock = blockRefs.current[focusedBlockIndex + 1];
            if (nextBlock) {
              const focusableElement = nextBlock.querySelector('input, textarea, [contenteditable]') as HTMLElement;
              if (focusableElement) {
                focusableElement.focus();
                // Move cursor to beginning for next block
                if (focusableElement.tagName === 'INPUT' || focusableElement.tagName === 'TEXTAREA') {
                  (focusableElement as HTMLInputElement).setSelectionRange(0, 0);
                } else if (focusableElement.getAttribute('contenteditable') === 'true') {
                  // Move cursor to beginning of contenteditable
                  const range = document.createRange();
                  const selection = window.getSelection();
                  range.selectNodeContents(focusableElement);
                  range.collapse(true);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                }
              }
            }
          }, 0);
        }
      }
    }

    // Handle Ctrl+V for pasting images
    if (e.ctrlKey && e.key === 'v') {
      // Let the paste event handler take care of this
      return;
    }
  }, [showSlashCommands, slashSuggestions, selectedSuggestionIndex, handleSlashCommandSelect, focusedBlockIndex, blocks.length, blockRefs]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();

        const file = item.getAsFile();
        if (file && focusedBlockIndex !== null && articleId) {
          try {
            // Upload image to server
            const uploadResult = await imageService.uploadImage(file, articleId);

            const currentBlock = blocks[focusedBlockIndex];

            // Check if current block is empty (text block with no content)
            const isEmptyTextBlock = currentBlock?.type === 'text' &&
              ('content' in currentBlock) &&
              (!currentBlock.content || currentBlock.content.trim() === '');

            if (isEmptyTextBlock) {
              // Transform current empty block into image block
              const newImageBlock = blockFactory.createBlock('image', {
                url: uploadResult.url,
                alt: 'Image collée',
                caption: '',
                width: 100
              });

              setBlocks(prevBlocks => {
                const newBlocks = [...prevBlocks];
                newBlocks[focusedBlockIndex] = {
                  ...newImageBlock,
                  order: focusedBlockIndex,
                };
                return newBlocks;
              });
            } else {
              // Create new image block after current block
              const newImageBlock = blockFactory.createBlock('image', {
                url: uploadResult.url,
                alt: 'Image collée',
                caption: '',
                width: 100
              });

              const insertIndex = focusedBlockIndex + 1;

              setBlocks(prevBlocks => {
                const newBlocks = [...prevBlocks];
                newBlocks.splice(insertIndex, 0, newImageBlock);
                return newBlocks.map((block, i) => ({ ...block, order: i }));
              });

              // Focus the new image block
              setTimeout(() => {
                setFocusedBlockIndex(insertIndex);
              }, 0);
            }
          } catch (error) {
            console.error('Error uploading image:', error);
            // Fall back to temporary URL if upload fails
            const imageUrl = URL.createObjectURL(file);

            const currentBlock = blocks[focusedBlockIndex];
            const isEmptyTextBlock = currentBlock?.type === 'text' &&
              ('content' in currentBlock) &&
              (!currentBlock.content || currentBlock.content.trim() === '');

            const newImageBlock = blockFactory.createBlock('image', {
              url: imageUrl,
              alt: 'Image collée (temporaire)',
              caption: '',
              width: 100
            });

            if (isEmptyTextBlock) {
              setBlocks(prevBlocks => {
                const newBlocks = [...prevBlocks];
                newBlocks[focusedBlockIndex] = {
                  ...newImageBlock,
                  order: focusedBlockIndex,
                };
                return newBlocks;
              });
            } else {
              const insertIndex = focusedBlockIndex + 1;
              setBlocks(prevBlocks => {
                const newBlocks = [...prevBlocks];
                newBlocks.splice(insertIndex, 0, newImageBlock);
                return newBlocks.map((block, i) => ({ ...block, order: i }));
              });
              setTimeout(() => {
                setFocusedBlockIndex(insertIndex);
              }, 0);
            }
          }
        }
        break;
      }
    }
  }, [focusedBlockIndex, blocks, articleId]);

  const renderBlock = (block: Block, index: number) => {
    const isSelected = selectedBlockIndex === index && selectedBlockIndex !== null;
    const isFocused = focusedBlockIndex === index && focusedBlockIndex !== null;

    const commonProps = {
      block,
      isSelected,
      isFocused,
      onUpdate: (updatedBlock: Block) => handleBlockUpdate(index, updatedBlock),
      onDelete: () => handleBlockDelete(index),
      onEnterPressed: () => handleEnterPressed(index),
      readonly,
    };

    // Navigation callbacks for TableBlock
    const handleNavigateUp = () => {
      if (index > 0) {
        setFocusedBlockIndex(index - 1);
        setTimeout(() => {
          const prevBlock = blockRefs.current[index - 1];
          if (prevBlock) {
            const focusableElement = prevBlock.querySelector('input, textarea, [contenteditable]') as HTMLElement;
            if (focusableElement) {
              focusableElement.focus();
              // Move cursor to end for previous block
              if (focusableElement.tagName === 'INPUT' || focusableElement.tagName === 'TEXTAREA') {
                const input = focusableElement as HTMLInputElement;
                input.setSelectionRange(input.value.length, input.value.length);
              } else if (focusableElement.getAttribute('contenteditable') === 'true') {
                // Move cursor to end of contenteditable
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(focusableElement);
                range.collapse(false);
                selection?.removeAllRanges();
                selection?.addRange(range);
              }
            }
          }
        }, 0);
      }
    };

    const handleNavigateDown = () => {
      if (index < blocks.length - 1) {
        setFocusedBlockIndex(index + 1);
        setTimeout(() => {
          const nextBlock = blockRefs.current[index + 1];
          if (nextBlock) {
            const focusableElement = nextBlock.querySelector('input, textarea, [contenteditable]') as HTMLElement;
            if (focusableElement) {
              focusableElement.focus();
              // Move cursor to beginning for next block
              if (focusableElement.tagName === 'INPUT' || focusableElement.tagName === 'TEXTAREA') {
                (focusableElement as HTMLInputElement).setSelectionRange(0, 0);
              } else if (focusableElement.getAttribute('contenteditable') === 'true') {
                // Move cursor to beginning of contenteditable
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(focusableElement);
                range.collapse(true);
                selection?.removeAllRanges();
                selection?.addRange(range);
              }
            }
          }
        }, 0);
      }
    };

    let blockComponent;
    switch (block.type) {
      case 'text':
        blockComponent = <TextBlock {...commonProps} block={block as any} />;
        break;
      case 'h1':
      case 'h2':
      case 'h3':
        blockComponent = <HeadingBlock {...commonProps} block={block as any} />;
        break;
      case 'list':
        blockComponent = <ListBlock {...commonProps} block={block as any} onNavigateUp={handleNavigateUp} onNavigateDown={handleNavigateDown} />;
        break;
      case 'quote':
        blockComponent = <QuoteBlock {...commonProps} block={block as any} />;
        break;
      case 'code':
        blockComponent = <CodeBlock {...commonProps} block={block as any} />;
        break;
      case 'image':
        blockComponent = <ImageBlock {...commonProps} block={block as any} articleId={articleId} />;
        break;
      case 'table':
        blockComponent = <TableBlock {...commonProps} block={block as any} onNavigateUp={handleNavigateUp} onNavigateDown={handleNavigateDown} />;
        break;
      case 'todo':
        blockComponent = <TodoBlock {...commonProps} block={block as any} onNavigateUp={handleNavigateUp} onNavigateDown={handleNavigateDown} />;
        break;
      case 'separator':
        blockComponent = <SeparatorBlock {...commonProps} block={block as any} />;
        break;
      default:
        blockComponent = <TextBlock {...commonProps} block={block as any} />;
    }

    return (
      <div
        key={block.id}
        ref={(el) => (blockRefs.current[index] = el)}
      >
        <BaseBlock
          block={block}
          index={index}
          isSelected={isSelected}
          isFocused={isFocused}
          onUpdate={handleBlockUpdate}
          onDelete={handleBlockDelete}
          onDuplicate={handleBlockDuplicate}
          onFocus={handleBlockFocus}
          onEnterPressed={handleEnterPressed}
          onDragStart={handleBlockDragStart}
          onDragEnd={handleBlockDragEnd}
          onDragOver={handleBlockDragOver}
          onDrop={handleBlockDrop}
          isDragging={draggedBlockIndex === index}
          isDropTarget={dropTargetIndex === index}
          className="mb-2"
        >
          {blockComponent}
        </BaseBlock>
      </div>
    );
  };

  return (
    <div
      ref={editorRef}
      className="w-full max-w-4xl mx-auto p-4 min-h-screen editor-background"
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onClick={handleEditorClick}
      tabIndex={-1}
    >
      {/* Blocks */}
      <div className="space-y-1">
        {blocks.map((block, index) => renderBlock(block, index))}
      </div>

      {/* Add New Block Button */}
      <div className="mt-4 mb-8 editor-background" onClick={handleEditorClick}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCreateNewBlock();
          }}
          className="flex items-center justify-center w-full py-3 px-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-200 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Créer un nouveau bloc
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-600 font-mono">Ctrl+Entrée</span>
        </button>
      </div>

      {/* Empty space at the bottom for clicking to defocus */}
      <div
        className="editor-background"
        style={{ minHeight: '100px', width: '100%' }}
        onClick={handleEditorClick}
      ></div>

      {/* Slash Command Suggestions */}
      {showSlashCommands && slashSuggestions.length > 0 && focusedBlockIndex !== null && slashMenuPosition && (
        <div
          className="absolute bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 max-w-xs"
          style={{
            top: `${slashMenuPosition.y}px`,
            left: `${slashMenuPosition.x}px`
          }}
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">BLOCS</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {slashSuggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => handleSlashCommandSelect(suggestion)}
                className={`
                  w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3
                  ${index === selectedSuggestionIndex ? 'bg-blue-50 dark:bg-gray-700 border-r-2 border-blue-500' : ''}
                `}
              >
                <span className="text-lg">{suggestion.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{suggestion.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{suggestion.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400">
          <p>Blocs: {blocks.length}</p>
          <p>Focus: {focusedBlockIndex}</p>
          <p>Slash: {showSlashCommands ? slashQuery : 'none'}</p>
        </div>
      )}
    </div>
  );
};

export default BlockEditor;