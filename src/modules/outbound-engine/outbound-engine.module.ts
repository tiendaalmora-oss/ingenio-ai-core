import { Module } from '@nestjs/common';
import { WahaAdapterService } from './services/waha-adapter.service';
import { OutboundListenerService } from './services/outbound-listener.service';
import { OutboundDispatcherService } from './services/outbound-dispatcher.service';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [WahaAdapterService, OutboundListenerService, OutboundDispatcherService],
  exports: [WahaAdapterService],
})
export class OutboundEngineModule {}
