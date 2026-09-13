import { PlayArrow } from '@mui/icons-material';
import { Alert, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import type { PreventivePlan } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../components/PageHeader';
import { ErrorView, LoadingView } from '../components/StateViews';
import { StatusChip } from '../components/StatusChip';
import { formatDateTime } from '../i18n/format';
import { useSettings } from '../settings/SettingsProvider';

export function PreventivePage() {
  const { t } = useTranslation();
  const { locale } = useSettings();
  const { user } = useAuth();
  const client = useQueryClient();
  const [message, setMessage] = useState('');
  const query = useQuery({
    queryKey: ['preventive'],
    queryFn: () => api<{ data: PreventivePlan[] }>('/preventive-plans'),
  });
  const generate = useMutation({
    mutationFn: () =>
      api<{ data: { generated: string[]; skipped: string[] } }>('/preventive-plans/generate-due', {
        method: 'POST',
        body: '{}',
      }),
    onSuccess: (result) => {
      setMessage(`${t('preventive.generated')} (${result.data.generated.length})`);
      void client.invalidateQueries({ queryKey: ['preventive'] });
      void client.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
  const canGenerate = user && ['ADMINISTRATOR', 'FACILITY_MANAGER'].includes(user.role);
  return (
    <>
      <PageHeader
        title={t('preventive.title')}
        subtitle={t('preventive.subtitle')}
        action={
          canGenerate ? (
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
            >
              {t('preventive.generate')}
            </Button>
          ) : undefined
        }
      />
      {message ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      ) : null}
      {generate.error ? <ErrorView error={generate.error} /> : null}
      {query.isLoading ? (
        <LoadingView />
      ) : query.error || !query.data ? (
        <ErrorView error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Grid container spacing={2}>
          {query.data.data.map((plan) => (
            <Grid item xs={12} md={6} xl={4} key={plan.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" gap={2}>
                    <Typography variant="h3">{plan.title}</Typography>
                    <StatusChip value={plan.recurrence} />
                  </Stack>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {plan.site.name}
                    {plan.asset ? ` · ${plan.asset.internalCode}` : ''}
                  </Typography>
                  <Typography sx={{ mt: 2 }}>{plan.instructions}</Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Info
                      label={t('preventive.nextDue')}
                      value={formatDateTime(plan.nextDueAt, locale)}
                    />
                    <Info label={t('preventive.leadDays')} value={String(plan.leadDays)} />
                    <Info label={t('common.assignee')} value={plan.defaultAssignee?.name ?? '—'} />
                    <Info
                      label={t('preventive.occurrences')}
                      value={String(plan._count?.occurrences ?? 0)}
                    />
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <Grid item xs={6}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography>{value}</Typography>
    </Grid>
  );
}
