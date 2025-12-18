/**
 * Manual Query Page
 *
 * SQL editor page for writing and executing SELECT queries.
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
} from 'antd';
import { PlayCircleOutlined, ClockCircleOutlined, TableOutlined } from '@ant-design/icons';
import { databaseAPI, queryAPI, getErrorMessage } from '@/services/api';
import type { DatabaseConnection, Query, QueryResult, ExecutionStatus } from '@/services/types';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { SqlEditor } from '@/components/SqlEditor';
import { QueryResultsTable } from '@/components/QueryResultsTable';
import { formatExecutionTime } from '@/utils/formatters';

const { Title, Text } = Typography;

export function ManualQueryPage() {
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [sqlText, setSqlText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState<Query | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);

  // Load databases on mount
  useEffect(() => {
    loadDatabases();
  }, []);

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

  const handleExecute = async () => {
    if (!selectedDatabase) {
      message.warning('Please select a database');
      return;
    }

    if (!sqlText.trim()) {
      message.warning('Please enter a SQL query');
      return;
    }

    setExecuting(true);
    setError(null);
    setQuery(null);
    setResult(null);

    try {
      const response = await queryAPI.executeQuery(selectedDatabase, sqlText);

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

  const getStatusColor = (status: ExecutionStatus): string => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'processing';
      default:
        return 'default';
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          title={<Title level={3}>SQL Query Editor</Title>}
          extra={
            <Space>
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
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleExecute}
                loading={executing}
                disabled={!selectedDatabase}
                size="large"
              >
                Execute Query
              </Button>
            </Space>
          }
        >
          <Alert
            message="SELECT Queries Only"
            description="Only SELECT statements are allowed. INSERT, UPDATE, DELETE, and DDL statements will be rejected. The system automatically applies LIMIT 1000 if not specified."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {error && <ErrorDisplay error={error} />}

          <SqlEditor
            value={sqlText}
            onChange={setSqlText}
            height="400px"
          />
        </Card>

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
            }}
          >
            <Row gutter={16}>
              <Col span={6}>
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
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Execution Time"
                  value={
                    query.executionTimeMs
                      ? formatExecutionTime(query.executionTimeMs)
                      : '-'
                  }
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Rows Returned"
                  value={query.rowCount ?? '-'}
                  prefix={<TableOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Query ID"
                  value={query.id.substring(0, 8)}
                  valueStyle={{ fontSize: '16px' }}
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

        {!query && !result && !error && (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary">
                Select a database and write your SQL query above, then click Execute.
              </Text>
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
}
