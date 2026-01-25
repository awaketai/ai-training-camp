import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { imageUrl } from "../api/client";
import type { Slide } from "../types";

interface SlideCardProps {
  slide: Slide;
  isSelected: boolean;
  sid: string;
  onSelect: () => void;
  onDelete: () => void;
}

export function SlideCard({
  slide,
  isSelected,
  sid,
  onSelect,
  onDelete,
}: SlideCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the slide
    if (window.confirm(`确定要删除这个幻灯片吗？\n\n"${slide.text}"`)) {
      onDelete();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={`p-2 rounded border cursor-pointer transition-colors relative group ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      {/* Delete button - shows on hover */}
      <button
        onClick={handleDelete}
        className="absolute top-1 right-1 z-10 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        title="删除幻灯片"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
      <div className="aspect-video bg-gray-100 rounded overflow-hidden mb-2">
        {slide.current_image ? (
          <img
            key={slide.current_image}
            src={imageUrl(sid, slide.current_image)}
            alt={`Slide ${slide.index + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No Image
          </div>
        )}
      </div>
      <p className="text-xs text-gray-700 line-clamp-2">{slide.text}</p>
    </div>
  );
}
