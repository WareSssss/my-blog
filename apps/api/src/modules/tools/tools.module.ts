import { Module } from '@nestjs/common';
import { ExcelDiffController } from './excel-diff/excel-diff.controller';
import { ExcelDiffService } from './excel-diff/excel-diff.service';

@Module({
  controllers: [ExcelDiffController],
  providers: [ExcelDiffService],
})
export class ToolsModule {}
