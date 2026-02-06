'use client';

// Item inspection modal component
// The Marble Swindle - UI Component

import { useState, useEffect, useCallback } from 'react';
import { ItemDefinition } from '@/types/game';
import { addScriptEventListener, signalDialogueDismissed } from '@/engine/ScriptRunner';

interface ItemInspectorProps {
  items: Map<string, ItemDefinition>;
  onClose?: () => void;
  onUseItem?: (itemId: string) => void;
  onCombineItems?: (itemId1: string, itemId2: string) => void;
}

export default function ItemInspector({
  items,
  onClose,
  onUseItem,
  onCombineItems,
}: ItemInspectorProps) {
  const [inspectedItem, setInspectedItem] = useState<ItemDefinition | null>(null);
  const [combineMode, setCombineMode] = useState(false);
  const [combineItem, setCombineItem] = useState<string | null>(null);
  const [showCombineHint, setShowCombineHint] = useState(false);

  // Listen for script events to show item acquisition
  useEffect(() => {
    const unsubscribe = addScriptEventListener((type, data) => {
      if (type === 'itemAdded') {
        const { itemId } = data as { itemId: string };
        const item = items.get(itemId);
        if (item) {
          // Brief flash showing the new item
          setInspectedItem(item);
          setTimeout(() => {
            setInspectedItem(null);
          }, 2000);
        }
      }
    });

    return unsubscribe;
  }, [items]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (combineMode) {
          setCombineMode(false);
          setCombineItem(null);
        } else if (inspectedItem) {
          handleClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectedItem, combineMode]);

  const handleClose = useCallback(() => {
    setInspectedItem(null);
    setCombineMode(false);
    setCombineItem(null);
    onClose?.();
  }, [onClose]);

  const handleInspect = useCallback((itemId: string) => {
    const item = items.get(itemId);
    if (item) {
      setInspectedItem(item);
    }
  }, [items]);

  const handleUse = useCallback(() => {
    if (inspectedItem) {
      onUseItem?.(inspectedItem.id);
      handleClose();
    }
  }, [inspectedItem, onUseItem, handleClose]);

  const handleStartCombine = useCallback(() => {
    if (inspectedItem?.canCombineWith && inspectedItem.canCombineWith.length > 0) {
      setCombineMode(true);
      setCombineItem(inspectedItem.id);
      setShowCombineHint(true);
      setInspectedItem(null);
    }
  }, [inspectedItem]);

  const handleCombineTarget = useCallback((targetItemId: string) => {
    if (combineItem && onCombineItems) {
      onCombineItems(combineItem, targetItemId);
      setCombineMode(false);
      setCombineItem(null);
      setShowCombineHint(false);
    }
  }, [combineItem, onCombineItems]);

  // Expose inspect method for external use
  useEffect(() => {
    (window as unknown as { inspectItem: (id: string) => void }).inspectItem = handleInspect;
    return () => {
      delete (window as unknown as { inspectItem?: (id: string) => void }).inspectItem;
    };
  }, [handleInspect]);

  if (!inspectedItem && !showCombineHint) {
    return null;
  }

  return (
    <>
      {/* Combine mode hint banner */}
      {showCombineHint && !inspectedItem && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="px-6 py-3 bg-amber-900/95 border-2 border-amber-500 rounded-lg shadow-lg">
            <p className="text-amber-200 text-center">
              Select an item from inventory to combine with{' '}
              <span className="font-bold text-amber-400">
                {items.get(combineItem!)?.name}
              </span>
            </p>
            <p className="text-amber-400/60 text-sm text-center mt-1">
              Press ESC to cancel
            </p>
          </div>
        </div>
      )}

      {/* Item inspection modal */}
      {inspectedItem && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={handleClose}
        >
          <div
            className="bg-gradient-to-b from-amber-900 to-amber-950 p-6 rounded-xl border-4 border-amber-600 shadow-2xl max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Item header */}
            <div className="flex items-start gap-4 mb-4">
              {/* Item icon */}
              <div className="w-24 h-24 bg-amber-800 rounded-lg border-2 border-amber-500 flex items-center justify-center flex-shrink-0">
                <img
                  src={inspectedItem.icon}
                  alt={inspectedItem.name}
                  className="w-20 h-20 object-contain pixelated"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/items/item_placeholder.png';
                  }}
                />
              </div>

              {/* Item name and description */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-amber-200 mb-2">
                  {inspectedItem.name}
                </h2>
                <p className="text-amber-400/80 text-sm">
                  {inspectedItem.description}
                </p>
              </div>
            </div>

            {/* Examine text */}
            <div className="bg-amber-950/50 rounded-lg p-4 mb-4 border border-amber-700/50">
              <p className="text-amber-100 italic leading-relaxed">
                "{inspectedItem.examineText}"
              </p>
            </div>

            {/* Combinable items hint */}
            {inspectedItem.canCombineWith && inspectedItem.canCombineWith.length > 0 && (
              <div className="text-amber-500/70 text-sm mb-4">
                <span className="text-amber-400">Hint:</span> This item can be combined with other items.
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              {inspectedItem.canCombineWith && inspectedItem.canCombineWith.length > 0 && (
                <button
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-emerald-100 rounded-lg transition-colors border border-emerald-500"
                  onClick={handleStartCombine}
                >
                  Combine...
                </button>
              )}
              <button
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors border border-amber-500"
                onClick={handleUse}
              >
                Use
              </button>
              <button
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors border border-slate-500"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Export a hook for controlling inspection from parent
export function useItemInspector(items: Map<string, ItemDefinition>) {
  const [inspectedItemId, setInspectedItemId] = useState<string | null>(null);

  const inspect = useCallback((itemId: string) => {
    setInspectedItemId(itemId);
  }, []);

  const close = useCallback(() => {
    setInspectedItemId(null);
  }, []);

  const item = inspectedItemId ? items.get(inspectedItemId) : null;

  return {
    inspectedItemId,
    inspectedItem: item,
    inspect,
    close,
    isOpen: !!inspectedItemId,
  };
}
