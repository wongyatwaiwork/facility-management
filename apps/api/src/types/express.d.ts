import type { Role, ThemePreference } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      authUser?: {
        id: string;
        email: string;
        name: string;
        role: Role;
        locale: string;
        theme: ThemePreference;
        siteIds: string[];
      };
      sessionId?: string;
    }
  }
}

export {};
