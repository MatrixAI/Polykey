class RPCErrorEvent extends Event {
  public detail: Error;
  constructor(
    options: EventInit & {
      detail: Error;
    },
  ) {
    super('error', options);
    this.detail = options.detail;
  }
}

export { RPCErrorEvent };
