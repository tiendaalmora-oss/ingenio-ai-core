import { Controller as NestController, Get as NestGet } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FakeEventTriggered } from '../events/out/fake.event';

@NestController('test')
export class FakeController {
  constructor(private eventEmitter: EventEmitter2) {}

  @NestGet('trigger')
  triggerEvent() {
    const event = new FakeEventTriggered('tenant-1', 'Prueba de Aislamiento Estructural Exitosa', Date.now());
    this.eventEmitter.emit('fake.event.triggered', event);
    return { status: 'Event Emitted', eventId: event.eventId };
  }
}
