import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/requests.log' }),
  ],
});

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const { method, url, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    logger.info('HTTP Request', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip: ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      contentLength: res.get('content-length'),
    });
  });

  next();
};
