'use client';

// Save/Load menu component
// The Marble Swindle - UI Component

import { useState, useCallback } from 'react';
import { useSaveLoad, SaveSlotInfo } from '@/hooks/useGameState';

interface SaveLoadMenuProps {
  mode: 'save' | 'load';
  onClose: () => void;
  onAction?: (slot: number, success: boolean) => void;
}

export default function SaveLoadMenu({ mode, onClose, onAction }: SaveLoadMenuProps) {
  const { allSlots, save, load, deleteSlot, isSaving, isLoading, lastError } = useSaveLoad();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const handleSlotClick = useCallback((slot: SaveSlotInfo) => {
    setSelectedSlot(slot.slot);
    setConfirmDelete(null);
    
    if (mode === 'save') {
      setCustomName(slot.data?.slotName || `Save ${slot.slot}`);
    }
  }, [mode]);

  const handleSave = useCallback(async () => {
    if (selectedSlot === null) return;
    
    const success = await save(selectedSlot, customName || undefined);
    onAction?.(selectedSlot, success);
    
    if (success) {
      onClose();
    }
  }, [selectedSlot, customName, save, onAction, onClose]);

  const handleLoad = useCallback(async () => {
    if (selectedSlot === null) return;
    
    const success = await load(selectedSlot);
    onAction?.(selectedSlot, success);
    
    if (success) {
      onClose();
    }
  }, [selectedSlot, load, onAction, onClose]);

  const handleDelete = useCallback((slot: number) => {
    if (confirmDelete === slot) {
      deleteSlot(slot);
      setConfirmDelete(null);
      setSelectedSlot(null);
    } else {
      setConfirmDelete(slot);
    }
  }, [confirmDelete, deleteSlot]);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-amber-900 to-amber-950 p-6 rounded-xl border-4 border-amber-600 shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-amber-200">
            {mode === 'save' ? 'Save Game' : 'Load Game'}
          </h2>
          <button
            className="text-amber-400 hover:text-amber-200 transition-colors text-2xl"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Error message */}
        {lastError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
            {lastError}
          </div>
        )}

        {/* Save slots */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {allSlots.map((slot) => (
            <div
              key={slot.slot}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${selectedSlot === slot.slot
                  ? 'border-amber-400 bg-amber-800/50'
                  : slot.isEmpty
                    ? 'border-amber-700/50 bg-amber-900/30 hover:bg-amber-800/30'
                    : 'border-amber-600 bg-amber-800/30 hover:bg-amber-700/30'
                }
              `}
              onClick={() => handleSlotClick(slot)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400/60 font-mono text-sm">
                      Slot {slot.slot}
                    </span>
                    {slot.isEmpty ? (
                      <span className="text-amber-500/50 italic">Empty</span>
                    ) : (
                      <span className="text-amber-200 font-semibold">
                        {slot.data!.slotName}
                      </span>
                    )}
                  </div>
                  {!slot.isEmpty && (
                    <div className="text-amber-400/60 text-sm mt-1">
                      {formatDate(slot.data!.timestamp)}
                    </div>
                  )}
                </div>

                {/* Delete button */}
                {!slot.isEmpty && (
                  <button
                    className={`
                      px-3 py-1 rounded text-sm transition-colors
                      ${confirmDelete === slot.slot
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-amber-700/50 hover:bg-red-700/50 text-amber-400 hover:text-red-300'
                      }
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(slot.slot);
                    }}
                  >
                    {confirmDelete === slot.slot ? 'Confirm' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Save name input (save mode only) */}
        {mode === 'save' && selectedSlot !== null && (
          <div className="mt-4 pt-4 border-t border-amber-700/50">
            <label className="block text-amber-400/80 text-sm mb-2">
              Save Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter save name..."
              className="w-full px-4 py-2 bg-amber-950 border-2 border-amber-600 rounded-lg text-amber-100 placeholder-amber-600/50 focus:outline-none focus:border-amber-400"
              maxLength={50}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-amber-700/50">
          <button
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors border border-slate-500"
            onClick={onClose}
          >
            Cancel
          </button>
          
          {mode === 'save' ? (
            <button
              className="px-6 py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors border border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={selectedSlot === null || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          ) : (
            <button
              className="px-6 py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors border border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleLoad}
              disabled={selectedSlot === null || allSlots.find(s => s.slot === selectedSlot)?.isEmpty || isLoading}
            >
              {isLoading ? 'Loading...' : 'Load'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
