# GenSlides Frontend

## Overview

Modern React-based frontend for GenSlides, featuring:
- React 19 with TypeScript
- Zustand for state management
- dnd-kit for drag-and-drop slide reordering
- Tailwind CSS v4 for styling
- Vite for fast development and building
- Real-time image generation status polling

## Directory Structure

```
frontend/
├── src/
│   ├── main.tsx                    # Application entry point
│   ├── App.tsx                     # Root component with routing
│   ├── vite-env.d.ts              # Vite type definitions
│   ├── api/                        # API client layer
│   │   ├── client.ts               # HTTP client base (fetch wrapper)
│   │   ├── slides.ts               # Slides API calls
│   │   ├── images.ts               # Image generation API calls
│   │   └── style.ts                # Style management API calls
│   ├── components/                 # React UI components
│   │   ├── Header.tsx              # Top navigation bar
│   │   ├── Sidebar.tsx             # Left sidebar with slide list
│   │   ├── SlideCard.tsx           # Individual slide card with drag
│   │   ├── PreviewArea.tsx         # Right preview area
│   │   ├── StylePopup.tsx          # Style selection modal
│   │   └── Carousel.tsx            # Fullscreen presentation mode
│   ├── stores/                     # State management
│   │   └── slidesStore.ts          # Zustand store for slides
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts                # All type definitions
│   └── styles/                     # Global styles
│       └── globals.css             # Tailwind imports + custom styles
├── index.html                      # HTML entry point
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Dependencies and scripts
```

## Features

### 1. Slide Management
- **Create** new slides with text content
- **Edit** slide text with double-click
- **Reorder** slides via drag-and-drop (dnd-kit)
- **Delete** slides (future enhancement)
- Real-time synchronization with backend

### 2. Image Generation
- Generate images for slides using Gemini AI
- Status polling (2-second intervals) for generation progress
- Visual loading indicators
- Automatic image hash matching with slide text

### 3. Style Management
- Generate 2 style options from text descriptions
- Base64-encoded preview images
- Select preferred style for the presentation
- Persistent style across all slides

### 4. Presentation Mode
- Fullscreen carousel with keyboard navigation
- Auto-play with 5-second intervals
- Manual controls: ← → arrows, ESC to exit
- Smooth transitions between slides

### 5. Responsive Design
- Tailwind CSS v4 for modern styling
- Mobile-friendly layout
- Optimized for desktop and tablet

## Installation

### Prerequisites
- Node.js >= 18
- npm or yarn
- Backend server running on http://localhost:8000

### Using Makefile (Recommended)

The frontend includes a Makefile for easy setup and management:

```bash
cd frontend

# 1. Install dependencies
make install

# 2. Start development server
make dev
```

**Available Makefile Commands:**
- `make help` - Show all available commands
- `make install` - Install npm dependencies
- `make dev` - Start development server
- `make build` - Build for production
- `make preview` - Preview production build
- `make clean` - Remove node_modules and build files
- `make test` - Run tests

The application will be available at: **http://localhost:5173**

### Manual Installation

If you prefer to install manually:

1. **Navigate to frontend directory:**
```bash
cd /Users/admin/www/llm_project/geek-ai-train/wk7/gen-slides/frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure API endpoint** (if needed):
Edit `src/api/client.ts` to change the backend URL:
```typescript
const BASE_URL = "http://localhost:8000/api";
```

4. **Start development server:**
```bash
npm run dev
```

The application will be available at: **http://localhost:5173**

## Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage Guide

### 1. Initial Setup

When you first open the application, you'll see a style setup popup:
1. Enter a style description (e.g., "minimalist business style, blue tones")
2. Click "Generate Style Images"
3. Select one of the two generated style options
4. The style will be applied to all future slide images

### 2. Creating Slides

- Click the "+" button in the sidebar to add a new slide
- Double-click a slide card to edit its text
- Press Enter or click outside to save

### 3. Reordering Slides

- Click and hold on a slide card
- Drag it to the desired position
- Release to drop
- Order is automatically saved to the backend

### 4. Generating Images

1. Select a slide from the sidebar
2. Enter or edit the slide text
3. Click "Generate Image" in the preview area
4. Wait for the generation to complete (loading indicator shows progress)
5. The generated image will automatically appear

### 5. Presentation Mode

- Click the "Play" button in the header
- Slides will auto-advance every 5 seconds
- Use keyboard shortcuts:
  - `→` Next slide
  - `←` Previous slide
  - `ESC` Exit presentation mode

## State Management (Zustand)

The application uses a single Zustand store (`slidesStore.ts`) with the following state:

### State Properties
- `sid`: Current project ID
- `slides`: Array of slide objects
- `currentSlideIndex`: Currently selected slide
- `isPlaying`: Presentation mode active
- `styleImage`: URL of the current style image
- `showStylePopup`: Style popup visibility
- `styleOptions`: Array of base64-encoded style options
- `generatingSlides`: Set of slide indices being generated
- `styleGenerating`: Style generation in progress
- `error`: Current error message (if any)

### Actions
- `loadSlides(sid)`: Fetch all slides for a project
- `selectSlide(index)`: Select a slide for preview
- `updateSlideText(index, text)`: Update slide text
- `reorderSlides(order)`: Reorder slides
- `addSlide(text)`: Add new slide
- `generateImage(index)`: Start image generation
- `pollImageStatus(index)`: Poll generation status
- `generateStyleOptions(description)`: Generate style options
- `selectStyle(imageIndex)`: Select a style
- `startPlayback()`: Enter presentation mode
- `stopPlayback()`: Exit presentation mode

## API Integration

All API calls are centralized in the `api/` directory:

### Base Client (`api/client.ts`)
```typescript
const BASE_URL = "http://localhost:8000/api";

apiGet<T>(path: string): Promise<T>
apiPut<T>(path, body): Promise<T>
apiPost<T>(path, body): Promise<T>
imageUrl(sid, hash): string
styleImageUrl(sid): string
```

### Slides API (`api/slides.ts`)
- `fetchSlides(sid)`: Get all slides
- `updateSlideText(sid, index, text)`: Update slide text
- `reorderSlides(sid, order)`: Reorder slides
- `addSlide(sid, text)`: Add new slide

### Images API (`api/images.ts`)
- `generateImage(sid, slideIndex)`: Trigger image generation
- `getImageStatus(sid, slideIndex)`: Check generation status

### Style API (`api/style.ts`)
- `generateStyleOptions(sid, description)`: Generate 2 style options
- `selectStyle(sid, imageIndex)`: Select a style (0 or 1)

## Component Architecture

### App.tsx
Root component that:
- Extracts `sid` from URL path
- Loads slides on mount
- Manages global layout
- Conditionally shows StylePopup and Carousel

### Header.tsx
Top navigation bar with:
- Project title
- Play button for presentation mode

### Sidebar.tsx
Left panel featuring:
- Sortable list of slide cards (dnd-kit)
- Add slide button
- Drag-and-drop reordering

### SlideCard.tsx
Individual slide component with:
- Thumbnail image preview
- Editable text (double-click)
- Selection highlighting
- Drag handle for reordering

### PreviewArea.tsx
Right panel displaying:
- Full-size image preview
- Slide text
- "Generate Image" button
- Loading state indicator

### StylePopup.tsx
Modal dialog for:
- Style description input
- Two style option previews (base64 images)
- Selection buttons
- Generation loading state

### Carousel.tsx
Fullscreen presentation with:
- Auto-play (5s intervals)
- Keyboard controls (←, →, ESC)
- Slide counter
- Navigation buttons
- Fullscreen API integration

## Styling with Tailwind CSS v4

This project uses **Tailwind CSS v4**, which has a different setup than v3:

### Key Differences
- ✅ Uses `@tailwindcss/vite` plugin (no PostCSS needed)
- ✅ No `tailwind.config.ts` file required
- ✅ Direct `@import "tailwindcss"` in CSS
- ✅ Automatic setup through Vite plugin

### Custom Styles
Global styles are defined in `src/styles/globals.css`:
```css
@import "tailwindcss";

/* Custom theme variables can be added here */
@theme {
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
}
```

## TypeScript Types

All types are defined in `src/types/index.ts`:

### Entity Types
- `Slide`: Individual slide data
- `SlidesData`: Project with slides array

### Request Types
- `UpdateSlideTextRequest`
- `ReorderSlidesRequest`
- `AddSlideRequest`
- `GenerateStyleRequest`

### Response Types
- `UpdateSlideResponse`
- `ReorderResponse`
- `GenerateImageResponse`
- `ImageStatusResponse`
- `GenerateStyleResponse`
- `SelectStyleResponse`
- `AddSlideResponse`

## Error Handling

The application includes comprehensive error handling:

### Network Errors
- Failed API calls show error messages
- Errors are displayed in a red banner at the top
- Auto-dismiss after user action

### Generation Errors
- Failed image generation clears loading state
- Error message explains the failure
- User can retry generation

### Development Errors
- Errors logged to console in development mode
- Type safety prevents many runtime errors

## Performance Optimizations

### 1. Image Loading
- Lazy loading for slide thumbnails
- Base64 encoding for style previews (no extra requests)
- Hash-based caching (same text = same image)

### 2. State Updates
- Zustand for efficient re-renders
- Selective subscriptions to store slices
- Minimal component re-renders

### 3. Polling Strategy
- 2-second intervals for status checks
- Auto-stop when generation completes
- Cleanup on component unmount

### 4. Build Optimization
- Vite for fast builds and HMR
- Tree-shaking for minimal bundle size
- Code splitting (future enhancement)

## Browser Support

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- Mobile browsers: ✅ Responsive design

## Accessibility

Current accessibility features:
- Semantic HTML elements
- Keyboard navigation support
- Focus indicators
- ARIA labels (future enhancement)

## Future Enhancements

Planned improvements:
1. **Slide deletion** - Remove unwanted slides
2. **Undo/Redo** - Action history management
3. **Keyboard shortcuts** - Power user features
4. **Image upload** - Custom slide images
5. **Export** - Download presentation as PDF/PPTX
6. **Collaborative editing** - Real-time collaboration
7. **Themes** - Multiple visual themes
8. **Animations** - Slide transition effects
9. **Offline support** - PWA with service worker
10. **Mobile app** - React Native version

## Troubleshooting

### Common Issues

**1. "Failed to load slides" error**
- Ensure backend is running on http://localhost:8000
- Check CORS configuration in backend
- Verify project exists in `slides/{sid}/` directory

**2. Images not generating**
- Check Gemini API key is configured in backend
- Verify internet connection
- Check browser console for errors

**3. Drag-and-drop not working**
- Ensure you're clicking on the slide card itself
- Try refreshing the page
- Check for JavaScript errors in console

**4. Style popup not showing**
- Check if `style_image` exists for the project
- Clear browser cache and reload
- Verify backend is responding correctly

### Development Issues

**Build errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Type errors:**
```bash
# Regenerate TypeScript cache
rm -rf node_modules/.vite
npm run build
```

**Port already in use:**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
npm run dev
```

## Contributing

When adding new features:
1. Follow existing code structure
2. Add TypeScript types for new data
3. Update this README with new features
4. Test on multiple browsers
5. Ensure build succeeds: `npm run build`

## Files Created

All files successfully created with:
- ✅ TypeScript strict mode enabled
- ✅ Full type safety
- ✅ Modern React patterns (hooks, functional components)
- ✅ Production-ready build configuration
- ✅ Development-friendly HMR

## Notes

- The app uses URL path to determine project ID (e.g., `/hello-world`)
- All state management is handled by Zustand (no Redux/Context)
- Image generation is async with polling (WebSocket upgrade planned)
- Tailwind CSS v4 requires no config file (unlike v3)
- Base64 image encoding is used for style previews to avoid extra requests

## License

Part of the GenSlides project. See root LICENSE file.
