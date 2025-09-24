import React, { useState, useRef, useEffect } from 'react';
import { Plus, Minus, MoreHorizontal } from 'lucide-react';
import { TableBlockData } from '../../types/BlockTypes';
import { blockFactory } from '../../utils/blockFactory';

interface TableBlockProps {
  block: TableBlockData;
  isSelected: boolean;
  isFocused: boolean;
  onUpdate: (block: TableBlockData) => void;
  onDelete: () => void;
  onEnterPressed: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  readonly?: boolean;
}

const TableBlock: React.FC<TableBlockProps> = ({
  block,
  isSelected,
  isFocused,
  onUpdate,
  onDelete,
  onEnterPressed,
  onNavigateUp,
  onNavigateDown,
  readonly = false,
}) => {
  const [rows, setRows] = useState(block.rows || []);
  const [headers, setHeaders] = useState(block.headers || []);
  const [focusedCell, setFocusedCell] = useState<{row: number, col: number} | null>(null);
  const cellRefs = useRef<(HTMLInputElement | null)[][]>([]);

  useEffect(() => {
    setRows(block.rows || []);
    setHeaders(block.headers || []);
  }, [block.rows, block.headers]);

  useEffect(() => {
    if (isFocused && cellRefs.current[0]?.[0]) {
      cellRefs.current[0][0].focus();
      setFocusedCell({row: 0, col: 0});
    }
  }, [isFocused]);

  // Initialize refs array
  useEffect(() => {
    const totalRows = 1 + rows.length; // headers + data rows
    const totalCols = Math.max(headers.length, 1);

    cellRefs.current = Array(totalRows).fill(null).map(() =>
      Array(totalCols).fill(null)
    );
  }, [headers.length, rows.length]);

  const updateBlock = (newHeaders: string[], newRows: string[][]) => {
    const updatedBlock = blockFactory.updateBlock(block, {
      headers: newHeaders,
      rows: newRows
    });
    onUpdate(updatedBlock);
  };

  const handleHeaderChange = (colIndex: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    setHeaders(newHeaders);
    updateBlock(newHeaders, rows);
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...rows];
    if (!newRows[rowIndex]) {
      newRows[rowIndex] = [];
    }
    newRows[rowIndex][colIndex] = value;
    setRows(newRows);
    updateBlock(headers, newRows);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    const isHeaderRow = rowIndex === -1;
    const currentRow = isHeaderRow ? 0 : rowIndex + 1;
    const totalRows = 1 + rows.length;
    const totalCols = headers.length;

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Move to previous cell
          if (colIndex > 0) {
            cellRefs.current[currentRow]?.[colIndex - 1]?.focus();
            setFocusedCell({row: currentRow, col: colIndex - 1});
          } else if (currentRow > 0) {
            cellRefs.current[currentRow - 1]?.[totalCols - 1]?.focus();
            setFocusedCell({row: currentRow - 1, col: totalCols - 1});
          }
        } else {
          // Move to next cell
          if (colIndex < totalCols - 1) {
            cellRefs.current[currentRow]?.[colIndex + 1]?.focus();
            setFocusedCell({row: currentRow, col: colIndex + 1});
          } else if (currentRow < totalRows - 1) {
            cellRefs.current[currentRow + 1]?.[0]?.focus();
            setFocusedCell({row: currentRow + 1, col: 0});
          }
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (currentRow < totalRows - 1) {
          cellRefs.current[currentRow + 1]?.[colIndex]?.focus();
          setFocusedCell({row: currentRow + 1, col: colIndex});
        } else {
          onEnterPressed();
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (currentRow > 0) {
          cellRefs.current[currentRow - 1]?.[colIndex]?.focus();
          setFocusedCell({row: currentRow - 1, col: colIndex});
        } else {
          // We're on the first row (headers), navigate to previous block
          onNavigateUp?.();
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (currentRow < totalRows - 1) {
          cellRefs.current[currentRow + 1]?.[colIndex]?.focus();
          setFocusedCell({row: currentRow + 1, col: colIndex});
        } else {
          // We're on the last row, navigate to next block
          onNavigateDown?.();
        }
        break;

      case 'ArrowLeft':
        if (e.currentTarget.selectionStart === 0) {
          e.preventDefault();
          if (colIndex > 0) {
            cellRefs.current[currentRow]?.[colIndex - 1]?.focus();
            setFocusedCell({row: currentRow, col: colIndex - 1});
          }
        }
        break;

      case 'ArrowRight':
        if (e.currentTarget.selectionStart === e.currentTarget.value.length) {
          e.preventDefault();
          if (colIndex < totalCols - 1) {
            cellRefs.current[currentRow]?.[colIndex + 1]?.focus();
            setFocusedCell({row: currentRow, col: colIndex + 1});
          }
        }
        break;

      case 'Backspace':
        if (e.currentTarget.value === '' && headers.every(h => h === '') && rows.every(row => row.every(cell => cell === ''))) {
          e.preventDefault();
          onDelete();
        }
        break;
    }
  };

  const addColumn = () => {
    const newHeaders = [...headers, ''];
    const newRows = rows.map(row => [...row, '']);
    setHeaders(newHeaders);
    setRows(newRows);
    updateBlock(newHeaders, newRows);
  };

  const removeColumn = (colIndex: number) => {
    if (headers.length <= 1) return;

    const newHeaders = headers.filter((_, index) => index !== colIndex);
    const newRows = rows.map(row => row.filter((_, index) => index !== colIndex));
    setHeaders(newHeaders);
    setRows(newRows);
    updateBlock(newHeaders, newRows);
  };

  const addRow = () => {
    const newRows = [...rows, Array(headers.length).fill('')];
    setRows(newRows);
    updateBlock(headers, newRows);
  };

  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) return;

    const newRows = rows.filter((_, index) => index !== rowIndex);
    setRows(newRows);
    updateBlock(headers, newRows);
  };

  // Initialize with at least 2x2 table if empty
  useEffect(() => {
    if (headers.length === 0 && rows.length === 0) {
      const initialHeaders = ['Colonne 1', 'Colonne 2'];
      const initialRows = [['', ''], ['', '']];
      setHeaders(initialHeaders);
      setRows(initialRows);
      updateBlock(initialHeaders, initialRows);
    }
  }, []);

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">
          {/* Headers */}
          <thead>
            <tr className="bg-gray-50">
              {headers.map((header, colIndex) => (
                <th key={colIndex} className="border border-gray-300 p-0 relative group min-w-[120px]">
                  <input
                    ref={(el) => {
                      if (cellRefs.current[0]) {
                        cellRefs.current[0][colIndex] = el;
                      }
                    }}
                    type="text"
                    value={header}
                    onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, -1, colIndex)}
                    onFocus={() => setFocusedCell({row: 0, col: colIndex})}
                    placeholder={`Colonne ${colIndex + 1}`}
                    className="w-full p-2 border-none outline-none bg-transparent font-medium text-gray-900 placeholder-gray-400"
                    disabled={readonly}
                  />
                  {!readonly && headers.length > 1 && (
                    <button
                      onClick={() => removeColumn(colIndex)}
                      className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-100 transition-opacity"
                      title="Supprimer la colonne"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  )}
                </th>
              ))}
              {!readonly && (
                <th className="border border-gray-300 p-2 bg-gray-50 w-10">
                  <button
                    onClick={addColumn}
                    className="text-gray-500 hover:text-gray-700"
                    title="Ajouter une colonne"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </th>
              )}
            </tr>
          </thead>

          {/* Data rows */}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group">
                {headers.map((_, colIndex) => (
                  <td key={colIndex} className="border border-gray-300 p-0">
                    <input
                      ref={(el) => {
                        if (cellRefs.current[rowIndex + 1]) {
                          cellRefs.current[rowIndex + 1][colIndex] = el;
                        }
                      }}
                      type="text"
                      value={row[colIndex] || ''}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                      onFocus={() => setFocusedCell({row: rowIndex + 1, col: colIndex})}
                      className="w-full p-2 border-none outline-none bg-transparent text-gray-900"
                      disabled={readonly}
                    />
                  </td>
                ))}
                {!readonly && (
                  <td className="border border-gray-300 p-2 w-10 text-center">
                    {rows.length > 1 && (
                      <button
                        onClick={() => removeRow(rowIndex)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100 p-1 rounded transition-opacity"
                        title="Supprimer la ligne"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add row button */}
        {!readonly && (
          <div className="mt-2">
            <button
              onClick={addRow}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter une ligne
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableBlock;