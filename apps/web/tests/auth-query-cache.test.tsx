// @vitest-environment jsdom

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../src/api/client';
import type { Site, User } from '../src/api/types';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';

vi.mock('../src/settings/SettingsProvider', () => ({
  useSettings: () => ({ hydrate: vi.fn() }),
}));

vi.mock('../src/api/client', () => ({ api: vi.fn() }));

const users = {
  manager: {
    id: 'manager',
    email: 'manager@example.com',
    name: 'Manager',
    role: 'FACILITY_MANAGER',
  },
  auditor: {
    id: 'auditor',
    email: 'auditor@example.com',
    name: 'Auditor',
    role: 'AUDITOR',
  },
} satisfies Record<string, User>;

const sites = [
  {
    id: 'berlin',
    code: 'BER',
    name: 'Berlin',
    city: 'Berlin',
    region: 'Berlin',
    timezone: 'Europe/Berlin',
  },
  {
    id: 'hamburg',
    code: 'HAM',
    name: 'Hamburg',
    city: 'Hamburg',
    region: 'Hamburg',
    timezone: 'Europe/Berlin',
  },
  {
    id: 'frankfurt',
    code: 'FRA',
    name: 'Frankfurt',
    city: 'Frankfurt',
    region: 'Hesse',
    timezone: 'Europe/Berlin',
  },
] satisfies Site[];

function FacilityCount() {
  const { loading, login, logout, user } = useAuth();
  const query = useQuery({
    queryKey: ['sites', ''],
    queryFn: () => api<{ data: Site[] }>('/sites'),
    enabled: Boolean(user),
  });

  if (loading) return <div>Restoring session</div>;
  if (!user) {
    return (
      <>
        <button onClick={() => void login(users.manager.email, 'password')}>Login manager</button>
        <button onClick={() => void login(users.auditor.email, 'password')}>Login auditor</button>
      </>
    );
  }

  return (
    <>
      <output aria-label="facility count">{query.data?.data.length ?? 'loading'}</output>
      <button onClick={() => void logout()}>Logout</button>
    </>
  );
}

describe('AuthProvider query cache isolation', () => {
  afterEach(() => vi.clearAllMocks());

  it('loads manager, auditor, then manager facilities without reusing another user cache', async () => {
    let currentUser: User | null = null;
    vi.mocked(api).mockImplementation((path, init) => {
      if (path === '/auth/login') {
        if (typeof init?.body !== 'string') throw new Error('Expected a JSON login body');
        const email = JSON.parse(init.body).email as string;
        currentUser = email === users.manager.email ? users.manager : users.auditor;
        return Promise.resolve({ user: currentUser });
      }
      if (path === '/auth/logout') {
        currentUser = null;
        return Promise.resolve(undefined);
      }
      if (path === '/auth/me') {
        if (!currentUser) return Promise.reject(new Error('Unauthenticated'));
        return Promise.resolve({ user: currentUser });
      }
      if (path === '/sites') {
        return Promise.resolve({
          data: currentUser?.id === users.manager.id ? sites : sites.slice(0, 2),
        });
      }
      return Promise.reject(new Error(`Unexpected API path: ${path}`));
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FacilityCount />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await screen.findByRole('button', { name: 'Login manager' });

    fireEvent.click(screen.getByRole('button', { name: 'Login manager' }));
    await waitFor(() => expect(screen.getByLabelText('facility count').textContent).toBe('3'));

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await screen.findByRole('button', { name: 'Login auditor' });
    fireEvent.click(screen.getByRole('button', { name: 'Login auditor' }));
    await waitFor(() => expect(screen.getByLabelText('facility count').textContent).toBe('2'));

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await screen.findByRole('button', { name: 'Login manager' });
    fireEvent.click(screen.getByRole('button', { name: 'Login manager' }));
    await waitFor(() => expect(screen.getByLabelText('facility count').textContent).toBe('3'));
  });
});
