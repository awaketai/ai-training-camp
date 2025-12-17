
import { Ticket } from '../types/ticket';
import TicketCard from './TicketCard';

interface TicketListProps {
  tickets: Ticket[];
  onEdit: (ticket: Ticket) => void;
  onDelete: (ticketId: number) => void;
}

const TicketList: React.FC<TicketListProps> = ({ tickets, onEdit, onDelete }) => {
  if (tickets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500">暂无工单数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default TicketList;