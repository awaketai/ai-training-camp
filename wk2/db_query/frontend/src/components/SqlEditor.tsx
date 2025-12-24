/**
 * SqlEditor Component
 *
 * Monaco Editor wrapper for SQL editing with syntax highlighting and auto-completion.
 */

import Editor, { OnMount, loader } from '@monaco-editor/react';
import { Card } from 'antd';
import type { editor } from 'monaco-editor';
import type { TableMetadata } from '@/services/types';

// Configure loader to use local monaco-editor from public directory
loader.config({ paths: { vs: '/monaco-editor/vs' } });

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
  metadata?: TableMetadata[];
}

export function SqlEditor({
  value,
  onChange,
  height = '300px',
  readOnly = false,
  metadata,
}: SqlEditorProps) {
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Configure SQL language
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const suggestions: any[] = [];

        // Add SQL keywords
        const keywords = [
          'SELECT',
          'FROM',
          'WHERE',
          'AND',
          'OR',
          'ORDER BY',
          'GROUP BY',
          'HAVING',
          'LIMIT',
          'OFFSET',
          'JOIN',
          'LEFT JOIN',
          'RIGHT JOIN',
          'INNER JOIN',
          'OUTER JOIN',
          'ON',
          'AS',
          'DISTINCT',
          'COUNT',
          'SUM',
          'AVG',
          'MIN',
          'MAX',
        ];

        keywords.forEach((keyword) => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
          });
        });

        // Add table and column suggestions from metadata
        if (metadata) {
          metadata.forEach((table) => {
            // Add table name
            suggestions.push({
              label: table.name,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: table.name,
              detail: 'Table',
            });

            // Add column names
            table.columns.forEach((column) => {
              suggestions.push({
                label: `${table.name}.${column.name}`,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: `${table.name}.${column.name}`,
                detail: `${column.dataType}${column.nullable ? '' : ' NOT NULL'}`,
              });

              // Also add just column name
              suggestions.push({
                label: column.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: column.name,
                detail: `${table.name}.${column.name} (${column.dataType})`,
              });
            });
          });
        }

        return { suggestions };
      },
    });

    // Set editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });
  };

  const handleChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <Card bodyStyle={{ padding: 0 }}>
      <Editor
        height={height}
        defaultLanguage="sql"
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          readOnly,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </Card>
  );
}
