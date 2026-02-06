'use client';

import { useState, useEffect } from 'react';
import { Hotspot } from '@/types/game';

interface HotspotLabelProps {
  hotspot: Hotspot | null;
  mousePosition: { x: number; y: number };
}

export default function HotspotLabel({ hotspot, mousePosition }: HotspotLabelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hotspot) {
      setVisible(true);
    } else {
      // Small delay before hiding to prevent flicker
      const timeout = setTimeout(() => setVisible(false), 50);
      return () => clearTimeout(timeout);
    }
  }, [hotspot]);

  if (!visible || !hotspot) {
    return null;
  }

  return (
    <div
      className="fixed pointer-events-none z-40 transition-opacity duration-150"
      style={{
        left: mousePosition.x + 20,
        top: mousePosition.y - 30,
      }}
    >
      <div className="px-3 py-1.5 bg-black/80 text-amber-200 text-sm rounded-lg shadow-lg border border-amber-700/50 whitespace-nowrap">
        {hotspot.name}
      </div>
    </div>
  );
}
