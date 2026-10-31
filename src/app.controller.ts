import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'ingenio-ai-core' };
  }

  @Get('version')
  getVersion() {
    return {
      status: 'ok',
      service: 'ingenio-ai-core',
      version: '2.1.1',
      commit: '860e400-live-push-and-sync',
      updatedAt: '2026-10-31T11:45:00Z',
    };
  }
}
