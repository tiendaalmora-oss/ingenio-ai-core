import { Module } from '@nestjs/common';
import { BusinessStudioController } from './business-studio.controller';
import { BusinessStudioService } from './business-studio.service';
import { DatabaseModule } from '../../shared/database/database.module';
import { KnowledgeBundleComposer } from './knowledge-bundle.composer';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BusinessStudioController],
  providers: [BusinessStudioService, KnowledgeBundleComposer, BootstrapService],
  exports: [BusinessStudioService],
})
export class BusinessStudioModule {}
