import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { ListBlockData } from '../../types/BlockTypes';
import { blockFactory } from '../../utils/blockFactory';

interface ListBlockProps {
  block: ListBlockData;
  isSelected: boolean;
  isFocused: boolean;
  onUpdate: (block: ListBlockData) => void;
  onDelete: () => void;
  onEnterPressed: () => void;
  readonly?: boolean;
}

const ListBlock: React.FC<ListBlockProps> = ({
  block,
  isSelected,
  isFocused,
  onUpdate,
  onDelete,
  onEnterPressed,
  readonly = false,
}) => {
  const [items, setItems] = useState(block.items);
  const [ordered, setOrdered] = useState(block.ordered);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setItems(block.items);
    setOrdered(block.ordered);
  }, [block.items, block.ordered]);

  useEffect(() => {
    if (isFocused && focusedIndex === null && itemRefs.current[0]) {
      itemRefs.current[0].focus();
      setFocusedIndex(0);
    }
  }, [isFocused]);

  const updateBlock = () => {
    const updatedBlock = blockFactory.updateBlock(block, { items, ordered });
    onUpdate(updatedBlock);
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);

    const updatedBlock = blockFactory.updateBlock(block, { items: newItems, ordered });
    onUpdate(updatedBlock);
  };

  const handleItemKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem(index + 1);
    }

    if (e.key === 'Backspace' && items[index] === '') {
      e.preventDefault();
      if (items.length === 1) {
        onDelete();
      } else {
        removeItem(index);
      }
    }

    if (e.key === 'ArrowDown' && index < items.length - 1) {
      e.preventDefault();
      itemRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      itemRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
  };

  const addItem = (index?: number) => {
    const insertIndex = index ?? items.length;
    const newItems = [...items];
    newItems.splice(insertIndex, 0, '');
    setItems(newItems);

    setTimeout(() => {
      itemRefs.current[insertIndex]?.focus();
      setFocusedIndex(insertIndex);
    }, 0);

    const updatedBlock = blockFactory.updateBlock(block, { items: newItems, ordered });
    onUpdate(updatedBlock);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;

    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);

    const focusIndex = Math.max(0, index - 1);
    setTimeout(() => {
      itemRefs.current[focusIndex]?.focus();
      setFocusedIndex(focusIndex);
    }, 0);

    const updatedBlock = blockFactory.updateBlock(block, { items: newItems, ordered });
    onUpdate(updatedBlock);
  };

  const toggleOrdered = () => {
    const newOrdered = !ordered;
    setOrdered(newOrdered);
    const updatedBlock = blockFactory.updateBlock(block, { items, ordered: newOrdered });
    onUpdate(updatedBlock);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={toggleOrdered}
          className="text-sm px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
          disabled={readonly}
        >
          {ordered ? 'Liste numérotée' : 'Liste à puces'}
        </button>
      </div>

      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-center group">
            <span className="w-6 text-sm text-gray-500 flex-shrink-0">
              {ordered ? `${index + 1}.` : '•'}
            </span>
            <input
              ref={(el) => (itemRefs.current[index] = el)}
              type="text"
              value={item}
              onChange={(e) => handleItemChange(index, e.target.value)}
              onKeyDown={(e) => handleItemKeyDown(index, e)}
              onFocus={() => setFocusedIndex(index)}
              placeholder="Élément de liste"
              className={`
                flex-1 border-none outline-none bg-transparent text-gray-900
                placeholder-gray-400 ml-2
                ${readonly ? 'cursor-default' : 'cursor-text'}
              `}
              disabled={readonly}
            />
            {!readonly && items.length > 1 && (
              <button
                onClick={() => removeItem(index)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!readonly && (
        <button
          onClick={() => addItem()}
          className="flex items-center mt-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter un élément
        </button>
      )}
    </div>
  );
};

export default ListBlock;