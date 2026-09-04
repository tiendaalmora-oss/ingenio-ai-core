import { IEvent } from '../interfaces/event.interface';
import { IEventBus } from '../interfaces/event-bus.interface';
export declare class MockEventBus implements IEventBus {
    private readonly publishedEvents;
    publish<T>(event: IEvent<T>): void;
    publishAsync<T>(event: IEvent<T>): Promise<void>;
    getAll(): IEvent[];
    getPublished(type: string): IEvent[];
    getLastPublished(): IEvent | undefined;
    get count(): number;
    clear(): void;
}
