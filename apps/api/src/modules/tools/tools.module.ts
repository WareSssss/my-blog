import { Module } from '@nestjs/common';
import { ExcelDiffController } from './excel-diff/excel-diff.controller';
import { ExcelDiffService } from './excel-diff/excel-diff.service';
import { RtpService } from './rtp.service';

@Module({
  controllers: [ExcelDiffController],
  providers: [ExcelDiffService, RtpService],
  exports: [RtpService],
})
export class ToolsModule {}
