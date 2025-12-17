import { TicketFilter, TicketStatus } from '../types/ticket';
import { Tag } from '../types/tag';

interface SidebarProps {
  tags: Tag[];
  filters: TicketFilter;
  onFilterChange: (filters: TicketFilter) => void;
  ticketCounts: {
    open: number;
    in_progress: number;
    closed: number;
  };
  tagCounts: Record<number, number>;
  onEditTag: (tag: Tag) => void;
  onDeleteTag: (tagId: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  tags,
  filters,
  onFilterChange,
  ticketCounts,
  tagCounts,
  onEditTag,
  onDeleteTag
}) => {
  // 状态选项
  const statusOptions = [
    { value: 'open', label: '待完成' },
    { value: 'in_progress', label: '处理中' },
    { value: 'closed', label: '已完成' }
  ] as const;

  const handleStatusChange = (status: TicketStatus | '') => {
    onFilterChange({
      ...filters,
      status: status || undefined
    });
  };

  const handleTagChange = (tagId: number | '') => {
    onFilterChange({
      ...filters,
      tag_id: tagId || undefined
    });
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4">
      {/* 状态过滤 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">状态</h3>
        <div className="space-y-1">
          {statusOptions.map((status) => {
            const isActive = filters.status === status.value;
            const count = ticketCounts[status.value];
            
            return (
              <div key={status.value} className="flex items-center space-x-2">
                <button
                  onClick={() => handleStatusChange(isActive ? '' : status.value)}
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{status.label}</span>
                  <span className="text-xs text-gray-500">{count}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 标签过滤 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">标签</h3>
        <div className="space-y-1">
          {tags.map((tag) => {
            const isActive = filters.tag_id === tag.id;
            const count = tagCounts[tag.id] || 0;
            
            return (
              <div key={tag.id} className="flex items-center space-x-1">
                <button
                  onClick={() => handleTagChange(isActive ? '' : tag.id)}
                  className={`flex items-center justify-between flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>{tag.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{count}</span>
                </button>
                <div className="flex space-x-1">
                  <button
                    onClick={() => onEditTag(tag)}
                    className="p-1 text-gray-500 hover:text-blue-500 rounded-md hover:bg-gray-50 transition-colors"
                    title="编辑标签"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDeleteTag(tag.id)}
                    className="p-1 text-gray-500 hover:text-red-500 rounded-md hover:bg-gray-50 transition-colors"
                    title="删除标签"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;