import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useAuth } from '../auth/AuthProvider';

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export function LoginPage() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: 'manager@example.com', password: 'Demo!2026' },
  });
  if (user) return <Navigate to="/app" replace />;
  const from = (location.state as { from?: string } | null)?.from ?? '/app';
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Button component={Link} to="/" sx={{ mb: 2 }}>
          ← {t('nav.overview')}
        </Button>
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h2" component="h1">
              {t('login.title')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              {t('login.helper')}
            </Typography>
            {error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {t('login.invalid')}
              </Alert>
            ) : null}
            <Box
              component="form"
              onSubmit={(event) =>
                void handleSubmit(async (values) => {
                  setError(false);
                  try {
                    await login(values.email, values.password);
                    navigate(from, { replace: true });
                  } catch {
                    setError(true);
                  }
                })(event)
              }
            >
              <Stack spacing={2}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label={t('login.email')}
                      error={Boolean(fieldState.error)}
                      autoComplete="username"
                    />
                  )}
                />
                <Controller
                  name="password"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label={t('login.password')}
                      type="password"
                      error={Boolean(fieldState.error)}
                      autoComplete="current-password"
                    />
                  )}
                />
                <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
                  {t('common.signIn')}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
