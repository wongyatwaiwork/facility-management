import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function LoadingView() {
  const { t } = useTranslation();
  return (
    <Box role="status" sx={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress size={28} />
        <Typography sx={{ mt: 1 }}>{t('common.loading')}</Typography>
      </Box>
    </Box>
  );
}

export function ErrorView({ error, retry }: { error: unknown; retry?: () => void }) {
  const { t } = useTranslation();
  const code =
    typeof error === 'object' && error && 'code' in error ? String(error.code) : 'INTERNAL_ERROR';
  return (
    <Alert
      severity="error"
      action={
        retry ? (
          <Button color="inherit" onClick={retry}>
            {t('common.retry')}
          </Button>
        ) : undefined
      }
    >
      {t(`errors.${code}`, t('errors.INTERNAL_ERROR'))}
    </Alert>
  );
}
