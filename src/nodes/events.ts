class NodeConnectionDestroyEvent extends Event {
  constructor(options?: EventInit) {
    super('destroy', options);
  }
}

export { NodeConnectionDestroyEvent };
