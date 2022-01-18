type ResourceAcquire<Resource = void> = () => Promise<
  readonly [ResourceRelease, Resource?]
>;

type ResourceRelease = () => Promise<void>;

type Resources<T extends readonly ResourceAcquire<any>[]> = {
  [K in keyof T]: T[K] extends ResourceAcquire<infer R> ? R : never;
};

/**
 * Make sure to explicitly declare or cast `acquires` as a tuple using `[ResourceAcquire...]` or `as const`
 */
async function withF<
  ResourceAcquires extends
    | readonly [ResourceAcquire<unknown>]
    | readonly ResourceAcquire<unknown>[],
  T,
>(
  acquires: ResourceAcquires,
  f: (resources: Resources<ResourceAcquires>) => Promise<T>,
): Promise<T> {
  const releases: Array<ResourceRelease> = [];
  const resources: Array<unknown> = [];
  try {
    for (const acquire of acquires) {
      const [release, resource] = await acquire();
      releases.push(release);
      resources.push(resource);
    }
    return await f(resources as unknown as Resources<ResourceAcquires>);
  } finally {
    releases.reverse();
    for (const release of releases) {
      await release();
    }
  }
}

/**
 * Make sure to explicitly declare or cast `acquires` as a tuple using `[ResourceAcquire...]` or `as const`
 */
async function* withG<
  ResourceAcquires extends
    | readonly [ResourceAcquire<unknown>]
    | readonly ResourceAcquire<unknown>[],
  T = unknown,
  TReturn = any,
  TNext = unknown,
>(
  acquires: ResourceAcquires,
  g: (
    resources: Resources<ResourceAcquires>,
  ) => AsyncGenerator<T, TReturn, TNext>,
): AsyncGenerator<T, TReturn, TNext> {
  const releases: Array<ResourceRelease> = [];
  const resources: Array<unknown> = [];
  try {
    for (const acquire of acquires) {
      const [release, resource] = await acquire();
      releases.push(release);
      resources.push(resource);
    }
    return yield* g(resources as unknown as Resources<ResourceAcquires>);
  } finally {
    releases.reverse();
    for (const release of releases) {
      await release();
    }
  }
}

export { withF, withG };

export type { ResourceAcquire, ResourceRelease };
