import { ArrowBack, PersonAdd, SwapHoriz } from '@mui/icons-material';
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
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api/client';
import type { User, WorkOrder } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../components/PageHeader';
import { ErrorView, LoadingView } from '../components/StateViews';
import { StatusChip } from '../components/StatusChip';
import { formatDate, formatDateTime } from '../i18n/format';
import { useSettings } from '../settings/SettingsProvider';

const nextStatus: Record<string, string | undefined> = {
  OPEN: 'TRIAGED',
  ASSIGNED: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
  ON_HOLD: 'IN_PROGRESS',
  COMPLETED: 'VERIFIED',
  VERIFIED: 'CLOSED',
};

export function WorkOrderDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { locale } = useSettings();
  const { user } = useAuth();
  const client = useQueryClient();
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [actualMinutes, setActualMinutes] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const query = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => api<{ data: WorkOrder }>(`/work-orders/${id}`),
  });
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => api<{ data: User[] }>('/users'),
    enabled: Boolean(
      user && ['ADMINISTRATOR', 'FACILITY_MANAGER', 'COORDINATOR'].includes(user.role),
    ),
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['work-order', id] });
    void client.invalidateQueries({ queryKey: ['work-orders'] });
    void client.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const transition = useMutation({
    mutationFn: (work: WorkOrder) =>
      api(`/work-orders/${work.id}/transitions`, {
        method: 'POST',
        body: JSON.stringify({
          toStatus: nextStatus[work.status],
          version: work.version,
          completionNotes: completionNotes || undefined,
          actualMinutes: actualMinutes ? Number(actualMinutes) : undefined,
        }),
      }),
    onSuccess: () => {
      setTransitionOpen(false);
      refresh();
    },
  });
  const assign = useMutation({
    mutationFn: (work: WorkOrder) =>
      api(`/work-orders/${work.id}/assignments`, {
        method: 'POST',
        body: JSON.stringify({ technicianId, version: work.version }),
      }),
    onSuccess: () => {
      setAssignOpen(false);
      refresh();
    },
  });
  if (query.isLoading) return <LoadingView />;
  if (query.error || !query.data)
    return <ErrorView error={query.error} retry={() => void query.refetch()} />;
  const work = query.data.data;
  const target = nextStatus[work.status];
  const manager = user && ['ADMINISTRATOR', 'FACILITY_MANAGER', 'COORDINATOR'].includes(user.role);
  const canTransition =
    Boolean(target) &&
    user?.role !== 'AUDITOR' &&
    (target !== 'VERIFIED' || ['ADMINISTRATOR', 'FACILITY_MANAGER'].includes(user!.role));
  return (
    <>
      <Button component={Link} to="/app/work-orders" startIcon={<ArrowBack />} sx={{ mb: 2 }}>
        {t('workOrders.title')}
      </Button>
      <PageHeader
        title={`${work.number} · ${work.title}`}
        subtitle={`${work.site.name}${work.asset ? ` · ${work.asset.internalCode}` : ''}`}
        action={
          <Stack direction="row" spacing={1}>
            {manager && ['OPEN', 'TRIAGED', 'ASSIGNED'].includes(work.status) ? (
              <Button
                variant="outlined"
                startIcon={<PersonAdd />}
                onClick={() => setAssignOpen(true)}
              >
                {t('workOrders.assign')}
              </Button>
            ) : null}
            {canTransition ? (
              <Button
                variant="contained"
                startIcon={<SwapHoriz />}
                onClick={() => setTransitionOpen(true)}
              >
                {t(`status.${target}`)}
              </Button>
            ) : null}
          </Stack>
        }
      />
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <StatusChip value={work.status} size="medium" />
                <StatusChip value={work.priority} size="medium" />
                <StatusChip value={work.type} size="medium" />
              </Stack>
              <Typography variant="h3">{t('workOrders.description')}</Typography>
              <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{work.description}</Typography>
              <Divider sx={{ my: 3 }} />
              <Grid container spacing={2}>
                <Detail
                  label={t('common.due')}
                  value={formatDate(work.dueAt, locale, work.site.timezone)}
                />
                <Detail
                  label={t('common.assignee')}
                  value={work.assignedTechnician?.name ?? work.contractor?.companyName ?? '—'}
                />
                <Detail
                  label={t('workOrders.actualMinutes')}
                  value={work.actualMinutes ? String(work.actualMinutes) : '—'}
                />
                <Detail
                  label={t('workOrders.completionNotes')}
                  value={work.completionNotes ?? '—'}
                />
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Typography variant="h3">{t('workOrders.history')}</Typography>
              <List>
                {work.statusHistory?.map((event) => (
                  <ListItem key={event.id} divider sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <StatusChip value={event.toStatus} />
                          <Typography variant="body2">{event.actor.name}</Typography>
                        </Stack>
                      }
                      secondary={`${formatDateTime(event.createdAt, locale)}${event.note ? ` · ${event.note}` : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Dialog
        open={transitionOpen}
        onClose={() => setTransitionOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {t('workOrders.transition')} → {target ? t(`status.${target}`) : ''}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {target === 'COMPLETED' ? (
              <>
                <TextField
                  required
                  multiline
                  minRows={3}
                  label={t('workOrders.completionNotes')}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                />
                <TextField
                  required
                  type="number"
                  label={t('workOrders.actualMinutes')}
                  value={actualMinutes}
                  onChange={(e) => setActualMinutes(e.target.value)}
                />
              </>
            ) : (
              <Alert severity="info">{t('workOrders.transition')}</Alert>
            )}
            {transition.error ? <ErrorView error={transition.error} /> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransitionOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            disabled={
              transition.isPending ||
              (target === 'COMPLETED' && (!completionNotes || !actualMinutes))
            }
            onClick={() => transition.mutate(work)}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('workOrders.assign')}</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label={t('common.assignee')}
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
            sx={{ mt: 1 }}
          >
            {users.data?.data
              .filter((person) => person.role === 'TECHNICIAN')
              .map((person) => (
                <MenuItem key={person.id} value={person.id}>
                  {person.name}
                </MenuItem>
              ))}
          </TextField>
          {assign.error ? (
            <Box sx={{ mt: 2 }}>
              <ErrorView error={assign.error} />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            disabled={!technicianId || assign.isPending}
            onClick={() => assign.mutate(work)}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography>{value}</Typography>
    </Grid>
  );
}
