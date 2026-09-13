import { Search } from '@mui/icons-material';
import {
  Box,
  Card,
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
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '../api/client';
import type { Asset, PageMeta, Site } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { ErrorView, LoadingView } from '../components/StateViews';
import { StatusChip } from '../components/StatusChip';

export function AssetsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const siteId = params.get('siteId') ?? '';
  const page = Number(params.get('page') ?? 1);
  const query = useQuery({
    queryKey: ['assets', search, siteId, page],
    queryFn: () =>
      api<{ data: Asset[]; meta: PageMeta }>(
        `/assets?search=${encodeURIComponent(search)}&siteId=${encodeURIComponent(siteId)}&page=${page}`,
      ),
  });
  const sites = useQuery({ queryKey: ['sites'], queryFn: () => api<{ data: Site[] }>('/sites') });
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  return (
    <>
      <PageHeader title={t('assets.title')} subtitle={t('assets.subtitle')} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label={t('common.search')}
          value={search}
          onChange={(e) => change('search', e.target.value)}
          sx={{ minWidth: { sm: 320 } }}
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
          label={t('common.site')}
          value={siteId}
          onChange={(e) => change('siteId', e.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {sites.data?.data.map((site) => (
            <MenuItem key={site.id} value={site.id}>
              {site.name}
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
                  <TableCell>{t('assets.code')}</TableCell>
                  <TableCell>{t('common.asset')}</TableCell>
                  <TableCell>{t('common.site')}</TableCell>
                  <TableCell>{t('assets.category')}</TableCell>
                  <TableCell>{t('assets.criticality')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((asset) => (
                  <TableRow
                    key={asset.id}
                    hover
                    component={Link}
                    to={`/app/assets/${asset.id}`}
                    sx={{
                      textDecoration: 'none',
                      '& td': { color: 'text.primary' },
                      cursor: 'pointer',
                    }}
                  >
                    <TableCell>
                      <Typography fontFamily="monospace" fontWeight={700}>
                        {asset.internalCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {asset.name}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {asset.location.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{asset.site.name}</TableCell>
                    <TableCell>{asset.category.name}</TableCell>
                    <TableCell>
                      <StatusChip value={asset.criticality} />
                    </TableCell>
                    <TableCell>
                      <StatusChip value={asset.status} />
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
    </>
  );
}
