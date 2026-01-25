# GenSlides Backend Implementation

## Overview
Complete Python backend implementation for GenSlides using FastAPI, featuring:
- RESTful API for slide management
- Async image generation with Gemini AI
- Repository pattern for data access
- Service layer architecture with dependency injection
- YAML-based slide storage

## Directory Structure

```
backend/
├── __init__.py
├── main.py                     # FastAPI application entry point
├── config.py                   # Pydantic settings configuration
├── dependencies.py             # Dependency injection
├── requirements.txt            # Python dependencies
├── routes/
│   ├── __init__.py
│   ├── slides.py               # Slides CRUD endpoints
│   ├── images.py               # Image generation & serving
│   └── style.py                # Style management endpoints
├── services/
│   ├── __init__.py
│   ├── slide_service.py        # Slide business logic
│   ├── image_gen_service.py    # Gemini image generation
│   └── style_service.py        # Style management logic
├── repositories/
│   ├── __init__.py
│   ├── outline_repo.py         # YAML file operations
│   └── image_repo.py           # Image file operations
├── models/
│   ├── __init__.py
│   └── schemas.py              # Pydantic models
└── utils/
    ├── __init__.py
    └── hash.py                 # BLAKE3 hashing utility
```

## API Endpoints

### Slides Management
- `GET /api/slides/{sid}` - Get all slides for a project
- `PUT /api/slides/{sid}/{slide_index}` - Update slide text
- `PUT /api/slides/{sid}/reorder` - Reorder slides
- `POST /api/slides/{sid}/add` - Add new slide

### Image Operations
- `GET /api/slides/{sid}/images/{hash}.jpg` - Get image file
- `POST /api/slides/{sid}/{slide_index}/generate` - Generate slide image
- `GET /api/slides/{sid}/{slide_index}/status` - Get generation status

### Style Management
- `GET /api/slides/{sid}/style` - Get style image
- `POST /api/slides/{sid}/style/generate` - Generate style options
- `POST /api/slides/{sid}/style/select` - Select style image

## Key Features

### 1. Async Image Generation
- Background task management with asyncio
- UUID-based task tracking
- Status polling for long-running operations
- **Model**: Uses `gemini-2.5-flash-image` for image generation
- Automatic fallback to placeholder images if generation fails

### 2. Repository Pattern
- Abstracted file I/O operations
- Async file operations with asyncio.to_thread
- Concurrent access control with asyncio.Lock

### 3. Service Layer
- Business logic separated from routes
- Singleton instances via dependency injection
- Clean separation of concerns

### 4. BLAKE3 Hashing
- Fast content-addressable image storage
- 16-character hashes for filename generation
- Automatic image deduplication

### 5. CORS Configuration
- Frontend access from localhost:5173
- Configurable middleware

## Configuration

Environment variables (.env):
```
GEMINI_API_KEY=your-api-key-here
SLIDES_DIR=../slides
```

Config options (config.py):
- `gemini_api_key`: Google Gemini API key
- `slides_dir`: Base directory for slide data
- `host`: API server host (default: 0.0.0.0)
- `port`: API server port (default: 8000)

## Data Storage

### Project Structure
```
slides/
└── {project-id}/
    ├── outline.yml
    ├── style.jpg (optional)
    └── images/
        ├── {hash1}.jpg
        ├── {hash2}.jpg
        └── ...
```

### outline.yml Format
```yaml
style_image: style.jpg
slides:
  - text: "Slide content"
    current_image: "abc123def4567890"
  - text: "Another slide"
    current_image: null
```

## Installation

### Using Makefile (Recommended)

The backend includes a Makefile for easy setup and management using virtual environment:

```bash
cd backend

# 1. Create virtual environment and install dependencies
make install

# 2. Configure environment (create .env file in project root: gen-slides/.env)
# Add your Gemini API key:
# GEMINI_API_KEY=your-api-key-here
# SLIDES_DIR=./slides

# 3. Start development server (automatically uses venv and uvicorn)
make dev
```

The server will start at **http://localhost:8000** with auto-reload enabled.

**Available Makefile Commands:**
- `make help` - Show all available commands
- `make venv` - Create virtual environment only
- `make install` - Create venv and install dependencies
- `make dev` - Start development server with venv (uses uvicorn)
- `make clean` - Remove venv and cache files
- `make test` - Run tests
- `make format` - Format code with black
- `make check` - Syntax and type checking

**How it works:**
- `make dev` uses uvicorn to run the FastAPI app as a module: `backend.main:app`
- Runs from the parent directory to properly resolve Python package imports
- Automatically uses the virtual environment created by `make install`
- Enables hot-reload for development

### Manual Installation

If you prefer to install manually:

1. Install dependencies:
```bash
cd /Users/admin/www/llm_project/geek-ai-train/wk7/gen-slides
pip install -e .
```

2. Configure environment:
```bash
# Edit .env file with your Gemini API key
vi .env
```

3. Run the server:
```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## Development

### Running Tests
```bash
pytest
```

### Syntax Check
```bash
python -m py_compile backend/**/*.py
```

### Type Checking
```bash
mypy backend
```

## Architecture Decisions

### Why Async?
- Non-blocking I/O for file operations
- Efficient handling of concurrent image generation
- Better scalability for multiple users

### Why Repository Pattern?
- Abstraction of data access logic
- Easy to mock for testing
- Separation of storage concerns

### Why Service Layer?
- Business logic isolated from HTTP concerns
- Reusable across different interfaces
- Easier to test and maintain

### Why BLAKE3?
- Fastest cryptographic hash function
- Content-addressable storage
- Automatic deduplication

## Error Handling

The API includes comprehensive error handling:
- 404: Project/slide/image not found
- 400: Invalid request parameters
- 409: Duplicate operation (e.g., generation already in progress)
- 500: Internal server errors

## Future Enhancements

Potential improvements:
1. Add database backend (PostgreSQL/MongoDB)
2. Implement caching layer (Redis)
3. Add WebSocket support for real-time updates
4. Implement user authentication & authorization
5. Add image compression & optimization
6. Support multiple style templates
7. Add slide export (PDF, PPTX)
8. Implement collaborative editing

## Files Created

All files have been successfully created at:
`/Users/admin/www/llm_project/geek-ai-train/wk7/gen-slides/backend/`

- 19 Python source files
- All files pass syntax validation
- Complete type hints with Pydantic
- Comprehensive docstrings

## Notes

- The Gemini API integration uses placeholder response parsing
- You may need to adjust the Gemini API call based on actual response format
- Concurrent access to outline.yml is protected with asyncio.Lock
- File I/O operations use asyncio.to_thread for non-blocking execution
