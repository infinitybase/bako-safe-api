import { NodeSDK } from '@opentelemetry/sdk-node';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { TypeormInstrumentation } from '@opentelemetry/instrumentation-typeorm';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

const traceExporter = new OTLPTraceExporter({
  url: 'https://api.axiom.co/v1/traces',
  headers: {
    Authorization: `Bearer ${process.env.AXIOM_API_KEY}`,
    'X-Axiom-Dataset': 'bako',
  },
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    'service.name': 'api',
    'service.environment': process.env.NODE_ENV || 'development',
  }),
  spanProcessors: [new BatchSpanProcessor(traceExporter)],
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new TypeormInstrumentation(),
  ],
});

if (process.env.NODE_ENV != 'development') {
  console.log('[TELEMETRY] Starting');
  sdk.start();
}
