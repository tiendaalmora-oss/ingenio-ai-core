import { Module } from '@nestjs/common';
import { ToolCallListenerService } from './services/tool-call-listener.service';

@Module({
  providers: [ToolCallListenerService],
})
export class SkillEngineModule {}
