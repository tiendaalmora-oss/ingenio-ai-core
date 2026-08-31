import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrmModule } from './modules/crm/crm.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { LlmOrchestratorModule } from './modules/llm-orchestrator/llm-orchestrator.module';
import { OutboundEngineModule } from './modules/outbound-engine/outbound-engine.module';
import { SkillEngineModule } from './modules/skill-engine/skill-engine.module';
import { DatabaseModule } from './shared/database/database.module';
import { BusinessStudioModule } from './modules/business-studio/business-studio.module';
import { HealthModule } from './modules/health/health.module';
import { FunnelEngineModule } from './modules/funnel-engine/funnel-engine.module';
import { MemoryModule } from './modules/memory/memory.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { EventBusModule } from './shared/event-bus';
import { ScheduleModule } from '@nestjs/schedule';
import { FollowUpEngineModule } from './modules/follow-up-engine/follow-up-engine.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MediaProcessingModule } from './modules/media-processing/media-processing.module';
import { AgencyModule } from './modules/agency/agency.module';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),
    EventBusModule,
    DatabaseModule,
    CrmModule,
    ConversationModule,
    MediaProcessingModule,
    FunnelEngineModule,
    LlmOrchestratorModule,
    OutboundEngineModule,
    SkillEngineModule,
    BusinessStudioModule,
    HealthModule,
    MemoryModule,
    TenantModule,
    ScheduleModule.forRoot(),
    FollowUpEngineModule,
    SettingsModule,
    AnalyticsModule,
    AgencyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

