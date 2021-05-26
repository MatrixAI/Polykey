import type {
  ServiceDefinition,
  UntypedServiceImplementation,
} from '@grpc/grpc-js';

type Services = Array<
  [
    ServiceDefinition<UntypedServiceImplementation>,
    UntypedServiceImplementation,
  ]
>;

export type { Services };
