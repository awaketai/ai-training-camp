# GenSlides

AI-powered presentation slide generator using Gemini AI for image generation.

## Project Structure

```
gen-slides/
├── backend/          # Python FastAPI backend
├── frontend/         # React TypeScript frontend
├── slides/           # Generated slide data storage
├── main.py           # Root entry point (deprecated, use backend/main.py)
└── pyproject.toml    # Python project configuration
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Google Gemini API key

### Environment Configuration

Create a `.env` file in the project root or `backend/` directory:

```env
GEMINI_API_KEY=your-api-key-here
SLIDES_DIR=./slides
```

### Backend Setup

```bash
cd backend

# Using Makefile (recommended - uses venv)
make install    # Create venv and install dependencies
make dev        # Start server at http://localhost:8000 (uses uvicorn)

# Or manually
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd .. && uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend Makefile commands:**
- `make install` - Create virtual environment and install dependencies
- `make dev` - Start development server (automatically uses venv and uvicorn)
- `make clean` - Remove venv and cache files
- `make check` - Run syntax checks

**Important:** The backend must be run as a module (`backend.main:app`) from the parent directory to resolve Python package imports correctly. The Makefile handles this automatically.

See [backend/BACKEND_README.md](backend/BACKEND_README.md) for detailed documentation.

### Frontend Setup

```bash
cd frontend

# Using Makefile (recommended)
make install    # Install npm dependencies
make dev        # Start dev server (port may vary: 5173 or 5175)

# Or manually
npm install
npm run dev
```

**Frontend Makefile commands:**
- `make install` - Install npm dependencies
- `make dev` - Start development server
- `make build` - Build for production
- `make clean` - Remove node_modules and build files

See [frontend/README.md](frontend/README.md) for detailed documentation.

### Access the Application

**Important:** GenSlides requires a project ID in the URL path.

1. **Root URL** (shows welcome page): `http://localhost:5173/`
2. **With project ID** (loads project): `http://localhost:5173/demo-project`
3. **Create your own**: `http://localhost:5173/your-project-name`

Each project ID corresponds to a unique presentation stored in `slides/{project-id}/`.

## Features

- ✅ **Flexible Image Generation**: Support for multiple AI providers (Gemini, Qianwen)
- ✅ AI-powered slide image generation
- ✅ Drag-and-drop slide reordering
- ✅ Real-time image generation status
- ✅ Customizable presentation styles
- ✅ Fullscreen presentation mode
- ✅ YAML-based slide storage
- ✅ Content-addressable image storage (BLAKE3)
- ✅ Plugin architecture for image generators

## Image Generation Providers

GenSlides supports multiple image generation providers through a flexible plugin architecture:

### Supported Providers

| Provider | Model | API Documentation |
|----------|-------|-------------------|
| **Gemini** | `gemini-2.0-flash-exp-image-generation` | [Google AI Studio](https://aistudio.google.com/) |
| **Qianwen (通义千问)** | `wanx-v1`, `wanx2-v1` | [Alibaba DashScope](https://dashscope.aliyun.com/) |

### Configuration

Edit `.env` file to choose your provider:

```env
# Choose provider: "gemini" or "qianwen"
IMAGE_GENERATOR_TYPE=qianwen

# Gemini Settings
GEMINI_API_KEY=your-gemini-api-key
GEMINI_IMAGE_MODEL=gemini-2.0-flash-exp-image-generation

# Qianwen Settings
QIANWEN_API_KEY=your-qianwen-api-key
QIANWEN_IMAGE_MODEL=wanx2-v1
```

See [IMAGE_GENERATION_ARCHITECTURE.md](IMAGE_GENERATION_ARCHITECTURE.md) for detailed architecture documentation.

## Architecture

### Backend (FastAPI)
- RESTful API for slide management
- Async image generation with background tasks
- Repository pattern for data access
- BLAKE3 hashing for content-addressable storage

### Frontend (React + TypeScript)
- React 19 with hooks
- Zustand for state management
- dnd-kit for drag-and-drop
- Tailwind CSS v4 for styling
- Vite for fast development

## API Endpoints

- `GET /api/slides/{sid}` - Get all slides
- `PUT /api/slides/{sid}/{slide_index}` - Update slide text
- `POST /api/slides/{sid}/{slide_index}/generate` - Generate image
- `GET /api/slides/{sid}/images/{hash}.jpg` - Get image
- `POST /api/slides/{sid}/style/generate` - Generate style options

## Development

### Backend Development

```bash
cd backend
make dev           # Start with auto-reload
make check         # Syntax checking
make test          # Run tests
```

### Frontend Development

```bash
cd frontend
make dev           # Start with HMR
make build         # Production build
make preview       # Preview production build
```

## Data Storage

Slides are stored in YAML format:

```
slides/
└── {project-id}/
    ├── outline.yml
    ├── style.jpg
    └── images/
        ├── {hash1}.jpg
        └── {hash2}.jpg
```

## Contributing

1. Follow existing code structure
2. Update README when adding features
3. Ensure all tests pass
4. Use virtual environment for Python development
5. Use Makefile commands for consistent setup

## License

Part of the geek-ai-train project.
