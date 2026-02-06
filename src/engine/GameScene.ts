// Main Phaser game scene
// The Marble Swindle - Engine Module

import Phaser from 'phaser';
import {
  RoomDefinition,
  Hotspot,
  Point,
  CursorType,
  QueuedAction,
  ItemDefinition,
} from '@/types/game';
import {
  findPath,
  isPointInPolygon,
  getClosestPointInPolygon,
  distance,
  interpolatePath,
  getPathLength,
  getDirection,
} from './pathfinding';
import {
  getGameState,
  setPlayerPosition,
  setPlayerFacing,
  getCurrentRoom,
  hasItem,
  isHotspotEnabled,
  evaluateCondition,
} from './GameState';
import {
  runScriptWithContext,
  getIsRunningScript,
  signalWalkComplete,
  addScriptEventListener,
} from './ScriptRunner';

export class GameScene extends Phaser.Scene {
  // Room data
  private currentRoom: RoomDefinition | null = null;
  private roomData: Map<string, RoomDefinition> = new Map();
  private itemData: Map<string, ItemDefinition> = new Map();

  // Graphics
  private background!: Phaser.GameObjects.Image;
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private fadeOverlay!: Phaser.GameObjects.Rectangle;

  // Player
  private player!: Phaser.GameObjects.Sprite;
  private playerPath: Point[] = [];
  private playerDistanceTraveled = 0;
  private walkSpeed = 150;
  private isWalking = false;

  // Action queue
  private actionQueue: QueuedAction[] = [];
  private currentAction: QueuedAction | null = null;

  // Hotspots
  private hotspotZones: Map<string, Phaser.GameObjects.Zone> = new Map();
  private hoveredHotspot: Hotspot | null = null;

  // Cursor
  private currentCursor: CursorType = 'default';
  private selectedItem: string | null = null;

  // Debug
  private debugMode = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Load placeholder assets for development
    this.load.image('placeholder_bg', '/images/placeholder_room.png');
    this.load.spritesheet('player', '/images/sprites/player.png', {
      frameWidth: 48,
      frameHeight: 96,
    });

    // Cursors
    this.load.image('cursor_default', '/images/ui/cursor_default.png');
    this.load.image('cursor_walk', '/images/ui/cursor_walk.png');
    this.load.image('cursor_look', '/images/ui/cursor_look.png');
    this.load.image('cursor_use', '/images/ui/cursor_use.png');
    this.load.image('cursor_talk', '/images/ui/cursor_talk.png');
    this.load.image('cursor_exit', '/images/ui/cursor_exit.png');
    this.load.image('cursor_pickup', '/images/ui/cursor_pickup.png');
  }

  create(): void {
    // Create fade overlay
    this.fadeOverlay = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      1
    );
    this.fadeOverlay.setDepth(1000);
    this.fadeOverlay.setAlpha(0);

    // Create debug graphics
    this.debugGraphics = this.add.graphics();
    this.debugGraphics.setDepth(999);

    // Create player sprite
    this.createPlayer();

    // Set up input
    this.setupInput();

    // Subscribe to script events
    this.setupScriptListeners();

    // Load initial room
    this.loadRoom(getCurrentRoom());
  }

  private createPlayer(): void {
    const state = getGameState();
    this.player = this.add.sprite(
      state.playerPosition.x,
      state.playerPosition.y,
      'player'
    );
    this.player.setOrigin(0.5, 1);
    this.player.setDepth(100);

    // Create animations if spritesheet is loaded
    if (this.textures.exists('player')) {
      this.createPlayerAnimations();
    }
  }

  private createPlayerAnimations(): void {
    // Default animations - will be replaced with actual character anims
    this.anims.create({
      key: 'player_idle',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 0 }),
      frameRate: 1,
      repeat: -1,
    });

    this.anims.create({
      key: 'player_walk',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: 'player_talk',
      frames: this.anims.generateFrameNumbers('player', { start: 4, end: 5 }),
      frameRate: 4,
      repeat: -1,
    });

    this.player.play('player_idle');
  }

  private setupInput(): void {
    // Click handler
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (getIsRunningScript()) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.handleClick({ x: worldPoint.x, y: worldPoint.y });
    });

    // Hover handler
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.handleHover({ x: worldPoint.x, y: worldPoint.y });
    });

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-D', () => {
      if (this.input.keyboard?.checkDown(this.input.keyboard.addKey('SHIFT'))) {
        this.debugMode = !this.debugMode;
        this.drawDebugOverlay();
      }
    });

    // ESC to cancel selected item
    this.input.keyboard?.on('keydown-ESC', () => {
      this.selectedItem = null;
      this.updateCursor('default');
    });
  }

  private setupScriptListeners(): void {
    addScriptEventListener((type, data) => {
      switch (type) {
        case 'fadeOut':
          this.fadeOut((data as { duration: number }).duration);
          break;
        case 'fadeIn':
          this.fadeIn((data as { duration: number }).duration);
          break;
        case 'roomChange':
          const roomData = data as { roomId: string; position?: Point };
          this.loadRoom(roomData.roomId, roomData.position);
          break;
        case 'walk':
          const walkData = data as {
            characterId: string;
            position: Point;
            instant: boolean;
          };
          if (walkData.characterId === 'player') {
            if (walkData.instant) {
              this.teleportPlayer(walkData.position);
            } else {
              this.walkTo(walkData.position);
            }
          }
          break;
        case 'animate':
          const animData = data as {
            characterId: string;
            animation?: string;
            facing?: 'left' | 'right';
          };
          if (animData.characterId === 'player') {
            if (animData.facing) {
              this.player.setFlipX(animData.facing === 'left');
              setPlayerFacing(animData.facing);
            }
            if (animData.animation) {
              this.player.play(`player_${animData.animation}`);
            }
          }
          break;
      }
    });
  }

  // ============================================
  // ROOM MANAGEMENT
  // ============================================

  public registerRoom(room: RoomDefinition): void {
    this.roomData.set(room.id, room);
  }

  public registerItem(item: ItemDefinition): void {
    this.itemData.set(item.id, item);
  }

  public loadRoom(roomId: string, spawnPosition?: Point): void {
    const room = this.roomData.get(roomId);
    if (!room) {
      console.error(`Room not found: ${roomId}`);
      return;
    }

    this.currentRoom = room;

    // Clear existing hotspot zones
    this.hotspotZones.forEach((zone) => zone.destroy());
    this.hotspotZones.clear();

    // Load background
    if (this.background) {
      this.background.destroy();
    }
    
    if (this.textures.exists(room.background)) {
      this.background = this.add.image(0, 0, room.background);
      this.background.setOrigin(0, 0);
      this.background.setDepth(0);
    } else {
      // Create placeholder colored background
      const graphics = this.add.graphics();
      graphics.fillStyle(0x333355, 1);
      graphics.fillRect(0, 0, 960, 600);
      this.background = this.add.image(0, 0, 'placeholder_bg');
    }

    // Create hotspot zones
    this.createHotspotZones(room);

    // Position player
    const state = getGameState();
    const pos = spawnPosition || state.playerPosition;
    this.player.setPosition(pos.x, pos.y);
    setPlayerPosition(pos);

    // Reset player state
    this.playerPath = [];
    this.isWalking = false;
    this.actionQueue = [];
    this.currentAction = null;

    // Run room enter script
    if (room.onEnter) {
      runScriptWithContext(room.onEnter);
    }

    // Draw debug if enabled
    if (this.debugMode) {
      this.drawDebugOverlay();
    }
  }

  private createHotspotZones(room: RoomDefinition): void {
    // Create zones for hotspots
    for (const hotspot of room.hotspots) {
      if (!isHotspotEnabled(room.id, hotspot.id)) continue;
      if (hotspot.condition && !evaluateCondition(hotspot.condition)) continue;

      // Calculate bounding box for polygon
      const bounds = this.getPolygonBounds(hotspot.polygon);
      
      const zone = this.add.zone(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        bounds.width,
        bounds.height
      );
      zone.setInteractive();
      zone.setData('hotspot', hotspot);

      this.hotspotZones.set(hotspot.id, zone);
    }

    // Create zones for exits
    for (const exit of room.exits) {
      if (exit.condition && !evaluateCondition(exit.condition)) continue;

      const bounds = this.getPolygonBounds(exit.polygon);
      
      const zone = this.add.zone(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        bounds.width,
        bounds.height
      );
      zone.setInteractive();
      zone.setData('exit', exit);

      this.hotspotZones.set(`exit_${exit.id}`, zone);
    }
  }

  private getPolygonBounds(polygon: { points: Point[] }): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const p of polygon.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  // ============================================
  // INPUT HANDLING
  // ============================================

  private handleClick(point: Point): void {
    if (!this.currentRoom) return;

    // Check for hotspot click
    const hotspot = this.getHotspotAt(point);
    if (hotspot) {
      this.queueHotspotInteraction(hotspot);
      return;
    }

    // Check for exit click
    const exit = this.getExitAt(point);
    if (exit) {
      this.queueExitInteraction(exit);
      return;
    }

    // Default: walk to point if walkable
    if (isPointInPolygon(point, this.currentRoom.walkableArea)) {
      this.queueAction({
        type: 'walk',
        target: point,
      });
    } else {
      // Walk to closest walkable point
      const closest = getClosestPointInPolygon(
        point,
        this.currentRoom.walkableArea
      );
      this.queueAction({
        type: 'walk',
        target: closest,
      });
    }
  }

  private handleHover(point: Point): void {
    if (!this.currentRoom) return;

    // Check hotspots
    const hotspot = this.getHotspotAt(point);
    if (hotspot) {
      this.hoveredHotspot = hotspot;
      
      if (this.selectedItem) {
        this.updateCursor('item');
      } else {
        this.updateCursor(hotspot.cursor);
      }
      return;
    }

    // Check exits
    const exit = this.getExitAt(point);
    if (exit) {
      this.hoveredHotspot = null;
      this.updateCursor(exit.cursor || 'exit');
      return;
    }

    // Default cursor
    this.hoveredHotspot = null;
    if (this.selectedItem) {
      this.updateCursor('item');
    } else if (isPointInPolygon(point, this.currentRoom.walkableArea)) {
      this.updateCursor('walk');
    } else {
      this.updateCursor('default');
    }
  }

  private getHotspotAt(point: Point): Hotspot | null {
    if (!this.currentRoom) return null;

    for (const hotspot of this.currentRoom.hotspots) {
      if (!isHotspotEnabled(this.currentRoom.id, hotspot.id)) continue;
      if (hotspot.condition && !evaluateCondition(hotspot.condition)) continue;

      if (isPointInPolygon(point, hotspot.polygon)) {
        return hotspot;
      }
    }

    return null;
  }

  private getExitAt(point: Point) {
    if (!this.currentRoom) return null;

    for (const exit of this.currentRoom.exits) {
      if (exit.condition && !evaluateCondition(exit.condition)) continue;

      if (isPointInPolygon(point, exit.polygon)) {
        return exit;
      }
    }

    return null;
  }

  private updateCursor(cursor: CursorType): void {
    if (cursor === this.currentCursor) return;
    this.currentCursor = cursor;

    // Update DOM cursor or Phaser cursor
    const cursorMap: Record<CursorType, string> = {
      default: 'default',
      walk: 'pointer',
      look: 'help',
      use: 'pointer',
      talk: 'pointer',
      exit: 'pointer',
      pickup: 'grab',
      item: 'pointer',
    };

    this.input.setDefaultCursor(cursorMap[cursor]);
  }

  // ============================================
  // ACTION QUEUE
  // ============================================

  private queueAction(action: QueuedAction): void {
    // Clear existing queue and walk to target first
    this.actionQueue = [action];
    this.processNextAction();
  }

  private queueHotspotInteraction(hotspot: Hotspot): void {
    const walkAction: QueuedAction = {
      type: 'walk',
      target: hotspot.interactionPoint,
    };

    let interactAction: QueuedAction;
    
    if (this.selectedItem) {
      interactAction = {
        type: 'useItem',
        hotspotId: hotspot.id,
        itemId: this.selectedItem,
      };
    } else {
      interactAction = {
        type: 'use',
        hotspotId: hotspot.id,
      };
    }

    this.actionQueue = [walkAction, interactAction];
    this.processNextAction();
  }

  private queueExitInteraction(exit: { id: string; targetRoom: string; targetPosition?: Point; polygon: { points: Point[] } }): void {
    // Get center of exit polygon as walk target
    const center = this.getPolygonCenter(exit.polygon);
    
    const walkAction: QueuedAction = {
      type: 'walk',
      target: center,
    };

    const exitAction: QueuedAction = {
      type: 'interact',
      target: exit.targetPosition,
      onComplete: () => {
        runScriptWithContext([
          { type: 'goToRoom', roomId: exit.targetRoom, position: exit.targetPosition },
        ]);
      },
    };

    this.actionQueue = [walkAction, exitAction];
    this.processNextAction();
  }

  private getPolygonCenter(polygon: { points: Point[] }): Point {
    const { points } = polygon;
    let x = 0, y = 0;
    for (const p of points) {
      x += p.x;
      y += p.y;
    }
    return { x: x / points.length, y: y / points.length };
  }

  private processNextAction(): void {
    if (this.actionQueue.length === 0) {
      this.currentAction = null;
      return;
    }

    this.currentAction = this.actionQueue.shift()!;

    switch (this.currentAction.type) {
      case 'walk':
        if (this.currentAction.target) {
          this.walkTo(this.currentAction.target);
        }
        break;

      case 'interact':
        if (this.currentAction.onComplete) {
          this.currentAction.onComplete();
        }
        this.processNextAction();
        break;

      case 'use':
        this.handleUse(this.currentAction.hotspotId!);
        break;

      case 'useItem':
        this.handleUseItem(this.currentAction.hotspotId!, this.currentAction.itemId!);
        break;

      case 'look':
        this.handleLook(this.currentAction.hotspotId!);
        break;

      case 'talk':
        this.handleTalk(this.currentAction.characterId!);
        break;
    }
  }

  // ============================================
  // INTERACTIONS
  // ============================================

  private handleUse(hotspotId: string): void {
    if (!this.currentRoom) return;

    const hotspot = this.currentRoom.hotspots.find((h) => h.id === hotspotId);
    if (!hotspot || !hotspot.useScript) {
      // Default response
      runScriptWithContext([
        { type: 'thought', text: "I can't use that." },
      ]).then(() => this.processNextAction());
      return;
    }

    // Face the hotspot
    const direction = getDirection(
      { x: this.player.x, y: this.player.y },
      hotspot.interactionPoint
    );
    this.player.setFlipX(direction === 'left');
    setPlayerFacing(direction);

    runScriptWithContext(hotspot.useScript).then(() => {
      this.processNextAction();
    });
  }

  private handleUseItem(hotspotId: string, itemId: string): void {
    if (!this.currentRoom) return;

    const hotspot = this.currentRoom.hotspots.find((h) => h.id === hotspotId);
    
    // Clear selected item
    this.selectedItem = null;
    this.updateCursor('default');

    if (!hotspot) {
      runScriptWithContext([
        { type: 'thought', text: "That doesn't work." },
      ]).then(() => this.processNextAction());
      return;
    }

    // Check for specific item use script
    const itemScript = hotspot.useWithItem?.[itemId];
    if (itemScript) {
      runScriptWithContext(itemScript).then(() => {
        this.processNextAction();
      });
      return;
    }

    // Default response for using item on hotspot
    const item = this.itemData.get(itemId);
    const itemName = item?.name || 'that';
    
    runScriptWithContext([
      { type: 'thought', text: `I can't use the ${itemName} on that.` },
    ]).then(() => this.processNextAction());
  }

  private handleLook(hotspotId: string): void {
    if (!this.currentRoom) return;

    const hotspot = this.currentRoom.hotspots.find((h) => h.id === hotspotId);
    if (!hotspot || !hotspot.lookScript) {
      runScriptWithContext([
        { type: 'narrate', text: hotspot?.name || 'Nothing special.' },
      ]).then(() => this.processNextAction());
      return;
    }

    runScriptWithContext(hotspot.lookScript).then(() => {
      this.processNextAction();
    });
  }

  private handleTalk(characterId: string): void {
    // Start dialogue with character
    runScriptWithContext([
      { type: 'startDialogue', characterId },
    ]).then(() => {
      this.processNextAction();
    });
  }

  // ============================================
  // MOVEMENT
  // ============================================

  private walkTo(target: Point): void {
    if (!this.currentRoom) return;

    const start = { x: this.player.x, y: this.player.y };
    const path = findPath(start, target, this.currentRoom.walkableArea);

    if (path.length < 2) {
      this.onWalkComplete();
      return;
    }

    this.playerPath = path;
    this.playerDistanceTraveled = 0;
    this.isWalking = true;

    // Start walk animation
    if (this.anims.exists('player_walk')) {
      this.player.play('player_walk');
    }

    // Set facing direction
    const direction = getDirection(path[0], path[1]);
    this.player.setFlipX(direction === 'left');
    setPlayerFacing(direction);
  }

  private teleportPlayer(position: Point): void {
    this.player.setPosition(position.x, position.y);
    setPlayerPosition(position);
    this.playerPath = [];
    this.isWalking = false;
  }

  private onWalkComplete(): void {
    this.isWalking = false;
    this.playerPath = [];
    
    if (this.anims.exists('player_idle')) {
      this.player.play('player_idle');
    }

    // Signal script system
    signalWalkComplete('player');

    // Process next action in queue
    this.processNextAction();
  }

  // ============================================
  // VISUAL EFFECTS
  // ============================================

  private fadeOut(duration: number): void {
    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: 1,
      duration,
      ease: 'Power2',
    });
  }

  private fadeIn(duration: number): void {
    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: 0,
      duration,
      ease: 'Power2',
    });
  }

  // ============================================
  // DEBUG
  // ============================================

  private drawDebugOverlay(): void {
    this.debugGraphics.clear();

    if (!this.debugMode || !this.currentRoom) return;

    // Draw walkable area
    this.debugGraphics.lineStyle(2, 0x00ff00, 0.5);
    this.debugGraphics.fillStyle(0x00ff00, 0.1);
    this.drawPolygon(this.currentRoom.walkableArea);

    // Draw hotspots
    this.debugGraphics.lineStyle(2, 0xffff00, 0.5);
    this.debugGraphics.fillStyle(0xffff00, 0.1);
    for (const hotspot of this.currentRoom.hotspots) {
      this.drawPolygon(hotspot.polygon);
      
      // Draw interaction point
      this.debugGraphics.fillStyle(0xff0000, 1);
      this.debugGraphics.fillCircle(
        hotspot.interactionPoint.x,
        hotspot.interactionPoint.y,
        5
      );
    }

    // Draw exits
    this.debugGraphics.lineStyle(2, 0x0000ff, 0.5);
    this.debugGraphics.fillStyle(0x0000ff, 0.1);
    for (const exit of this.currentRoom.exits) {
      this.drawPolygon(exit.polygon);
    }

    // Draw current path
    if (this.playerPath.length > 0) {
      this.debugGraphics.lineStyle(2, 0xff00ff, 1);
      this.debugGraphics.beginPath();
      this.debugGraphics.moveTo(this.playerPath[0].x, this.playerPath[0].y);
      for (let i = 1; i < this.playerPath.length; i++) {
        this.debugGraphics.lineTo(this.playerPath[i].x, this.playerPath[i].y);
      }
      this.debugGraphics.strokePath();
    }
  }

  private drawPolygon(polygon: { points: Point[] }): void {
    const { points } = polygon;
    if (points.length < 3) return;

    this.debugGraphics.beginPath();
    this.debugGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.debugGraphics.lineTo(points[i].x, points[i].y);
    }
    this.debugGraphics.closePath();
    this.debugGraphics.fillPath();
    this.debugGraphics.strokePath();
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  update(time: number, delta: number): void {
    // Update player movement
    if (this.isWalking && this.playerPath.length > 0) {
      const speed = this.walkSpeed * (delta / 1000);
      this.playerDistanceTraveled += speed;

      const result = interpolatePath(this.playerPath, this.playerDistanceTraveled);
      this.player.setPosition(result.position.x, result.position.y);
      setPlayerPosition(result.position);

      // Update facing direction based on current segment
      if (result.segmentIndex < this.playerPath.length - 1) {
        const direction = getDirection(
          this.playerPath[result.segmentIndex],
          this.playerPath[result.segmentIndex + 1]
        );
        this.player.setFlipX(direction === 'left');
      }

      if (result.finished) {
        this.onWalkComplete();
      }
    }

    // Update depth sorting based on Y position
    this.player.setDepth(this.player.y);

    // Update debug overlay if mode is on
    if (this.debugMode) {
      this.drawDebugOverlay();
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  public selectItem(itemId: string): void {
    this.selectedItem = itemId;
    this.updateCursor('item');
  }

  public clearSelectedItem(): void {
    this.selectedItem = null;
    this.updateCursor('default');
  }

  public getHoveredHotspot(): Hotspot | null {
    return this.hoveredHotspot;
  }

  public getCurrentRoomData(): RoomDefinition | null {
    return this.currentRoom;
  }
}
