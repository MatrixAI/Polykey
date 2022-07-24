class Timer {

  protected timer: ReturnType<typeof setTimeout>;
  public readonly timerP: Promise<void>;
  protected _timedOut: boolean;

}
