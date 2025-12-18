/**
 * NaturalLanguageInput Component
 *
 * Text area for entering natural language query descriptions.
 */

import { Input, Typography } from 'antd';
import { memo } from 'react';

const { TextArea } = Input;
const { Text } = Typography;

interface NaturalLanguageInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

export const NaturalLanguageInput = memo(function NaturalLanguageInput({
  value,
  onChange,
  placeholder = 'Describe the data you want to query...',
  disabled = false,
  maxLength = 2000,
}: NaturalLanguageInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div>
      <TextArea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        rows={6}
        showCount={false}
        style={{ fontSize: '14px', resize: 'vertical' }}
      />
      <div style={{ marginTop: '8px', textAlign: 'right' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {value.length} / {maxLength} characters
        </Text>
      </div>
    </div>
  );
});
