import { Add, Search } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '../api/client';
import type { Asset, PageMeta, Site, WorkOrder } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../components/PageHeader';
import { ErrorView, LoadingView } from '../components/StateViews';
import { StatusChip } from '../components/StatusChip';
import { formatDate } from '../i18n/format';
import { useSettings } from '../settings/SettingsProvider';

interface FormData {
  title: string;
  description: string;
  siteId: string;
  assetId: string;
  type: string;
  priority: string;
  dueDate: string;
  estimatedMinutes: string;
}

export function WorkOrdersPage() {
  const { t } = useTranslation();
  const { locale } = useSettings();
  const { user } = useAuth();
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1);
  const query = useQuery({
    queryKey: ['work-orders', search, status, page],
    queryFn: () =>
      api<{ data: WorkOrder[]; meta: PageMeta }>(
        `/work-orders?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&page=${page}`,
      ),
  });
  const sites = useQuery({ queryKey: ['sites'], queryFn: () => api<{ data: Site[] }>('/sites') });
  const assets = useQuery({
    queryKey: ['assets', 'picker'],
    queryFn: () => api<{ data: Asset[] }>('/assets?pageSize=100'),
  });
  const { control, handleSubmit, reset, watch } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      siteId: '',
      assetId: '',
      type: 'REACTIVE',
      priority: 'MEDIUM',
      dueDate: DateTime.now().setZone('Europe/Berlin').plus({ days: 1 }).toISODate() ?? '',
      estimatedMinutes: '',
    },
  });
  const selectedSite = watch('siteId');
  const create = useMutation({
    mutationFn: (values: FormData) =>
      api('/work-orders', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          assetId: values.assetId || undefined,
          estimatedMinutes: values.estimatedMinutes ? Number(values.estimatedMinutes) : undefined,
        }),
      }),
    onSuccess: () => {
      setOpen(false);
      reset();
      void client.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  const canCreate =
    user && ['ADMINISTRATOR', 'FACILITY_MANAGER', 'COORDINATOR'].includes(user.role);
  return (
    <>
      <PageHeader
        title={t('workOrders.title')}
        subtitle={t('workOrders.subtitle')}
        action={
          canCreate ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
              {t('workOrders.create')}
            </Button>
          ) : undefined
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label={t('common.search')}
          value={search}
          onChange={(e) => change('search', e.target.value)}
          sx={{ minWidth: { sm: 340 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          label={t('common.status')}
          value={status}
          onChange={(e) => change('status', e.target.value)}
          sx={{ minWidth: 190 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {[
            'OPEN',
            'TRIAGED',
            'ASSIGNED',
            'IN_PROGRESS',
            'ON_HOLD',
            'COMPLETED',
            'VERIFIED',
            'CLOSED',
            'CANCELLED',
          ].map((value) => (
            <MenuItem key={value} value={value}>
              {t(`status.${value}`)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
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
                  <TableCell>{t('workOrders.title')}</TableCell>
                  <TableCell>{t('common.site')}</TableCell>
                  <TableCell>{t('common.priority')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell>{t('common.due')}</TableCell>
                  <TableCell>{t('common.assignee')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((work) => (
                  <TableRow
                    key={work.id}
                    component={Link}
                    to={`/app/work-orders/${work.id}`}
                    hover
                    sx={{
                      textDecoration: 'none',
                      cursor: 'pointer',
                      '& td': { color: 'text.primary' },
                    }}
                  >
                    <TableCell>
                      <Typography fontFamily="monospace" fontWeight={700}>
                        {work.number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {work.title}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {work.asset?.internalCode}
                      </Typography>
                    </TableCell>
                    <TableCell>{work.site.name}</TableCell>
                    <TableCell>
                      <StatusChip value={work.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusChip value={work.status} />
                    </TableCell>
                    <TableCell>{formatDate(work.dueAt, locale, work.site.timezone)}</TableCell>
                    <TableCell>
                      {work.assignedTechnician?.name ?? work.contractor?.companyName ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Pagination
              count={query.data.meta.totalPages}
              page={page}
              onChange={(_e, value) => change('page', String(value))}
            />
          </Box>
        </Card>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <Box
          component="form"
          onSubmit={(event) => void handleSubmit((values) => create.mutate(values))(event)}
        >
          <DialogTitle>{t('workOrders.create')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Controller
                name="title"
                control={control}
                rules={{ required: true, minLength: 3 }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    required
                    label={t('workOrders.title')}
                    error={Boolean(fieldState.error)}
                  />
                )}
              />
              <Controller
                name="description"
                control={control}
                rules={{ required: true, minLength: 5 }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    required
                    multiline
                    minRows={3}
                    label={t('workOrders.description')}
                    error={Boolean(fieldState.error)}
                  />
                )}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                  name="siteId"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TextField {...field} select required fullWidth label={t('common.site')}>
                      {sites.data?.data.map((site) => (
                        <MenuItem key={site.id} value={site.id}>
                          {site.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  name="assetId"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select fullWidth label={t('common.asset')}>
                      <MenuItem value="">—</MenuItem>
                      {assets.data?.data
                        .filter(
                          (asset) =>
                            !selectedSite ||
                            asset.site?.name ===
                              sites.data?.data.find((site) => site.id === selectedSite)?.name,
                        )
                        .map((asset) => (
                          <MenuItem key={asset.id} value={asset.id}>
                            {asset.internalCode} · {asset.name}
                          </MenuItem>
                        ))}
                    </TextField>
                  )}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select fullWidth label={t('workOrders.type')}>
                      {['REACTIVE', 'PREVENTIVE', 'INSPECTION_FOLLOW_UP', 'OTHER'].map((value) => (
                        <MenuItem key={value} value={value}>
                          {t(`status.${value}`)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select fullWidth label={t('common.priority')}>
                      {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => (
                        <MenuItem key={value} value={value}>
                          {t(`status.${value}`)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                  name="dueDate"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      fullWidth
                      label={t('common.due')}
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
                <Controller
                  name="estimatedMinutes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      fullWidth
                      label={t('workOrders.estimate')}
                    />
                  )}
                />
              </Stack>
              {create.error ? <ErrorView error={create.error} /> : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={create.isPending}>
              {t('common.create')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}

import React from 'react';
