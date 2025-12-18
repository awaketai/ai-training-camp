/**
 * API client configuration using Axios.
 *
 * Provides a configured Axios instance for making HTTP requests to the backend API.
 */

import axios, { AxiosError, AxiosResponse } from 'axios';

// Base API URL (proxied through Vite)
const API_BASE_URL = '/api/v1';

// Create Axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any request modifications here (e.g., auth tokens)
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Handle successful responses
    return response;
  },
  (error: AxiosError) => {
    // Handle error responses
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      console.error(`API Error [${status}]:`, data);

      // You can handle specific error codes here
      if (status === 401) {
        // Handle unauthorized
      } else if (status === 403) {
        // Handle forbidden
      } else if (status === 404) {
        // Handle not found
      } else if (status === 500) {
        // Handle server error
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error:', error.message);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;

// Types
import type { DatabaseConnection, DatabaseMetadata, NaturalLanguageRequest, Query, QueryResult } from './types';

// Error response type
export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

// API response types
interface DatabaseListResponse {
  data: DatabaseConnection[];
  total: number;
}

interface DatabaseDetailResponse {
  connection: DatabaseConnection;
  metadata: DatabaseMetadata | null;
}

// Database API Methods
export const databaseAPI = {
  /**
   * List all configured databases
   */
  async listDatabases(): Promise<DatabaseListResponse> {
    const response = await api.get<DatabaseListResponse>('/databases');
    return response.data;
  },

  /**
   * Create or update a database connection
   */
  async createDatabase(
    name: string,
    connectionUrl: string
  ): Promise<DatabaseConnection> {
    const response = await api.put<DatabaseConnection>(`/databases/${name}`, {
      connectionUrl,
    });
    return response.data;
  },

  /**
   * Get database details with metadata
   */
  async getDatabase(name: string): Promise<DatabaseDetailResponse> {
    const response = await api.get<DatabaseDetailResponse>(`/databases/${name}`);
    return response.data;
  },

  /**
   * Delete a database connection
   */
  async deleteDatabase(name: string): Promise<void> {
    await api.delete(`/databases/${name}`);
  },

  /**
   * Refresh database metadata
   */
  async refreshMetadata(name: string): Promise<DatabaseMetadata> {
    const response = await api.post<DatabaseMetadata>(
      `/databases/${name}/metadata/refresh`
    );
    return response.data;
  },
};

// Query execution response
interface QueryExecutionResponse {
  query: Query;
  result: QueryResult | null;
}

// Query API Methods
export const queryAPI = {
  /**
   * Execute SQL query against a database
   */
  async executeQuery(
    databaseName: string,
    sqlText: string
  ): Promise<QueryExecutionResponse> {
    const response = await api.post<QueryExecutionResponse>(
      `/databases/${databaseName}/query`,
      {
        sqlText,
      }
    );
    return response.data;
  },

  /**
   * Generate SQL from natural language description
   */
  async generateSql(
    databaseName: string,
    prompt: string
  ): Promise<NaturalLanguageRequest> {
    const response = await api.post<NaturalLanguageRequest>(
      `/databases/${databaseName}/query/natural`,
      {
        prompt,
      }
    );
    return response.data;
  },
};

// Helper function to extract error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    return apiError?.message || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}
