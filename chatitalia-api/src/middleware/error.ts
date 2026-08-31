import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

// 404 para rotas não registradas (vem depois de todas as rotas).
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: 'not found', path: req.path });
}

// Handler de erro global do Express. PRECISA dos 4 parâmetros e ser o último `app.use`.
// Com `express-async-errors`, erros lançados/rejeitados em handlers async caem aqui
// em vez de derrubar o processo.
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = Number(err?.status ?? err?.statusCode) || 500;

  logger.error(
    {
      err: { message: err?.message, stack: err?.stack },
      status,
      method: req.method,
      path: req.originalUrl,
    },
    'Erro não tratado em request',
  );

  if (res.headersSent) return;
  res.status(status).json({
    error: status >= 500 ? 'internal server error' : (err?.message || 'error'),
  });
}

// Rede de segurança para erros fora do ciclo de request.
export function installProcessGuards() {
  process.on('unhandledRejection', (reason: any) => {
    logger.error(
      { reason: reason?.message ?? String(reason), stack: reason?.stack },
      'unhandledRejection (não derruba o processo)',
    );
  });

  process.on('uncaughtException', (err: any) => {
    logger.error(
      { err: { message: err?.message, stack: err?.stack } },
      'uncaughtException — encerrando para o Docker reiniciar',
    );
    // Estado do processo pode estar inconsistente: sai e deixa o restart policy agir.
    process.exit(1);
  });
}
