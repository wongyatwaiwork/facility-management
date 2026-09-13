import { Apartment, Assignment, Checklist, Inventory2, LocationCity } from '@mui/icons-material';
import {
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import type { Site } from '../api/types';
import { ErrorView, LoadingView } from '../components/StateViews';
import { PageHeader } from '../components/PageHeader';

export function FacilitiesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['sites', search],
    queryFn: () => api<{ data: Site[] }>(`/sites?search=${encodeURIComponent(search)}`),
  });
  if (query.isLoading) return <LoadingView />;
  if (query.error || !query.data)
    return <ErrorView error={query.error} retry={() => void query.refetch()} />;
  return (
    <>
      <PageHeader title={t('facilities.title')} subtitle={t('facilities.subtitle')} />
      <TextField
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        label={t('common.search')}
        sx={{ mb: 3, width: { xs: '100%', sm: 360 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LocationCity />
            </InputAdornment>
          ),
        }}
      />
      <Grid container spacing={2}>
        {query.data.data.map((site) => (
          <Grid item xs={12} lg={4} key={site.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Apartment color="primary" />
                  <BoxTitle code={site.code} name={site.name} />
                </Stack>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {site.city}, {site.region} · {site.timezone}
                </Typography>
                <Grid container spacing={1.5} sx={{ mt: 2 }}>
                  <Count
                    icon={<Apartment />}
                    value={site._count?.buildings ?? 0}
                    label={t('facilities.buildings')}
                  />
                  <Count
                    icon={<Inventory2 />}
                    value={site._count?.assets ?? 0}
                    label={t('facilities.assets')}
                  />
                  <Count
                    icon={<Assignment />}
                    value={site._count?.workOrders ?? 0}
                    label={t('facilities.workOrders')}
                  />
                  <Count
                    icon={<Checklist />}
                    value={site._count?.inspections ?? 0}
                    label={t('facilities.inspections')}
                  />
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}

function BoxTitle({ code, name }: { code: string; name: string }) {
  return (
    <div>
      <Typography variant="overline" color="text.secondary">
        {code}
      </Typography>
      <Typography variant="h3">{name}</Typography>
    </div>
  );
}
function Count({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <Grid item xs={6}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ p: 1.3, bgcolor: 'action.hover', borderRadius: 1 }}
      >
        {icon}
        <div>
          <Typography fontWeight={800}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </div>
      </Stack>
    </Grid>
  );
}
