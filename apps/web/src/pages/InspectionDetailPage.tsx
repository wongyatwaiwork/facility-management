import { ArrowBack, BuildCircle } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api/client';
import type { Inspection, SnapshotItem } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../components/PageHeader';
import { ErrorView, LoadingView } from '../components/StateViews';
import { StatusChip } from '../components/StatusChip';
import { formatDateTime } from '../i18n/format';
import { useSettings } from '../settings/SettingsProvider';

export function InspectionDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { locale } = useSettings();
  const { user } = useAuth();
  const client = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [notes, setNotes] = useState('');
  const [corrective, setCorrective] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => api<{ data: Inspection }>(`/inspections/${id}`),
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['inspection', id] });
    void client.invalidateQueries({ queryKey: ['inspections'] });
  };
  const complete = useMutation({
    mutationFn: (inspection: Inspection) =>
      api(`/inspections/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          version: inspection.version,
          result: Object.entries(answers).some(
            ([, answer]) => answer === 'FAIL' || answer === false,
          )
            ? 'ATTENTION_REQUIRED'
            : 'SATISFACTORY',
          completionNotes: notes || undefined,
          responses: Object.entries(answers).map(([itemKey, answer]) => ({ itemKey, answer })),
        }),
      }),
    onSuccess: refresh,
  });
  const correctiveWork = useMutation({
    mutationFn: (findingId: string) =>
      api(`/inspections/findings/${findingId}/work-order`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Correct inspection finding',
          description: 'Corrective follow-up created from the recorded demo inspection finding.',
          priority: 'HIGH',
          dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        }),
      }),
    onSuccess: () => {
      setCorrective(null);
      refresh();
    },
  });
  if (query.isLoading) return <LoadingView />;
  if (query.error || !query.data)
    return <ErrorView error={query.error} retry={() => void query.refetch()} />;
  const inspection = query.data.data;
  const items = inspection.checklistSnapshot ?? [];
  const canComplete = inspection.status !== 'COMPLETED' && user?.role !== 'AUDITOR';
  const manager = user && ['ADMINISTRATOR', 'FACILITY_MANAGER', 'COORDINATOR'].includes(user.role);
  return (
    <>
      <Button component={Link} to="/app/inspections" startIcon={<ArrowBack />} sx={{ mb: 2 }}>
        {t('inspections.title')}
      </Button>
      <PageHeader
        title={`${inspection.number} · ${inspection.asset?.name ?? t('inspections.title')}`}
        subtitle={`${inspection.site.name} · ${formatDateTime(inspection.dueAt, locale)}`}
        action={<StatusChip value={inspection.status} size="medium" />}
      />
      <Alert severity="warning" sx={{ mb: 2 }}>
        {t('inspections.demoRecord')}
      </Alert>
      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h3" sx={{ mb: 2 }}>
                {t('inspections.checklist')}
              </Typography>
              <Stack spacing={2.5}>
                {items.map((item) => (
                  <ChecklistInput
                    key={item.itemKey}
                    item={item}
                    value={answers[item.itemKey]}
                    disabled={!canComplete}
                    onChange={(answer) =>
                      setAnswers((current) => ({ ...current, [item.itemKey]: answer }))
                    }
                  />
                ))}
                {canComplete ? (
                  <TextField
                    multiline
                    minRows={3}
                    label={t('common.notes')}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                ) : null}
                {complete.error ? <ErrorView error={complete.error} /> : null}
                {canComplete ? (
                  <Button
                    variant="contained"
                    onClick={() => complete.mutate(inspection)}
                    disabled={complete.isPending}
                  >
                    {t('inspections.complete')}
                  </Button>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h3">{t('inspections.findings')}</Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {inspection.findings?.length ? (
                  inspection.findings.map((finding) => (
                    <Box key={finding.id} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <StatusChip value={finding.severity} />
                      <Typography sx={{ my: 1 }}>{finding.summary}</Typography>
                      {finding.correctiveWorkOrder ? (
                        <Button
                          component={Link}
                          to={`/app/work-orders/${finding.correctiveWorkOrder.id}`}
                          size="small"
                        >
                          {finding.correctiveWorkOrder.number}
                        </Button>
                      ) : manager ? (
                        <Button
                          size="small"
                          startIcon={<BuildCircle />}
                          onClick={() => setCorrective(finding.id)}
                        >
                          {t('inspections.createCorrective')}
                        </Button>
                      ) : null}
                    </Box>
                  ))
                ) : (
                  <Typography color="text.secondary">{t('common.noData')}</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Dialog open={Boolean(corrective)} onClose={() => setCorrective(null)}>
        <DialogTitle>{t('inspections.createCorrective')}</DialogTitle>
        <DialogContent>
          <Typography>{t('inspections.createCorrective')}</Typography>
          {correctiveWork.error ? (
            <Box sx={{ mt: 2 }}>
              <ErrorView error={correctiveWork.error} />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCorrective(null)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => corrective && correctiveWork.mutate(corrective)}
          >
            {t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function ChecklistInput({
  item,
  value,
  disabled,
  onChange,
}: {
  item: SnapshotItem;
  value?: string | number | boolean;
  disabled: boolean;
  onChange: (value: string | number | boolean) => void;
}) {
  const { t } = useTranslation();
  if (item.answerType === 'PASS_FAIL_NA')
    return (
      <FormControl required={item.isRequired} disabled={disabled}>
        <FormLabel>{item.label}</FormLabel>
        <RadioGroup row value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <FormControlLabel value="PASS" control={<Radio />} label="Pass" />
          <FormControlLabel value="FAIL" control={<Radio />} label="Fail" />
          <FormControlLabel value="NA" control={<Radio />} label={t('status.NOT_APPLICABLE')} />
        </RadioGroup>
      </FormControl>
    );
  if (item.answerType === 'YES_NO')
    return (
      <FormControl required={item.isRequired} disabled={disabled}>
        <FormLabel>{item.label}</FormLabel>
        <RadioGroup
          row
          value={value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === 'true')}
        >
          <FormControlLabel value="true" control={<Radio />} label="Yes" />
          <FormControlLabel value="false" control={<Radio />} label="No" />
        </RadioGroup>
      </FormControl>
    );
  return (
    <TextField
      required={item.isRequired}
      disabled={disabled}
      type={item.answerType === 'NUMERIC' ? 'number' : 'text'}
      multiline={item.answerType === 'TEXT'}
      label={item.label}
      helperText={item.guidance}
      value={value ?? ''}
      onChange={(e) =>
        onChange(item.answerType === 'NUMERIC' ? Number(e.target.value) : e.target.value)
      }
    />
  );
}
