# The Marble Swindle

A LucasArts-style point-and-click adventure game set in 1889 Marvel Cave, Missouri.

## About

The year is 1889. You are Clem Buckley, a determined young woman who has traveled to the remote Ozark town of Marmaros following your uncle Cornelius's mysterious disappearance. He was last seen investigating the region's most peculiar attraction: a massive sinkhole the Osage called "The Devil's Den" — now known as Marvel Cave.

The mining company went bust. The town is half-burned. But Cornelius's cryptic journal hints at something valuable hidden in the depths — something the Spanish conquistadors left behind over 300 years ago.

## Features

- **Classic Point-and-Click Gameplay**: Context-sensitive interactions, item combinations, and environmental puzzles
- **Rich Historical Setting**: Based on the real history of Marvel Cave and Silver Dollar City
- **LucasArts-Inspired Design**: No deaths, no dead ends, just clever puzzles and witty dialogue
- **Original Pixel Art**: 1990s adventure game aesthetic with warm Ozark autumn tones
- **Data-Driven Engine**: JSON-based room definitions, dialogue trees, and puzzle chains

## Tech Stack

- **Framework**: Next.js 16 with TypeScript
- **Game Engine**: Phaser 3
- **Styling**: Tailwind CSS
- **Hosting**: Vercel
- **Asset Storage**: Supabase (for large audio files)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

## Project Structure

```
src/
├── app/              # Next.js app router
├── components/       # React UI components
├── engine/           # Phaser game engine modules
├── types/            # TypeScript type definitions
└── data/             # JSON game content
    ├── rooms/        # Room/scene definitions
    ├── items/        # Inventory item definitions
    └── dialogue/     # Dialogue tree definitions

public/
├── images/           # Visual assets
│   ├── backgrounds/  # Room backgrounds
│   ├── sprites/      # Character sprites
│   ├── items/        # Inventory icons
│   └── ui/           # UI elements
└── audio/            # Audio assets
    ├── music/        # Background music
    ├── sfx/          # Sound effects
    └── voice/        # Voice lines
```

## Controls

- **Left Click**: Walk to location / Use hotspot / Select dialogue option
- **Right Click**: Examine / Inspect item
- **Shift+D**: Toggle debug mode (shows walkable areas and hotspots)
- **ESC**: Pause menu

## Credits

Based on the real history of Marvel Cave, located beneath Silver Dollar City theme park near Branson, Missouri. The cave has been continuously operated as a show cave since 1894.

Special thanks to:
- The Herschend family for preserving Marvel Cave
- The LucasArts adventure game design philosophy
- Silver Dollar City fans everywhere

## License

This is a fan project celebrating the history of Marvel Cave and the classic adventure game genre.
