"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockEventBus = void 0;
class MockEventBus {
    publishedEvents = [];
    publish(event) {
        this.publishedEvents.push(event);
    }
    async publishAsync(event) {
        this.publishedEvents.push(event);
    }
    getAll() {
        return [...this.publishedEvents];
    }
    getPublished(type) {
        return this.publishedEvents.filter((e) => e.type === type);
    }
    getLastPublished() {
        return this.publishedEvents[this.publishedEvents.length - 1];
    }
    get count() {
        return this.publishedEvents.length;
    }
    clear() {
        this.publishedEvents.length = 0;
    }
}
exports.MockEventBus = MockEventBus;
//# sourceMappingURL=mock-event-bus.js.map