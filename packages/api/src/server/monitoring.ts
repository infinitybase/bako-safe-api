import * as Sentry from '@sentry/node';
import { Application } from 'express';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const { SENTRY_DNS, API_ENVIRONMENT } = process.env;

class Monitoring {
  static init() {
    if (API_ENVIRONMENT === 'development') return;

    Sentry.init({
      dsn: SENTRY_DNS,
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
    });
    Sentry.setTag('bako.env', API_ENVIRONMENT);
  }

  static setup(app: Application) {
    if (API_ENVIRONMENT === 'development') return;

    Sentry.setupExpressErrorHandler(app);
  }
}

export default Monitoring;
