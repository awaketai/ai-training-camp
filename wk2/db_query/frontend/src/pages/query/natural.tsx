/**
 * Natural Language Query Page
 *
 * Page for generating SQL from natural language descriptions using LLM.
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
  Spin,
} from 'antd';
import { BulbOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { databaseAPI, queryAPI, getErrorMessage } from '@/services/api';
import type { DatabaseConnection, NaturalLanguageRequest, GenerationStatus } from '@/services/types';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { NaturalLanguageInput } from '@/components/NaturalLanguageInput';
import { GeneratedSqlReview } from '@/components/GeneratedSqlReview';

const { Title, Text, Paragraph } = Typography;

export function NaturalQueryPage() {
  const navigate = useNavigate();
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [nlRequest, setNlRequest] = useState<NaturalLanguageRequest | null>(null);

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

  const handleGenerate = async () => {
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

    try {
      const response = await queryAPI.generateSql(selectedDatabase, prompt);

      setNlRequest(response);

      if (response.generationStatus === 'completed') {
        message.success('SQL generated successfully! Review and execute below.');
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

  const handleModifySQL = (sql: string) => {
    // Navigate to manual query page with generated SQL pre-filled
    navigate('/query', {
      state: {
        database: selectedDatabase,
        sqlText: sql,
      },
    });
  };

  const handleExecuteSQL = () => {
    // Navigate to manual query page and execute
    if (nlRequest?.generatedSql) {
      navigate('/query', {
        state: {
          database: selectedDatabase,
          sqlText: nlRequest.generatedSql,
          autoExecute: true,
        },
      });
    }
  };

  const handleReset = () => {
    setPrompt('');
    setNlRequest(null);
    setError(null);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          title={
            <Space>
              <BulbOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <Title level={3} style={{ margin: 0 }}>
                Natural Language SQL Generator
              </Title>
            </Space>
          }
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
            </Space>
          }
        >
          <Alert
            message="AI-Powered Query Generation"
            description={
              <div>
                <Paragraph>
                  Describe the data you want to query in natural language, and the AI will
                  generate a SQL SELECT statement for you. The generated SQL will be
                  validated before execution.
                </Paragraph>
                <Paragraph>
                  <Text strong>Example prompts:</Text>
                  <ul style={{ marginTop: '8px' }}>
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

          {error && <ErrorDisplay error={error} />}

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

          <Space>
            <Button
              type="primary"
              icon={<BulbOutlined />}
              onClick={handleGenerate}
              loading={generating}
              disabled={!selectedDatabase || prompt.trim().length < 3}
              size="large"
            >
              {generating ? 'Generating SQL...' : 'Generate SQL'}
            </Button>
            {nlRequest && (
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={generating}
              >
                Start Over
              </Button>
            )}
          </Space>
        </Card>

        {nlRequest && nlRequest.generationStatus === 'completed' && nlRequest.generatedSql && (
          <GeneratedSqlReview
            generatedSql={nlRequest.generatedSql}
            onModify={handleModifySQL}
            onExecute={handleExecuteSQL}
            modelUsed={nlRequest.modelUsed}
            tokensUsed={nlRequest.tokensUsed}
          />
        )}

        {nlRequest && nlRequest.generationStatus === 'failed' && (
          <Alert
            message="SQL Generation Failed"
            description={nlRequest.errorMessage || 'Failed to generate SQL. Please try again.'}
            type="error"
            showIcon
          />
        )}

        {!nlRequest && !error && !generating && (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <BulbOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <div>
                <Text type="secondary">
                  Select a database and describe what you want to query above.
                </Text>
              </div>
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
}
