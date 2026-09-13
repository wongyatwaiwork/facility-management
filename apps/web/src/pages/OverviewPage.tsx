import {
  ArrowForward,
  CheckCircleOutline,
  Engineering,
  FactCheck,
  LockOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function OverviewPage() {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 85% 15%, #17395b 0, #0b1220 42%)'
            : 'linear-gradient(135deg, #f7fafc 0%, #e8f0f5 100%)',
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: { xs: 6, md: 11 } }}
        >
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 1.4,
                bgcolor: 'secondary.main',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
              }}
            >
              <FactCheck />
            </Box>
            <Box>
              <Typography fontWeight={800}>{t('brand')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t('demoBadge')}
              </Typography>
            </Box>
          </Stack>
          <Button component={Link} to="/login" variant="contained" endIcon={<ArrowForward />}>
            {t('common.signIn')}
          </Button>
        </Stack>
        <Grid container spacing={5} alignItems="end">
          <Grid item xs={12} md={7}>
            <Chip
              label={t('overview.eyebrow')}
              color="secondary"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Typography variant="h1" component="h1">
              {t('overview.title')}
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mt: 3, maxWidth: 720, fontWeight: 400, lineHeight: 1.55 }}
            >
              {t('overview.summary')}
            </Typography>
            <Button
              component={Link}
              to="/login"
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              sx={{ mt: 4, px: 3 }}
            >
              {t('common.openApp')}
            </Button>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ bgcolor: 'background.paper' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <LockOutlined color="primary" />
                  <Typography variant="h3">{t('overview.credentials')}</Typography>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  <Typography>{t('overview.manager')}</Typography>
                  <Typography>{t('overview.technician')}</Typography>
                  <Typography>{t('overview.auditor')}</Typography>
                </Stack>
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('overview.password')}
                  </Typography>
                  <Typography fontFamily="monospace" fontWeight={700}>
                    Demo!2026
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Box sx={{ mt: { xs: 7, md: 11 } }}>
          <Typography variant="h2" sx={{ mb: 3 }}>
            {t('overview.workflows')}
          </Typography>
          <Grid container spacing={2}>
            {[t('overview.workflow1'), t('overview.workflow2'), t('overview.workflow3')].map(
              (flow, index) => (
                <Grid item xs={12} md={4} key={flow}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" spacing={1.5}>
                        <CheckCircleOutline color="secondary" />
                        <Box>
                          <Typography variant="overline" color="text.secondary">
                            0{index + 1}
                          </Typography>
                          <Typography>{flow}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ),
            )}
          </Grid>
        </Box>
        <Alert severity="warning" sx={{ mt: 5 }}>
          {t('overview.disclaimer')}
        </Alert>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{ mt: 4, p: 3, borderTop: 1, borderColor: 'divider' }}
        >
          <Engineering color="action" />
          <Typography color="text.secondary">{t('overview.architecture')}</Typography>
        </Stack>
      </Container>
    </Box>
  );
}
