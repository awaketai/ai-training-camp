import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '../SearchBar';

describe('SearchBar Component', () => {
  it('should render with correct placeholder', () => {
    render(<SearchBar searchTerm="" onSearchChange={vi.fn()} />);
    const input = screen.getByPlaceholderText('搜索工单标题或描述...');
    expect(input).toBeInTheDocument();
  });

  it('should display the provided searchTerm', () => {
    render(<SearchBar searchTerm="test search" onSearchChange={vi.fn()} />);
    const input = screen.getByPlaceholderText('搜索工单标题或描述...') as HTMLInputElement;
    expect(input.value).toBe('test search');
  });

  it('should call onSearchChange when input changes', () => {
    const mockOnSearchChange = vi.fn();
    render(<SearchBar searchTerm="" onSearchChange={mockOnSearchChange} />);
    
    const input = screen.getByPlaceholderText('搜索工单标题或描述...');
    fireEvent.change(input, { target: { value: 'new search term' } });
    
    expect(mockOnSearchChange).toHaveBeenCalledWith('new search term');
    expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple input changes', () => {
    const mockOnSearchChange = vi.fn();
    render(<SearchBar searchTerm="" onSearchChange={mockOnSearchChange} />);
    
    const input = screen.getByPlaceholderText('搜索工单标题或描述...');
    
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });
    
    expect(mockOnSearchChange).toHaveBeenCalledTimes(3);
    expect(mockOnSearchChange).toHaveBeenNthCalledWith(1, 'a');
    expect(mockOnSearchChange).toHaveBeenNthCalledWith(2, 'ab');
    expect(mockOnSearchChange).toHaveBeenNthCalledWith(3, 'abc');
  });
});
