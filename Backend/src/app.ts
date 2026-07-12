import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { errorHandler, notFoundHandler } from '@/core/errors/errorHandler';
import { authRoutes } from '@/modules/auth';
import { departmentRoutes } from '@/modules/departments';
import { assetCategoryRoutes } from '@/modules/asset-categories';
import { employeeRoutes } from '@/modules/employees';
import { assetRoutes } from '@/modules/assets';
import { activityLogRoutes, registerActivityLogListeners } from '@/modules/activity-logs';
import { maintenanceRoutes } from '@/modules/maintenance';
import { auditRoutes } from '@/modules/audits';
import { notificationRoutes, registerNotificationListeners } from '@/modules/notifications';
import { approvalRoutes, registerApprovalListeners } from '@/modules/approvals';
import { sendSuccess } from '@/utils/response';
import { startJobs } from '@/jobs';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => {
    sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/departments', departmentRoutes);
  app.use('/api/v1/asset-categories', assetCategoryRoutes);
  app.use('/api/v1/employees', employeeRoutes);
  app.use('/api/v1/assets', assetRoutes);
  app.use('/api/v1/activity-logs', activityLogRoutes);
  app.use('/api/v1/maintenance', maintenanceRoutes);
  app.use('/api/v1/audits', auditRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/approvals', approvalRoutes);

  registerActivityLogListeners();
  registerNotificationListeners();
  registerApprovalListeners();
  startJobs();

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
