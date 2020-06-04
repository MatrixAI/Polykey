declare function actionRunner(fn: (...args: any[]) => Promise<void>): (...args: any[]) => Promise<void>;
/*******************************************/
declare enum PKMessageType {
    SUCCESS = 0,
    INFO = 1,
    WARNING = 2
}
declare function pkLogger(message: string, type?: PKMessageType): void;
export { actionRunner, PKMessageType, pkLogger };
