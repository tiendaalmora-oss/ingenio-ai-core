import { EventEmitter2 } from '@nestjs/event-emitter';
import { IEvent } from './interfaces/event.interface';
import { IEventBus } from './interfaces/event-bus.interface';
export declare class EventBusService implements IEventBus {
    private readonly emitter;
    private readonly logger;
    constructor(emitter: EventEmitter2);
    publish<T>(event: IEvent<T>): void;
    publishAsync<T>(event: IEvent<T>): Promise<void>;
    private logPublished;
}
