import { IEvent } from './event.interface';
export interface IEventBus {
    publish<T>(event: IEvent<T>): void;
    publishAsync<T>(event: IEvent<T>): Promise<void>;
}
export declare const EVENT_BUS_TOKEN: unique symbol;
