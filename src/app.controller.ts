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
      version: '2.0.0',
      commit: 'crm-ai-2.0-high-precision',
      updatedAt: '2026-10-26T21:15:00Z',
    };
  }
}
