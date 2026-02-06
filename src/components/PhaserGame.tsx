'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Phaser from 'phaser';
import { GameScene } from '@/engine/GameScene';
import { RoomDefinition, ItemDefinition } from '@/types/game';

interface PhaserGameProps {
  width?: number;
  height?: number;
  onSceneReady?: (scene: GameScene) => void;
}

export interface PhaserGameRef {
  game: Phaser.Game | null;
  scene: GameScene | null;
  registerRoom: (room: RoomDefinition) => void;
  registerItem: (item: ItemDefinition) => void;
  loadRoom: (roomId: string) => void;
  selectItem: (itemId: string) => void;
  clearSelectedItem: () => void;
}

const PhaserGame = forwardRef<PhaserGameRef, PhaserGameProps>(
  ({ width = 960, height = 600, onSceneReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<GameScene | null>(null);

    useImperativeHandle(ref, () => ({
      game: gameRef.current,
      scene: sceneRef.current,
      registerRoom: (room: RoomDefinition) => {
        sceneRef.current?.registerRoom(room);
      },
      registerItem: (item: ItemDefinition) => {
        sceneRef.current?.registerItem(item);
      },
      loadRoom: (roomId: string) => {
        sceneRef.current?.loadRoom(roomId);
      },
      selectItem: (itemId: string) => {
        sceneRef.current?.selectItem(itemId);
      },
      clearSelectedItem: () => {
        sceneRef.current?.clearSelectedItem();
      },
    }));

    useEffect(() => {
      if (!containerRef.current || gameRef.current) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width,
        height,
        backgroundColor: '#1a1a2e',
        pixelArt: true,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: GameScene,
        physics: {
          default: 'arcade',
          arcade: {
            debug: false,
          },
        },
        render: {
          antialias: false,
          pixelArt: true,
          roundPixels: true,
        },
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      // Wait for scene to be ready
      game.events.once('ready', () => {
        const scene = game.scene.getScene('GameScene') as GameScene;
        sceneRef.current = scene;
        onSceneReady?.(scene);
      });

      return () => {
        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
          sceneRef.current = null;
        }
      };
    }, [width, height, onSceneReady]);

    return (
      <div
        ref={containerRef}
        className="game-container"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          margin: '0 auto',
        }}
      />
    );
  }
);

PhaserGame.displayName = 'PhaserGame';

export default PhaserGame;
