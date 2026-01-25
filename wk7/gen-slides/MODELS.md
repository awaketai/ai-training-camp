# GenSlides - Gemini Image Generation Models

## Models Used

### Style Image Generation (`style_service.py`)
- **Model**: `gemini-2.0-flash-exp-image-generation`
- **Purpose**: Generate 2 style options based on user description
- **Response Format**: Base64-encoded images in response candidates
- **Fallback**: PIL-generated placeholder images (blue/green backgrounds)

### Slide Image Generation (`image_gen_service.py`)
- **Model**: `gemini-2.0-flash-exp-image-generation`
- **Purpose**: Generate images for individual slides based on text content
- **Features**:
  - Style reference support (uses selected style image)
  - Content-based generation
  - Automatic hash-based deduplication
- **Fallback**: PIL-generated placeholder images with slide text

## Response Structure

Gemini `gemini-2.5-flash-image` returns images in this structure:

```python
response.candidates[0].content.parts[0].inline_data.data  # bytes
response.candidates[0].content.parts[0].inline_data.mime_type  # e.g., "image/jpeg"
```

## Error Handling

Both services implement graceful fallback:
1. Try Gemini API with `gemini-2.5-flash-image`
2. On error, generate placeholder image using PIL
3. Log error for debugging
4. Continue with placeholder to avoid blocking UI

## Configuration

Set in `.env` file:
```env
GEMINI_API_KEY=your-api-key-here
```

Ensure the API key has access to `gemini-2.5-flash-image` model.
