import axios from 'axios';
import { Ticket, TicketCreate, TicketUpdate } from '../types/ticket';
import { Tag, TagCreate, TagUpdate } from '../types/tag';

// 创建axios实例
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // 统一处理错误
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Ticket API methods
// 获取所有工单（支持过滤）
export const getTickets = async (): Promise<Ticket[]> => {
  return await apiClient.get('/tickets/');
};

// 获取单个工单
export const getTicketById = async (id: number): Promise<Ticket> => {
  return await apiClient.get(`/tickets/${id}/`);
};

// 创建工单
export const createTicket = async (data: TicketCreate): Promise<Ticket> => {
  return await apiClient.post('/tickets/', data);
};

// 更新工单
export const updateTicket = async (id: number, data: TicketUpdate): Promise<Ticket> => {
  return await apiClient.put(`/tickets/${id}/`, data);
};

// 删除工单
export const deleteTicket = async (id: number): Promise<void> => {
  return await apiClient.delete(`/tickets/${id}/`);
};

// Tag API methods
// 获取所有标签
export const getTags = async (): Promise<Tag[]> => {
  return await apiClient.get('/tags/');
};

// 获取单个标签
export const getTagById = async (id: number): Promise<Tag> => {
  return await apiClient.get(`/tags/${id}/`);
};

// 创建标签
export const createTag = async (data: TagCreate): Promise<Tag> => {
  return await apiClient.post('/tags/', data);
};

// 更新标签
export const updateTag = async (id: number, data: TagUpdate): Promise<Tag> => {
  return await apiClient.put(`/tags/${id}/`, data);
};

// 删除标签
export const deleteTag = async (id: number): Promise<void> => {
  return await apiClient.delete(`/tags/${id}/`);
};

export default apiClient;
