import { Module } from '@nestjs/common';
import { WahaAdapterService } from './services/waha-adapter.service';
import { MetaChannelAdapterService } from './services/meta-channel-adapter.service';
import { OutboundListenerService } from './services/outbound-listener.service';
import { OutboundDispatcherService } from './services/outbound-dispatcher.service';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [WahaAdapterService, MetaChannelAdapterService, OutboundListenerService, OutboundDispatcherService],
  exports: [WahaAdapterService, MetaChannelAdapterService],
})
export class OutboundEngineModule {}
