/**
 * TypeScript type definitions for the application.
 *
 * These types match the Pydantic models from the backend.
 */

// Database Types
export enum DatabaseType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  SQLITE = 'sqlite',
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

export interface DatabaseConnection {
  name: string;
  connectionUrl: string;
  databaseType: DatabaseType;
  status: ConnectionStatus;
  createdAt: string; // ISO 8601
  lastConnectedAt?: string; // ISO 8601
  lastMetadataRefresh?: string; // ISO 8601
  errorMessage?: string;
}

// Metadata Types
export interface ColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  comment?: string;
}

export interface IndexMetadata {
  name: string;
  columns: string[];
  isUnique: boolean;
  indexType?: string;
}

export interface TableMetadata {
  name: string;
  schema?: string;
  columns: ColumnMetadata[];
  primaryKey: string[];
  indexes: IndexMetadata[];
  rowCountEstimate?: number;
}

export interface ViewMetadata {
  name: string;
  schema?: string;
  columns: ColumnMetadata[];
  definition?: string;
}

export interface DatabaseMetadata {
  databaseName: string;
  tables: TableMetadata[];
  views: ViewMetadata[];
  extractedAt: string; // ISO 8601
}

// Query Types
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface Query {
  id: string;
  databaseName: string;
  sqlText: string;
  validatedSql?: string;
  isValid: boolean;
  validationError?: string;
  executionStatus: ExecutionStatus;
  executedAt?: string; // ISO 8601
  completedAt?: string; // ISO 8601
  executionTimeMs?: number;
  rowCount?: number;
  errorMessage?: string;
}

export interface ColumnDefinition {
  name: string;
  dataType: string;
  sourceTable?: string;
}

export interface QueryResult {
  queryId: string;
  columns: ColumnDefinition[];
  rows: Record<string, unknown>[];
  totalRows: number;
  executionTimeMs: number;
  wasLimited: boolean;
}

// LLM Types
export enum GenerationStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface NaturalLanguageRequest {
  id: string;
  databaseName: string;
  prompt: string;
  generatedSql?: string;
  generationStatus: GenerationStatus;
  errorMessage?: string;
  createdAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  modelUsed?: string;
  tokensUsed?: number;
}
