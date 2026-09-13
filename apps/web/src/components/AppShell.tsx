import { useState } from 'react';
import {
  Apartment,
  Assignment,
  Build,
  Checklist,
  Dashboard,
  FactCheck,
  Handyman,
  History,
  Inventory2,
  Language,
  Logout,
  Menu as MenuIcon,
  Palette,
} from '@mui/icons-material';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import type { Locale, Role, ThemePreference } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { useSettings } from '../settings/SettingsProvider';

const drawerWidth = 264;
const items: Array<{ path: string; key: string; icon: React.ReactNode; roles?: Role[] }> = [
  { path: '/app', key: 'dashboard', icon: <Dashboard /> },
  { path: '/app/facilities', key: 'facilities', icon: <Apartment /> },
  { path: '/app/assets', key: 'assets', icon: <Inventory2 /> },
  { path: '/app/work-orders', key: 'workOrders', icon: <Assignment /> },
  { path: '/app/preventive', key: 'preventive', icon: <Build /> },
  { path: '/app/inspections', key: 'inspections', icon: <Checklist /> },
  { path: '/app/contractors', key: 'contractors', icon: <Handyman /> },
  {
    path: '/app/audit',
    key: 'audit',
    icon: <History />,
    roles: ['ADMINISTRATOR', 'FACILITY_MANAGER', 'AUDITOR'],
  },
];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { locale, themePreference, setLocale, setThemePreference } = useSettings();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const navigate = useNavigate();

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#0e2740',
        color: '#f4f8fb',
      }}
    >
      <Box sx={{ px: 2.5, py: 2.4 }}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.2,
              bgcolor: '#df6f24',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <FactCheck fontSize="small" />
          </Box>
          <Box>
            <Typography fontWeight={750} lineHeight={1.15}>
              Musterwerk
            </Typography>
            <Typography variant="caption" sx={{ color: '#b9c9d8' }}>
              Facility Operations
            </Typography>
          </Box>
        </Stack>
        <Typography variant="caption" sx={{ display: 'block', color: '#f0b389', mt: 1.5 }}>
          {t('demoBadge')}
        </Typography>
      </Box>
      <Divider sx={{ borderColor: '#28425b' }} />
      <List sx={{ px: 1.2, py: 1.5, flex: 1 }}>
        {items
          .filter((item) => !item.roles || item.roles.includes(user!.role))
          .map((item) => (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              end={item.path === '/app'}
              selected={
                location.pathname === item.path ||
                (item.path !== '/app' && location.pathname.startsWith(`${item.path}/`))
              }
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 1,
                mb: 0.4,
                color: '#dce8f3',
                '&.Mui-selected': {
                  bgcolor: '#214666',
                  color: '#fff',
                  '&:hover': { bgcolor: '#285371' },
                },
                '&:hover': { bgcolor: '#183a57' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={t(`nav.${item.key}`)}
                primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: 600 }}
              />
            </ListItemButton>
          ))}
      </List>
      <Divider sx={{ borderColor: '#28425b' }} />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" fontWeight={650}>
          {user?.name}
        </Typography>
        <Typography variant="caption" sx={{ color: '#b9c9d8' }}>
          {user?.role.replaceAll('_', ' ')}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          ml: { md: `${drawerWidth}px` },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <IconButton
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <Language fontSize="small" color="action" />
          <FormControl size="small">
            <Select
              aria-label={t('common.language')}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              sx={{ minWidth: 92 }}
            >
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="de-DE">DE</MenuItem>
              <MenuItem value="zh-HK">繁中</MenuItem>
            </Select>
          </FormControl>
          <Palette fontSize="small" color="action" sx={{ display: { xs: 'none', sm: 'block' } }} />
          <FormControl size="small" sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Select
              aria-label={t('common.theme')}
              value={themePreference}
              onChange={(e) => setThemePreference(e.target.value as ThemePreference)}
            >
              <MenuItem value="SYSTEM">{t('common.system')}</MenuItem>
              <MenuItem value="LIGHT">{t('common.light')}</MenuItem>
              <MenuItem value="DARK">{t('common.dark')}</MenuItem>
            </Select>
          </FormControl>
          <IconButton
            aria-label={t('common.signOut')}
            onClick={() => void logout().then(() => navigate('/login'))}
          >
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={desktop ? 'permanent' : 'temporary'}
          open={desktop || mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 0 } }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, pt: 8, bgcolor: 'background.default' }}>
        <Box sx={{ p: { xs: 2, sm: 3, lg: 4 }, maxWidth: 1440, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
