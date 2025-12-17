

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTickets, createTicket, updateTicket, deleteTicket, getTags, createTag, updateTag as apiUpdateTag, deleteTag as apiDeleteTag } from './services/api';
import { Ticket, TicketFilter, TicketCreate, TicketUpdate } from './types/ticket';
import { Tag, TagCreate, TagUpdate } from './types/tag';
import SearchBar from './components/SearchBar';
import Sidebar from './components/Sidebar';
import TicketList from './components/TicketList';
import TicketForm from './components/TicketForm';

function App() {
  const queryClient = useQueryClient();
  
  // 状态管理
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<TicketFilter>({});
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | undefined>(undefined);
  const [showTagForm, setShowTagForm] = useState<boolean>(false);
  const [editingTag, setEditingTag] = useState<Tag | undefined>(undefined);
  const [tagName, setTagName] = useState<string>('');

  // 获取标签数据
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: getTags
  });

  // 获取工单数据
  const { data: tickets = [], isLoading, isError } = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: getTickets
  });

  // 创建工单
  const createTicketMutation = useMutation({
    mutationFn: (ticket: TicketCreate) => createTicket(ticket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowForm(false);
    }
  });

  // 更新工单
  const updateTicketMutation = useMutation({
    mutationFn: ({ id, ticket }: { id: number; ticket: TicketUpdate }) => updateTicket(id, ticket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowForm(false);
      setEditingTicket(undefined);
    }
  });

  // 删除工单
  const deleteTicketMutation = useMutation({
    mutationFn: (id: number) => deleteTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    }
  });

  // 创建标签
  const createTagMutation = useMutation({
    mutationFn: (data: TagCreate) => createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setShowTagForm(false);
      setTagName('');
      setEditingTag(undefined);
    }
  });

  // 更新标签
  const updateTagMutation = useMutation({
    mutationFn: ({ id, tag }: { id: number; tag: TagUpdate }) => apiUpdateTag(id, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setShowTagForm(false);
      setTagName('');
      setEditingTag(undefined);
    }
  });

  // 删除标签
  const deleteTagMutation = useMutation({
    mutationFn: (id: number) => apiDeleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    }
  });

  // 处理创建/更新工单
  const handleSubmitTicket = (ticket: TicketCreate | TicketUpdate) => {
    if (editingTicket) {
      updateTicketMutation.mutate({ id: editingTicket.id, ticket: ticket as TicketUpdate });
    } else {
      createTicketMutation.mutate(ticket as TicketCreate);
    }
  };

  // 处理编辑工单
  const handleEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setShowForm(true);
  };

  // 处理删除工单
  const handleDeleteTicket = (ticketId: number) => {
    if (window.confirm('确定要删除这个工单吗？')) {
      deleteTicketMutation.mutate(ticketId);
    }
  };

  // 处理打开标签管理表单
  const handleOpenTagForm = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name);
    } else {
      setEditingTag(undefined);
      setTagName('');
    }
    setShowTagForm(true);
  };

  // 处理标签表单提交
  const handleSubmitTag = () => {
    if (!tagName.trim()) return;

    const tagData: TagCreate = { name: tagName.trim() };
    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, tag: tagData });
    } else {
      createTagMutation.mutate(tagData);
    }
  };

  // 处理删除标签
  const handleDeleteTag = (tagId: number) => {
    if (window.confirm('确定要删除这个标签吗？')) {
      deleteTagMutation.mutate(tagId);
    }
  };

  // 处理筛选
  const handleFilterChange = (newFilters: TicketFilter) => {
    setFilters(newFilters);
  };

  // 过滤工单
  const filteredTickets = (tickets as Ticket[]).filter((ticket: Ticket) => {
    // 搜索过滤
    const matchesSearch = !searchTerm || 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 状态过滤
    const matchesStatus = !filters.status || ticket.status === filters.status;
    
    // 优先级过滤
    const matchesPriority = !filters.priority || ticket.priority === filters.priority;
    
    // 标签过滤
    const matchesTag = !filters.tag_id || ticket.tags.some((tag: Tag) => tag.id === filters.tag_id);
    
    return matchesSearch && matchesStatus && matchesPriority && matchesTag;
  });

  // 计算工单数量
  const ticketCounts = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    closed: tickets.filter(t => t.status === 'closed').length
  };

  // 计算标签数量
  const tagCounts = tags.reduce((acc, tag) => {
    acc[tag.id] = tickets.filter(t => t.tags.some(tt => tt.id === tag.id)).length;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-blue-600">Project Alpha</h1>
        
        {/* 搜索栏 */}
        <div className="flex-1 max-w-md mx-8">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleOpenTagForm()}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
          >
            + 管理标签
          </button>
          <button
            onClick={() => {
              setEditingTicket(undefined);
              setShowForm(true);
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            + 新建 Ticket
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 */}
        <Sidebar
          tags={tags as Tag[]}
          filters={filters}
          onFilterChange={handleFilterChange}
          ticketCounts={ticketCounts}
          tagCounts={tagCounts}
          onEditTag={handleOpenTagForm}
          onDeleteTag={handleDeleteTag}
        />
        
        {/* 右侧工单列表 */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {/* 排序下拉菜单 */}
          <div className="flex justify-end mb-4">
            <select className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>创建时间</option>
              <option>更新时间</option>
              <option>优先级</option>
            </select>
          </div>
          
          {/* 工单列表 */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : isError ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-red-500">加载失败</div>
            </div>
          ) : (
            <TicketList
              tickets={filteredTickets}
              onEdit={handleEditTicket}
              onDelete={handleDeleteTicket}
            />
          )}
        </main>
      </div>

      {/* 工单表单 */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <TicketForm
              ticket={editingTicket}
              tags={tags as Tag[]}
              onSubmit={handleSubmitTicket}
              onCancel={() => {
                setShowForm(false);
                setEditingTicket(undefined);
              }}
            />
          </div>
        </div>
      )}

      {/* 标签表单 */}
      {showTagForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {editingTag ? '编辑标签' : '创建标签'}
              </h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSubmitTag();
              }}>
                <div className="mb-4">
                  <label htmlFor="tagName" className="block text-sm font-medium text-gray-700 mb-1">
                    标签名称 *
                  </label>
                  <input
                    type="text"
                    id="tagName"
                    name="tagName"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    required
                    disabled={createTagMutation.isPending || updateTagMutation.isPending}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="请输入标签名称"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTagForm(false);
                      setEditingTag(undefined);
                      setTagName('');
                    }}
                    disabled={createTagMutation.isPending || updateTagMutation.isPending}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={createTagMutation.isPending || updateTagMutation.isPending}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {createTagMutation.isPending || updateTagMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        提交中...
                      </>
                    ) : (
                      '提交'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
