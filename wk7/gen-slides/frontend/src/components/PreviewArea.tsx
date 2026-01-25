import { useState } from "react";
import { imageUrl } from "../api/client";
import type { Slide } from "../types";

interface PreviewAreaProps {
  slide: Slide | undefined;
  sid: string;
  isGenerating: boolean;
  onGenerate: () => void;
  onTextUpdate: (text: string) => void;
}

export function PreviewArea({
  slide,
  sid,
  isGenerating,
  onGenerate,
  onTextUpdate,
}: PreviewAreaProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  if (!slide) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <p className="text-gray-400 text-lg">No slide selected</p>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditText(slide.text);
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    if (editText !== slide.text) {
      onTextUpdate(editText);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditText(slide.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      handleCancel();
    }
    // Ctrl/Cmd + Enter to save
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

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

      {isEditing ? (
        <div className="mt-4 w-full max-w-3xl">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full text-gray-700 resize-none border border-blue-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            rows={4}
            placeholder="输入幻灯片文本..."
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              保存 (Ctrl+Enter)
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2 w-full max-w-xl justify-center">
            <p className="text-gray-700 text-center flex-1">{slide.text}</p>
            <button
              onClick={handleStartEdit}
              className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
              title="编辑文本"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              编辑
            </button>
          </div>

          <button
            onClick={onGenerate}
            disabled={isGenerating || !slide.text.trim()}
            className="mt-4 px-6 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title={!slide.text.trim() ? "请先输入文本" : ""}
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
            {isGenerating ? "生成中..." : slide.has_matching_image ? "重新生成图片" : "生成图片"}
          </button>
        </>
      )}
    </div>
  );
}
