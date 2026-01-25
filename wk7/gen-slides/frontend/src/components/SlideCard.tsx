import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { imageUrl } from "../api/client";
import type { Slide } from "../types";

interface SlideCardProps {
  slide: Slide;
  isSelected: boolean;
  sid: string;
  onSelect: () => void;
}

export function SlideCard({
  slide,
  isSelected,
  sid,
  onSelect,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={`p-2 rounded border cursor-pointer transition-colors ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="aspect-video bg-gray-100 rounded overflow-hidden mb-2">
        {slide.current_image ? (
          <img
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
