/**
 * Unified Query Page
 *
 * Combined SQL editor and natural language query page with tabs.
 */

import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Select,
  Space,
  Typography,
  message,
  Alert,
  Statistic,
  Row,
  Col,
  Tabs,
} from 'antd';
import {
  PlayCircleOutlined,
  ClockCircleOutlined,
  TableOutlined,
  BulbOutlined,
  CodeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { databaseAPI, queryAPI, getErrorMessage } from '@/services/api';
import type {
  DatabaseConnection,
  Query,
  QueryResult,
  ExecutionStatus,
  NaturalLanguageRequest,
} from '@/services/types';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { SqlEditor } from '@/components/SqlEditor';
import { QueryResultsTable } from '@/components/QueryResultsTable';
import { NaturalLanguageInput } from '@/components/NaturalLanguageInput';
import { SchemaTree } from '@/components/SchemaTree';
import { formatExecutionTime } from '@/utils/formatters';

const { Title, Text, Paragraph } = Typography;

type QueryMode = 'sql' | 'natural';

export function QueryPage() {
  // Common state
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [activeTab, setActiveTab] = useState<QueryMode>('sql');

  // SQL mode state
  const [sqlText, setSqlText] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [query, setQuery] = useState<Query | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);

  // Natural language mode state
  const [prompt, setPrompt] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [nlRequest, setNlRequest] = useState<NaturalLanguageRequest | null>(null);

  // Load databases on mount
  useEffect(() => {
    loadDatabases();
  }, []);

  // Keyboard shortcuts (Ctrl/Cmd + Enter to execute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to execute
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();

        if (activeTab === 'sql' && sqlText.trim() && selectedDatabase && !executing) {
          handleExecuteSQL(sqlText);
        } else if (activeTab === 'natural' && prompt.trim().length >= 3 && selectedDatabase && !generating && !executing) {
          handleGenerateSQL();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, sqlText, prompt, selectedDatabase, executing, generating]);


  const loadDatabases = async () => {
    setLoading(true);
    try {
      const response = await databaseAPI.listDatabases();
      setDatabases(response.data);

      // Auto-select first database
      if (response.data.length > 0 && !selectedDatabase) {
        setSelectedDatabase(response.data[0].name);
      }
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSQL = async (sql: string) => {
    if (!selectedDatabase) {
      message.warning('Please select a database');
      return;
    }

    if (!sql.trim()) {
      message.warning('Please enter a SQL query');
      return;
    }

    setExecuting(true);
    setError(null);
    setQuery(null);
    setResult(null);

    try {
      const response = await queryAPI.executeQuery(selectedDatabase, sql);

      setQuery(response.query);
      setResult(response.result);

      if (response.query.executionStatus === 'completed') {
        message.success('Query executed successfully');
      } else if (response.query.executionStatus === 'failed') {
        message.error(response.query.errorMessage || 'Query execution failed');
      }
    } catch (err) {
      setError(err);
      message.error(getErrorMessage(err));
    } finally {
      setExecuting(false);
    }
  };

  const handleGenerateSQL = async () => {
    if (!selectedDatabase) {
      message.warning('Please select a database');
      return;
    }

    if (!prompt.trim()) {
      message.warning('Please enter a description of what you want to query');
      return;
    }

    if (prompt.trim().length < 3) {
      message.warning('Description must be at least 3 characters');
      return;
    }

    setGenerating(true);
    setError(null);
    setNlRequest(null);
    setQuery(null);
    setResult(null);

    try {
      const response = await queryAPI.generateSql(selectedDatabase, prompt);

      setNlRequest(response);

      if (response.generationStatus === 'completed' && response.generatedSql) {
        message.success('SQL generated successfully!');

        // Automatically execute the generated SQL
        await handleExecuteSQL(response.generatedSql);
      } else if (response.generationStatus === 'failed') {
        message.error(response.errorMessage || 'SQL generation failed');
      }
    } catch (err) {
      setError(err);
      message.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleResetNatural = () => {
    setPrompt('');
    setNlRequest(null);
    setQuery(null);
    setResult(null);
    setError(null);
  };

  // Schema tree width state for resizing
  const [schemaWidth, setSchemaWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);

  const handleInsertTableName = (tableName: string) => {
    setSqlText((prev) => prev + tableName);
  };

  const handleInsertColumn = (tableName: string, columnName: string) => {
    setSqlText((prev) => prev + `${tableName}.${columnName}`);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(200, Math.min(500, e.clientX - 240));
      setSchemaWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const renderSqlTab = () => (
    <div>
      {/* Top section: Schema Tree + SQL Editor */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, height: 520 }}>
        {/* Left side: Schema Tree */}
        <div style={{ width: schemaWidth, flexShrink: 0, height: '100%' }}>
          <Card
            title="Tables"
            size="small"
            bodyStyle={{ padding: '0 8px', overflow: 'auto', height: 'calc(100% - 40px)' }}
            style={{ height: '100%' }}
          >
            <SchemaTree
              databaseName={selectedDatabase}
              onTableSelect={handleInsertTableName}
              onColumnSelect={handleInsertColumn}
            />
          </Card>
        </div>

        {/* Resizer handle */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            width: 8,
            cursor: 'col-resize',
            backgroundColor: isResizing ? '#1890ff' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isResizing) e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            if (!isResizing) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div style={{ width: 2, height: 40, backgroundColor: '#d9d9d9', borderRadius: 1 }} />
        </div>

        {/* Right side: SQL Editor */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Card>
            <Alert
              message="SELECT Queries Only"
              description="Only SELECT statements are allowed. The system automatically applies LIMIT 1000 if not specified."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {error && activeTab === 'sql' && <ErrorDisplay error={error} />}

            <SqlEditor value={sqlText} onChange={setSqlText} height="300px" />

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Tip: Press Ctrl+Enter (Cmd+Enter on Mac) to execute
              </Text>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleExecuteSQL(sqlText)}
                loading={executing}
                disabled={!selectedDatabase || !sqlText.trim()}
                size="large"
              >
                Execute Query
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom section: Results */}
      <div>
        {query && (
          <Card
            title="Query Execution Status"
            style={{
              borderLeft: `4px solid ${
                query.executionStatus === 'completed'
                  ? '#52c41a'
                  : query.executionStatus === 'failed'
                  ? '#ff4d4f'
                  : '#1890ff'
              }`,
              marginBottom: '16px',
            }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Status"
                  value={query.executionStatus.toUpperCase()}
                  valueStyle={{
                    color:
                      query.executionStatus === 'completed'
                        ? '#52c41a'
                        : query.executionStatus === 'failed'
                        ? '#ff4d4f'
                        : '#1890ff',
                    fontSize: '16px',
                  }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Execution Time"
                  value={
                    query.executionTimeMs
                      ? formatExecutionTime(query.executionTimeMs)
                      : '-'
                  }
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Rows Returned"
                  value={query.rowCount ?? '-'}
                  prefix={<TableOutlined />}
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Query ID"
                  value={query.id.substring(0, 8)}
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
            </Row>

            {query.validationError && (
              <Alert
                message="Validation Error"
                description={query.validationError}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}

            {query.errorMessage && !query.validationError && (
              <Alert
                message="Execution Error"
                description={query.errorMessage}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        )}

        {result && <QueryResultsTable result={result} />}

        {!query && !result && (
          <Card>
            <div style={{ textAlign: 'center', padding: '100px 20px' }}>
              <CodeOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <div>
                <Text type="secondary">Write your SQL query and click Execute to see results</Text>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );

  const renderNaturalTab = () => (
    <Row gutter={[24, 24]}>
      {/* Left side: Natural Language Input */}
      <Col xs={24} lg={12}>
        <Card>
          <Alert
            message="AI-Powered Query Generation"
            description={
              <div>
                <Paragraph>
                  Describe what you want to query in natural language, and AI will generate and
                  execute the SQL for you.
                </Paragraph>
                <Paragraph style={{ marginBottom: 0 }}>
                  <Text strong>Example prompts:</Text>
                  <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                    <li>"Show me all users who registered in the last 30 days"</li>
                    <li>"Find the top 10 products by sales revenue"</li>
                    <li>"Get user email addresses and their order counts"</li>
                  </ul>
                </Paragraph>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          {error && activeTab === 'natural' && <ErrorDisplay error={error} />}

          <div style={{ marginBottom: '16px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Describe what you want to query:
            </Text>
            <NaturalLanguageInput
              value={prompt}
              onChange={setPrompt}
              disabled={generating}
              placeholder="Example: Show me all active users with their email addresses and registration dates"
            />
          </div>

          {nlRequest && nlRequest.generatedSql && (
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Generated SQL:
              </Text>
              <SqlEditor
                value={nlRequest.generatedSql}
                onChange={() => {}}
                height="200px"
                readOnly
              />
              {nlRequest.modelUsed && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                  <Text type="secondary">
                    Model: {nlRequest.modelUsed}
                    {nlRequest.tokensUsed && ` • Tokens: ${nlRequest.tokensUsed}`}
                  </Text>
                </div>
              )}
            </div>
          )}

          {nlRequest && nlRequest.generationStatus === 'failed' && (
            <Alert
              message="SQL Generation Failed"
              description={nlRequest.errorMessage || 'Failed to generate SQL. Please try again.'}
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Tip: Press Ctrl+Enter (Cmd+Enter on Mac) to generate
            </Text>
            <Space>
              <Button
                type="primary"
                icon={<BulbOutlined />}
                onClick={handleGenerateSQL}
                loading={generating || executing}
                disabled={!selectedDatabase || prompt.trim().length < 3}
                size="large"
              >
                {generating ? 'Generating SQL...' : executing ? 'Executing...' : 'Generate & Execute'}
              </Button>
              {nlRequest && (
                <Button icon={<ReloadOutlined />} onClick={handleResetNatural} disabled={generating || executing}>
                  Start Over
                </Button>
              )}
            </Space>
          </div>
        </Card>
      </Col>

      {/* Right side: Results */}
      <Col xs={24} lg={12}>
        {query && (
          <Card
            title="Query Execution Status"
            style={{
              borderLeft: `4px solid ${
                query.executionStatus === 'completed'
                  ? '#52c41a'
                  : query.executionStatus === 'failed'
                  ? '#ff4d4f'
                  : '#1890ff'
              }`,
              marginBottom: '16px',
            }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Status"
                  value={query.executionStatus.toUpperCase()}
                  valueStyle={{
                    color:
                      query.executionStatus === 'completed'
                        ? '#52c41a'
                        : query.executionStatus === 'failed'
                        ? '#ff4d4f'
                        : '#1890ff',
                    fontSize: '16px',
                  }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Execution Time"
                  value={
                    query.executionTimeMs
                      ? formatExecutionTime(query.executionTimeMs)
                      : '-'
                  }
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Rows Returned"
                  value={query.rowCount ?? '-'}
                  prefix={<TableOutlined />}
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Query ID"
                  value={query.id.substring(0, 8)}
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
            </Row>

            {query.validationError && (
              <Alert
                message="Validation Error"
                description={query.validationError}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}

            {query.errorMessage && !query.validationError && (
              <Alert
                message="Execution Error"
                description={query.errorMessage}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        )}

        {result && <QueryResultsTable result={result} />}

        {!query && !result && (
          <Card>
            <div style={{ textAlign: 'center', padding: '100px 20px' }}>
              <BulbOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <div>
                <Text type="secondary">
                  Describe what you want to query, and AI will generate and execute SQL for you
                </Text>
              </div>
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={<Title level={3}>Database Query</Title>}
        extra={
          <Select
            style={{ width: 200 }}
            placeholder="Select database"
            value={selectedDatabase}
            onChange={setSelectedDatabase}
            loading={loading}
            options={databases.map((db) => ({
              label: db.name,
              value: db.name,
            }))}
          />
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as QueryMode);
            // Clear error when switching tabs
            setError(null);
          }}
          items={[
            {
              key: 'sql',
              label: (
                <span>
                  <CodeOutlined /> SQL Query
                </span>
              ),
              children: renderSqlTab(),
            },
            {
              key: 'natural',
              label: (
                <span>
                  <BulbOutlined /> Natural Query
                </span>
              ),
              children: renderNaturalTab(),
            },
          ]}
        />
      </Card>
    </div>
  );
}
