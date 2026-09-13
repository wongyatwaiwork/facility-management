export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly params?: Record<string, string | number>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const unauthorized = () => new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
export const forbidden = () => new AppError(403, 'FORBIDDEN', 'Permission denied');
export const notFound = (entity: string) =>
  new AppError(404, 'NOT_FOUND', `${entity} was not found`, { entity });
