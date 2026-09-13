import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

const colors: Record<
  string,
  'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
> = {
  OPEN: 'info',
  TRIAGED: 'primary',
  ASSIGNED: 'primary',
  IN_PROGRESS: 'warning',
  ON_HOLD: 'default',
  COMPLETED: 'success',
  VERIFIED: 'success',
  CLOSED: 'default',
  CANCELLED: 'error',
  URGENT: 'error',
  HIGH: 'warning',
  ATTENTION_REQUIRED: 'error',
  SATISFACTORY: 'success',
  OPERATIONAL: 'success',
  DEGRADED: 'warning',
};

export function StatusChip({
  value,
  size = 'small',
}: {
  value: string;
  size?: 'small' | 'medium';
}) {
  const { t } = useTranslation();
  return (
    <Chip
      label={t(`status.${value}`, value)}
      color={colors[value] ?? 'default'}
      size={size}
      variant="outlined"
    />
  );
}
