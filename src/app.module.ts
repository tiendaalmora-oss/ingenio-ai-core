import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrmModule } from './modules/crm/crm.module';
import { FakeModule } from './modules/fake/fake.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { LlmOrchestratorModule } from './modules/llm-orchestrator/llm-orchestrator.module';
import { OutboundEngineModule } from './modules/outbound-engine/outbound-engine.module';
import { SkillEngineModule } from './modules/skill-engine/skill-engine.module';
import { DatabaseModule } from './shared/database/database.module';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),
    DatabaseModule,
    CrmModule,
    ConversationModule,
    LlmOrchestratorModule,
    OutboundEngineModule,
    SkillEngineModule,
    FakeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
