
import { TicketFilter, TicketStatus, TicketPriority } from '../types/ticket';
import { Tag } from '../types/tag';

interface FilterPanelProps {
  filters: TicketFilter;
  onFilterChange: (filters: TicketFilter) => void;
  tags: Tag[];
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onFilterChange, tags }) => {
  const statuses: TicketStatus[] = ['open', 'in_progress', 'closed'];
  const priorities: TicketPriority[] = ['low', 'medium', 'high'];

  const handleStatusChange = (status: TicketStatus | '') => {
    onFilterChange({
      ...filters,
      status: status || undefined,
    });
  };

  const handlePriorityChange = (priority: TicketPriority | '') => {
    onFilterChange({
      ...filters,
      priority: priority || undefined,
    });
  };

  const handleTagChange = (tagId: number | '') => {
    onFilterChange({
      ...filters,
      tag_id: tagId || undefined,
    });
  };

  const resetFilters = () => {
    onFilterChange({});
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Status Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleStatusChange(e.target.value as TicketStatus | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === 'open' ? '未处理' : status === 'in_progress' ? '处理中' : '已完成'}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
          <select
            value={filters.priority || ''}
            onChange={(e) => handlePriorityChange(e.target.value as TicketPriority | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority === 'low' ? '低' : priority === 'medium' ? '中' : '高'}
              </option>
            ))}
          </select>
        </div>

        {/* Tag Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
          <select
            value={filters.tag_id || ''}
            onChange={(e) => handleTagChange(Number(e.target.value) || '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            重置筛选
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
