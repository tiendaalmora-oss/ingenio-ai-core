import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { PushNotificationService } from './push-notification.service';
import { DatabaseModule } from '../../shared/database/database.module';
import { PrismaService } from '../../shared/database/prisma.service';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
  providers: [PushNotificationService, PrismaService],
  exports: [PushNotificationService],
})
export class NotificationsModule {}
