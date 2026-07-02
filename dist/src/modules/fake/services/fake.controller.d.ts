import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class FakeController {
    private eventEmitter;
    constructor(eventEmitter: EventEmitter2);
    triggerEvent(): {
        status: string;
        eventId: string;
    };
}
