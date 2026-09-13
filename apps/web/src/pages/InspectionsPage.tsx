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
import { Link } from 'react-router-dom';

import { api } from '../api/client';
import type { Inspection } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { ErrorView, LoadingView } from '../components/StateViews';
import { StatusChip } from '../components/StatusChip';
import { formatDateTime } from '../i18n/format';
import { useSettings } from '../settings/SettingsProvider';

export function InspectionsPage() {
  const { t } = useTranslation();
  const { locale } = useSettings();
  const query = useQuery({
    queryKey: ['inspections'],
    queryFn: () => api<{ data: Inspection[] }>('/inspections'),
  });
  return (
    <>
      <PageHeader title={t('inspections.title')} subtitle={t('inspections.subtitle')} />
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
                  <TableCell>{t('workOrders.number')}</TableCell>
                  <TableCell>{t('inspections.template')}</TableCell>
                  <TableCell>{t('common.asset')}</TableCell>
                  <TableCell>{t('inspections.inspector')}</TableCell>
                  <TableCell>{t('common.due')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell>{t('inspections.findings')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((inspection) => (
                  <TableRow
                    key={inspection.id}
                    component={Link}
                    to={`/app/inspections/${inspection.id}`}
                    hover
                    sx={{
                      textDecoration: 'none',
                      cursor: 'pointer',
                      '& td': { color: 'text.primary' },
                    }}
                  >
                    <TableCell>
                      <Typography fontFamily="monospace" fontWeight={700}>
                        {inspection.number}
                      </Typography>
                    </TableCell>
                    <TableCell>{inspection.templateVersion?.template.title}</TableCell>
                    <TableCell>
                      {inspection.asset
                        ? `${inspection.asset.internalCode} · ${inspection.asset.name}`
                        : '—'}
                    </TableCell>
                    <TableCell>{inspection.inspector.name}</TableCell>
                    <TableCell>{formatDateTime(inspection.dueAt, locale)}</TableCell>
                    <TableCell>
                      <StatusChip value={inspection.status} />
                    </TableCell>
                    <TableCell>{inspection._count?.findings ?? 0}</TableCell>
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
