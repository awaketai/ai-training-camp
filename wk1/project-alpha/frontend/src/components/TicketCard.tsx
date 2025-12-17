
import { Ticket } from '../types/ticket';

interface TicketCardProps {
  ticket: Ticket;
  onEdit: (ticket: Ticket) => void;
  onDelete: (ticketId: number) => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onEdit, onDelete }) => {
  // 获取状态的中文显示
  const getStatusText = () => {
    switch (ticket.status) {
      case 'open':
        return '未处理';
      case 'in_progress':
        return '处理中';
      case 'closed':
        return '已完成';
      default:
        return ticket.status;
    }
  };

  // 获取状态的样式类
  const getStatusClass = () => {
    switch (ticket.status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取优先级的中文显示
  const getPriorityText = () => {
    switch (ticket.priority) {
      case 'low':
        return '低';
      case 'medium':
        return '中';
      case 'high':
        return '高';
      default:
        return ticket.priority;
    }
  };

  // 获取优先级的样式类
  const getPriorityClass = () => {
    switch (ticket.priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 transition-shadow hover:shadow-md">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-800">{ticket.title}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusClass()}`}>
              {getStatusText()}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityClass()}`}>
              {getPriorityText()}
            </span>
          </div>
          
          <p className="text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {ticket.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
              >
                {tag.name}
              </span>
            ))}
          </div>
          
          <div className="text-sm text-gray-500">
            <p>创建于: {new Date(ticket.created_at).toLocaleString()}</p>
            <p>更新于: {new Date(ticket.updated_at).toLocaleString()}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(ticket)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            编辑
          </button>
          <button
            onClick={() => onDelete(ticket.id)}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
