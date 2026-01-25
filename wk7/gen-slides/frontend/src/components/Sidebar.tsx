import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SlideCard } from "./SlideCard";
import type { Slide } from "../types";

interface SidebarProps {
  slides: Slide[];
  currentIndex: number;
  sid: string;
  onSelect: (index: number) => void;
  onReorder: (order: number[]) => void;
  onAddSlide: (position: number) => void;
  onDeleteSlide: (index: number) => void;
}

export function Sidebar({
  slides,
  currentIndex,
  sid,
  onSelect,
  onReorder,
  onAddSlide,
  onDeleteSlide,
}: SidebarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = slides.findIndex((s) => s.index === active.id);
    const newIndex = slides.findIndex((s) => s.index === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newSlides = [...slides];
    const [movedSlide] = newSlides.splice(oldIndex, 1);
    newSlides.splice(newIndex, 0, movedSlide);

    const order = newSlides.map((s) => s.index);
    onReorder(order);
  };

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto p-3 flex flex-col gap-1">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={slides.map((s) => s.index)}
          strategy={verticalListSortingStrategy}
        >
          {slides.map((slide, idx) => (
            <div key={slide.index}>
              <SlideCard
                slide={slide}
                isSelected={slide.index === currentIndex}
                sid={sid}
                onSelect={() => onSelect(slide.index)}
                onDelete={() => onDeleteSlide(slide.index)}
              />
              {/* Insertion line */}
              <div
                onClick={() => onAddSlide(idx + 1)}
                className="h-1 my-1 cursor-pointer group relative"
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-transparent group-hover:border-blue-400 transition-colors"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="bg-white border border-transparent group-hover:border-blue-400 group-hover:bg-blue-50 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </SortableContext>
      </DndContext>
    </aside>
  );
}
