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
      version: '1.2.0',
      commit: '012c834-fix-pause-and-waha',
      updatedAt: '2026-10-26T19:45:00Z',
    };
  }
}
