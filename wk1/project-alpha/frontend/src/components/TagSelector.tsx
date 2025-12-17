
import { Tag } from '../types/tag';

interface TagSelectorProps {
  tags: Tag[];
  selectedTags: number[];
  onTagToggle: (tagId: number) => void;
  disabled?: boolean;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  tags,
  selectedTags,
  onTagToggle,
  disabled = false,
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onTagToggle(tag.id)}
          disabled={disabled}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selectedTags.includes(tag.id)
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
};

export default TagSelector;
