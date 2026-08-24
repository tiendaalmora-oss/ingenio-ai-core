import { Module } from '@nestjs/common';
import { ToolCallListenerService } from './services/tool-call-listener.service';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ToolCallListenerService],
})
export class SkillEngineModule {}
