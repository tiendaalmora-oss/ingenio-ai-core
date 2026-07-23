import { Module, Global } from '@nestjs/common';
import { TenantResolverService } from './services/tenant-resolver.service';
import { DebugTenantController } from './debug.controller';

@Global()
@Module({
  controllers: [DebugTenantController],
  providers: [TenantResolverService],
  exports: [TenantResolverService],
})
export class TenantModule {}
