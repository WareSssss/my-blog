import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { KbModule } from '../kb/kb.module';

@Module({
  imports: [KbModule],
  controllers: [AdminController],
})
export class AdminModule {}
