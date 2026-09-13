import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ErrorView, LoadingView } from '../components/StateViews';
import { formatDateTime } from '../i18n/format';
import { useSettings } from '../settings/SettingsProvider';

interface Audit {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  requestId?: string;
  createdAt: string;
  actor?: { name: string };
  site?: { name: string };
}

export function AuditPage() {
  const { t } = useTranslation();
  const { locale } = useSettings();
  const query = useQuery({
    queryKey: ['audit'],
    queryFn: () => api<{ data: Audit[] }>('/audit-logs?pageSize=50'),
  });
  return (
    <>
      <PageHeader title={t('audit.title')} subtitle={t('audit.subtitle')} />
      {query.isLoading ? (
        <LoadingView />
      ) : query.error || !query.data ? (
        <ErrorView error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('audit.time')}</TableCell>
                  <TableCell>{t('audit.action')}</TableCell>
                  <TableCell>{t('audit.entity')}</TableCell>
                  <TableCell>{t('audit.actor')}</TableCell>
                  <TableCell>{t('common.site')}</TableCell>
                  <TableCell>{t('audit.requestId')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{formatDateTime(event.createdAt, locale)}</TableCell>
                    <TableCell>
                      <Typography fontFamily="monospace" fontSize="0.85rem">
                        {event.action}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {event.entityType}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {event.entityId}
                      </Typography>
                    </TableCell>
                    <TableCell>{event.actor?.name ?? 'System'}</TableCell>
                    <TableCell>{event.site?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">
                        {event.requestId ?? '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </>
  );
}
