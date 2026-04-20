import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ExcelDiffService } from './excel-diff.service';

@Controller('public/tools/excel-diff')
export class ExcelDiffController {
  constructor(private readonly excelDiff: ExcelDiffService) {}

  @Post('preview')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'fileA', maxCount: 1 },
        { name: 'fileB', maxCount: 1 },
      ],
      { limits: { fileSize: 10 * 1024 * 1024 } },
    ),
  )
  async preview(
    @UploadedFiles()
    files: {
      fileA?: Array<{ buffer: Buffer; originalname: string }>;
      fileB?: Array<{ buffer: Buffer; originalname: string }>;
    },
    @Body()
    body: { keyColumn?: string; sheetIndex?: string; headerRow?: string },
  ) {
    const fileA = files.fileA?.[0]?.buffer;
    const fileB = files.fileB?.[0]?.buffer;
    if (!fileA || !fileB) {
      throw new BadRequestException('fileA and fileB are required');
    }
    const sheetIndex = body.sheetIndex ? Number(body.sheetIndex) : undefined;
    const headerRow = body.headerRow ? Number(body.headerRow) : undefined;

    return this.excelDiff.preview({
      fileA,
      fileB,
      keyColumn: body.keyColumn,
      sheetIndex,
      headerRow,
    });
  }

  @Post('download')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'fileA', maxCount: 1 },
        { name: 'fileB', maxCount: 1 },
      ],
      { limits: { fileSize: 10 * 1024 * 1024 } },
    ),
  )
  async download(
    @UploadedFiles()
    files: {
      fileA?: Array<{ buffer: Buffer; originalname: string }>;
      fileB?: Array<{ buffer: Buffer; originalname: string }>;
    },
    @Body()
    body: { keyColumn?: string; sheetIndex?: string; headerRow?: string },
    @Res() res: Response,
  ) {
    const fileA = files.fileA?.[0]?.buffer;
    const fileB = files.fileB?.[0]?.buffer;
    if (!fileA || !fileB) {
      throw new BadRequestException('fileA and fileB are required');
    }
    const sheetIndex = body.sheetIndex ? Number(body.sheetIndex) : undefined;
    const headerRow = body.headerRow ? Number(body.headerRow) : undefined;

    const result = await this.excelDiff.download({
      fileA,
      fileB,
      keyColumn: body.keyColumn,
      sheetIndex,
      headerRow,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    res.send(result.buffer);
  }
}
