import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { imageUrl } from "../api/client";
import type { Slide } from "../types";

interface SlideCardProps {
  slide: Slide;
  isSelected: boolean;
  sid: string;
  onSelect: () => void;
  onTextUpdate: (text: string) => void;
}

export function SlideCard({
  slide,
  isSelected,
  sid,
  onSelect,
  onTextUpdate,
}: SlideCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(slide.text);

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

  const handleDoubleClick = () => {
    setEditText(slide.text);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editText !== slide.text) {
      onTextUpdate(editText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.blur();
    }
    if (e.key === "Escape") {
      setEditText(slide.text);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
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
      {isEditing ? (
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full text-xs text-gray-700 resize-none border border-blue-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={2}
        />
      ) : (
        <p className="text-xs text-gray-700 line-clamp-2">{slide.text}</p>
      )}
    </div>
  );
}
