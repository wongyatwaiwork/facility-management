import { ArrowBack, Assignment, Build, Checklist } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api/client';
import type { Asset } from '../api/types';
import { formatDate } from '../i18n/format';
import { useSettings } from '../settings/SettingsProvider';
import { ErrorView, LoadingView } from '../components/StateViews';
import { StatusChip } from '../components/StatusChip';

export function AssetDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { locale } = useSettings();
  const query = useQuery({
    queryKey: ['asset', id],
    queryFn: () => api<{ data: Asset }>(`/assets/${id}`),
  });
  if (query.isLoading) return <LoadingView />;
  if (query.error || !query.data) return <ErrorView error={query.error} />;
  const asset = query.data.data;
  return (
    <>
      <Button component={Link} to="/app/assets" startIcon={<ArrowBack />} sx={{ mb: 2 }}>
        {t('assets.title')}
      </Button>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            {asset.internalCode}
          </Typography>
          <Typography variant="h2" component="h1">
            {asset.name}
          </Typography>
          <Typography color="text.secondary">
            {asset.site.name} · {asset.location.name}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <StatusChip value={asset.status} size="medium" />
          <StatusChip value={asset.criticality} size="medium" />
        </Stack>
      </Stack>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h3" sx={{ mb: 2 }}>
                {t('common.asset')}
              </Typography>
              {[
                ['assets.category', asset.category.name],
                ['assets.team', asset.responsibleTeam],
                ['Manufacturer', asset.manufacturer ?? '—'],
                ['Model', asset.model ?? '—'],
              ].map(([label, value]) => (
                <Box key={label} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t(label, label)}
                  </Typography>
                  <Typography>{value}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h3">{t('assets.history')}</Typography>
              <Divider sx={{ my: 2 }} />
              <List disablePadding>
                {asset.workOrders?.map((work) => (
                  <ListItem
                    key={work.id}
                    component={Link}
                    to={`/app/work-orders/${work.id}`}
                    sx={{ px: 0, textDecoration: 'none', color: 'inherit' }}
                    divider
                  >
                    <ListItemIcon>
                      <Assignment color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${work.number} · ${work.title}`}
                      secondary={formatDate(work.dueAt, locale)}
                    />
                    <StatusChip value={work.status} />
                  </ListItem>
                ))}
                {asset.preventivePlans?.map((plan) => (
                  <ListItem key={plan.id} sx={{ px: 0 }} divider>
                    <ListItemIcon>
                      <Build color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={plan.title}
                      secondary={`${t('preventive.nextDue')}: ${formatDate(plan.nextDueAt, locale)}`}
                    />
                    <Chip label={t(`status.${plan.recurrence}`, plan.recurrence)} size="small" />
                  </ListItem>
                ))}
                {asset.inspections?.map((inspection) => (
                  <ListItem
                    key={inspection.id}
                    component={Link}
                    to={`/app/inspections/${inspection.id}`}
                    sx={{ px: 0, textDecoration: 'none', color: 'inherit' }}
                    divider
                  >
                    <ListItemIcon>
                      <Checklist color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={inspection.number}
                      secondary={formatDate(inspection.dueAt, locale)}
                    />
                    <StatusChip value={inspection.status} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
