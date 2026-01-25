import { useState } from "react";

interface StylePopupProps {
  visible: boolean;
  styleOptions: string[];
  isGenerating: boolean;
  onGenerate: (description: string) => void;
  onSelect: (imageIndex: number) => void;
  onDismiss: () => void;
}

export function StylePopup({
  visible,
  styleOptions,
  isGenerating,
  onGenerate,
  onSelect,
  onDismiss,
}: StylePopupProps) {
  const [description, setDescription] = useState("");

  if (!visible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onGenerate(description.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">设置风格</h2>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            风格描述
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例如: 简约商务风格、水彩插画风格..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isGenerating || !description.trim()}
            className="mt-3 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            {isGenerating ? "生成中..." : "生成风格图片"}
          </button>
        </form>

        {styleOptions.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2">选择一个风格:</p>
            <div className="grid grid-cols-2 gap-3">
              {styleOptions.map((base64Image, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div className="aspect-video w-full bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={base64Image}
                      alt={`Style option ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => onSelect(index)}
                    className="px-4 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                  >
                    选择
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
