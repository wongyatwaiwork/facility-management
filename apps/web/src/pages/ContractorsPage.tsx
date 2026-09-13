import { Business, CheckCircle, DoNotDisturb } from '@mui/icons-material';
import { Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ErrorView, LoadingView } from '../components/StateViews';

interface Contractor {
  id: string;
  companyName: string;
  email: string;
  phone?: string;
  serviceCategories: string[];
  isActive: boolean;
  approvedForDemo: boolean;
  sites: Array<{ site: { name: string } }>;
  _count: { workOrders: number };
}

export function ContractorsPage() {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['contractors'],
    queryFn: () => api<{ data: Contractor[] }>('/contractors'),
  });
  return (
    <>
      <PageHeader title={t('contractors.title')} subtitle={t('contractors.subtitle')} />
      {query.isLoading ? (
        <LoadingView />
      ) : query.error || !query.data ? (
        <ErrorView error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Grid container spacing={2}>
          {query.data.data.map((contractor) => (
            <Grid item xs={12} md={6} xl={4} key={contractor.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Business color="primary" />
                    <Chip
                      icon={contractor.isActive ? <CheckCircle /> : <DoNotDisturb />}
                      color={contractor.isActive ? 'success' : 'default'}
                      label={
                        contractor.isActive ? t('contractors.active') : t('contractors.inactive')
                      }
                      variant="outlined"
                    />
                  </Stack>
                  <Typography variant="h3" sx={{ mt: 2 }}>
                    {contractor.companyName}
                  </Typography>
                  <Typography color="text.secondary">{contractor.email}</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                    {contractor.serviceCategories.map((category) => (
                      <Chip key={category} label={category} size="small" />
                    ))}
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    {contractor.sites.map((entry) => entry.site.name).join(' · ')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('contractors.workHistory')}: {contractor._count.workOrders}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
