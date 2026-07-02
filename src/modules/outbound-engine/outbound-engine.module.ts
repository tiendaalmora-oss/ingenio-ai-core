import { Module } from '@nestjs/common';
import { WahaAdapterService } from './services/waha-adapter.service';
import { OutboundListenerService } from './services/outbound-listener.service';

@Module({
  providers: [WahaAdapterService, OutboundListenerService],
})
export class OutboundEngineModule {}
