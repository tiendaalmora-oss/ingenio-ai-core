import { Module } from '@nestjs/common';
import { FakeController } from './services/fake.controller';

@Module({
  controllers: [FakeController],
})
export class FakeModule {}
