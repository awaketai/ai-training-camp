import { render, screen } from '@testing-library/react';
import TicketList from '../TicketList';
import { Ticket } from '../../types/ticket';

describe('TicketList Component', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  const mockTickets: Ticket[] = [
    {
      id: 1,
      title: '测试工单1',
      description: '测试描述1',
      status: 'open',
      priority: 'high',
      tags: [{ id: 1, name: 'bug' }],
      created_at: new Date('2023-01-01').toISOString(),
      updated_at: new Date('2023-01-01').toISOString(),
    },
    {
      id: 2,
      title: '测试工单2',
      description: '测试描述2',
      status: 'in_progress',
      priority: 'medium',
      tags: [{ id: 2, name: 'feature' }],
      created_at: new Date('2023-01-02').toISOString(),
      updated_at: new Date('2023-01-02').toISOString(),
    },
  ];

  it('should render empty state when no tickets', () => {
    render(<TicketList tickets={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    expect(screen.getByText('暂无工单数据')).toBeInTheDocument();
  });

  it('should render tickets list when tickets provided', () => {
    render(<TicketList tickets={mockTickets} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    expect(screen.getByText('测试工单1')).toBeInTheDocument();
    expect(screen.getByText('测试工单2')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('should pass correct props to TicketCard', () => {
    render(<TicketList tickets={mockTickets} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    expect(screen.getByText('测试工单1')).toBeInTheDocument();
    expect(screen.getByText('测试描述1')).toBeInTheDocument();
  });
});
