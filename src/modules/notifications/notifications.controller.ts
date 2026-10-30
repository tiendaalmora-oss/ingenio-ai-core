import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';

@Controller('notifications/push')
export class NotificationsController {
  constructor(private readonly pushService: PushNotificationService) {}

  @Get('public-key')
  getPublicKey() {
    return this.pushService.getPublicKey();
  }

  @Post('subscribe')
  async subscribe(
    @Body()
    body: {
      endpoint: string;
      p256dh: string;
      auth: string;
      tenantId?: string | null;
      role?: string;
      device?: string;
    },
  ) {
    if (!body.endpoint || !body.p256dh || !body.auth) {
      throw new BadRequestException('Faltan datos de suscripción push (endpoint, p256dh o auth)');
    }
    return this.pushService.saveSubscription(body);
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() body: { endpoint: string }) {
    if (!body.endpoint) {
      throw new BadRequestException('Endpoint requerido');
    }
    return this.pushService.removeSubscription(body.endpoint);
  }

  @Post('test')
  async testPush(@Body() body: { endpoint: string }) {
    if (!body.endpoint) {
      throw new BadRequestException('Endpoint requerido');
    }
    return this.pushService.sendTestPush(body.endpoint);
  }
}
