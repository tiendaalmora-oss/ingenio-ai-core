import { Module } from '@nestjs/common';
import { BusinessStudioController } from './business-studio.controller';
import { BusinessStudioService } from './business-studio.service';
import { DatabaseModule } from '../../shared/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BusinessStudioController],
  providers: [BusinessStudioService],
})
export class BusinessStudioModule {}
