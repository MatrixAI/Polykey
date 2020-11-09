import opentelemetry, { Tracer, metrics } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/node';
import { BatchSpanProcessor } from "@opentelemetry/tracing";
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { MeterProvider } from '@opentelemetry/metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import {getPort} from '../utils'

function getTracer(name: string) {
  const provider = new NodeTracerProvider();

  const exporter = new JaegerExporter({
    serviceName: "js-polykey",
    endpoint: 'http://localhost:14268/api/traces',
  })
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register();

  return opentelemetry.trace.getTracer(name);
}


// function getMeter() {
//   const exporter = new PrometheusExporter({}, () => {
//     console.log('prometheus scrape endpoint: http://localhost:9464/metrics');
//   });

//   const meter = new MeterProvider({
//     exporter,
//     interval: 3000,
//   }).getMeter('example-observer');

//   const cpuUsageMetric = meter.createValueObserver('cpu_usage_per_app', {
//     description: 'CPU',
//   });

//   const MemUsageMetric = meter.createValueObserver('mem_usage_per_app', {
//     description: 'Memory',
//   });

//   meter.createBatchObserver('metric_batch_observer', (observerBatchResult) => {
//     getSomeAsyncMetrics().then(metrics => {
//       observerBatchResult.observe({ app: 'myApp' }, [
//         cpuUsageMetric.observation(metrics.value1),
//         MemUsageMetric.observation(metrics.value2)
//       ]);
//     });
//   });

//   function getSomeAsyncMetrics(): Promise<{ value1: number, value2: number }> {
//     return new Promise((resolve, reject) => {
//       setTimeout(() => {
//         resolve({
//           value1: Math.random(),
//           value2: Math.random(),
//         });
//       }, 100)
//     });
//   }
// }


export {
  getTracer,
  // getMeter,
}
