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
      version: '2.0.1',
      commit: '353754e-openrouter-routing-and-handoff-sales',
      updatedAt: '2026-10-27T23:35:00Z',
    };
  }
}
