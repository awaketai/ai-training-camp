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
  onTextUpdate: (index: number, text: string) => void;
}

export function Sidebar({
  slides,
  currentIndex,
  sid,
  onSelect,
  onReorder,
  onTextUpdate,
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
    <aside className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto p-3 flex flex-col gap-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={slides.map((s) => s.index)}
          strategy={verticalListSortingStrategy}
        >
          {slides.map((slide) => (
            <SlideCard
              key={slide.index}
              slide={slide}
              isSelected={slide.index === currentIndex}
              sid={sid}
              onSelect={() => onSelect(slide.index)}
              onTextUpdate={(text) => onTextUpdate(slide.index, text)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </aside>
  );
}
