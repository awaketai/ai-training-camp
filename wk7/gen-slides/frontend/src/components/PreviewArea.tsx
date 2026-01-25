import { imageUrl } from "../api/client";
import type { Slide } from "../types";

interface PreviewAreaProps {
  slide: Slide | undefined;
  sid: string;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function PreviewArea({
  slide,
  sid,
  isGenerating,
  onGenerate,
}: PreviewAreaProps) {
  if (!slide) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <p className="text-gray-400 text-lg">No slide selected</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-100">
      <div className="max-w-3xl w-full aspect-video bg-white rounded-lg shadow-lg overflow-hidden">
        {slide.current_image ? (
          <img
            src={imageUrl(sid, slide.current_image)}
            alt={`Slide ${slide.index + 1}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </div>
        )}
      </div>

      <p className="mt-4 text-gray-700 text-center max-w-xl">{slide.text}</p>

      {!slide.has_matching_image && (
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="mt-4 px-6 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isGenerating && (
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {isGenerating ? "生成中..." : "生成图片"}
        </button>
      )}
    </div>
  );
}
