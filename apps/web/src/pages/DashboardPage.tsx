import { AssignmentLate, CalendarMonth, FactCheck, Schedule } from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { api } from '../api/client';
import type { WorkOrder } from '../api/types';
import { useSettings } from '../settings/SettingsProvider';
import { formatDate } from '../i18n/format';
import { ErrorView, LoadingView } from '../components/StateViews';
import { PageHeader } from '../components/PageHeader';
import { StatusChip } from '../components/StatusChip';

interface Summary {
  overdueCount: number;
  dueSoonCount: number;
  inspectionDueCount: number;
  inspectionOverdueCount: number;
  openByStatus: Array<{ status: string; _count: number }>;
  openByPriority: Array<{ priority: string; _count: number }>;
  recentWork: WorkOrder[];
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
    actor?: { name: string };
  }>;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { locale } = useSettings();
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<{ data: Summary }>('/dashboard/summary'),
  });
  if (query.isLoading) return <LoadingView />;
  if (query.error || !query.data)
    return <ErrorView error={query.error} retry={() => void query.refetch()} />;
  const data = query.data.data;
  const metrics = [
    {
      label: t('dashboard.overdue'),
      value: data.overdueCount,
      icon: <AssignmentLate color="error" />,
      tone: 'error.main',
    },
    {
      label: t('dashboard.dueSoon'),
      value: data.dueSoonCount,
      icon: <Schedule color="primary" />,
      tone: 'primary.main',
    },
    {
      label: t('dashboard.inspectionsDue'),
      value: data.inspectionDueCount,
      icon: <CalendarMonth color="secondary" />,
      tone: 'secondary.main',
    },
    {
      label: t('dashboard.inspectionsOverdue'),
      value: data.inspectionOverdueCount,
      icon: <FactCheck color="warning" />,
      tone: 'warning.main',
    },
  ];
  const maxStatus = Math.max(1, ...data.openByStatus.map((item) => item._count));
  return (
    <>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
      <Grid container spacing={2}>
        {metrics.map((metric) => (
          <Grid item xs={12} sm={6} lg={3} key={metric.label}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography color="text.secondary" fontSize="0.9rem">
                      {metric.label}
                    </Typography>
                    <Typography variant="h3" sx={{ fontSize: '2.2rem', mt: 0.5 }}>
                      {metric.value}
                    </Typography>
                  </Box>
                  {metric.icon}
                </Stack>
                <Box sx={{ height: 3, bgcolor: metric.tone, mt: 2, borderRadius: 2 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h3" sx={{ mb: 2 }}>
                {t('dashboard.byStatus')}
              </Typography>
              <Stack spacing={2}>
                {data.openByStatus.map((item) => (
                  <Box key={item.status}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.7 }}>
                      <StatusChip value={item.status} />
                      <Typography fontWeight={700}>{item._count}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(item._count / maxStatus) * 100}
                      sx={{ height: 7, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Typography variant="h3">{t('dashboard.recentWork')}</Typography>
              <List>
                {data.recentWork.map((work) => (
                  <ListItem
                    key={work.id}
                    component={Link}
                    to={`/app/work-orders/${work.id}`}
                    divider
                    sx={{ color: 'inherit', textDecoration: 'none', px: 0 }}
                    secondaryAction={<StatusChip value={work.status} />}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1}>
                          <Typography fontFamily="monospace" fontWeight={700}>
                            {work.number}
                          </Typography>
                          <Typography>{work.title}</Typography>
                        </Stack>
                      }
                      secondary={`${work.site.name} · ${t('common.due')} ${formatDate(
                        work.dueAt,
                        locale,
                        work.site.timezone,
                      )}`}
                    />
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
