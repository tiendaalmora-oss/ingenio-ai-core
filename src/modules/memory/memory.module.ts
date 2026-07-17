import { Module } from '@nestjs/common';
import { MemoryController } from './memory.controller';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MemoryController],
})
export class MemoryModule {}
