import { NextFunction, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import logger from '../logger';

type IdSource = 'params' | 'query' | 'body';

/**
 * Exige uma sessão Clerk válida. Precisa rodar depois de `clerkMiddleware()`.
 * Responde 401 (sem redirect) quando não há usuário autenticado.
 */
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    return next();
  };
}

/**
 * Garante que o `userId` recebido na requisição (params/query/body) é o mesmo
 * usuário autenticado pelo Clerk. Deve rodar depois de `requireAuth()`.
 */
export function requireSelf(field: string = 'userId', source: IdSource = 'params') {
  return (req: Request, res: Response, next: NextFunction) => {
    const { userId: authUserId } = getAuth(req);

    if (!authUserId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    const container = req[source] as Record<string, unknown> | undefined;
    const requestedId = container?.[field];

    if (!requestedId) {
      return res.status(400).json({ error: `${field} is required` });
    }

    if (requestedId !== authUserId) {
      logger.warn({ authUserId, requestedId, path: req.path }, 'Ownership mismatch');
      return res.status(403).json({ error: 'forbidden' });
    }

    return next();
  };
}
