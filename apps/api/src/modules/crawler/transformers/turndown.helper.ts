import { Injectable } from '@nestjs/common';
import TurndownService = require('turndown');
// @ts-ignore
import * as turndownPluginGfm from 'turndown-plugin-gfm';

@Injectable()
export class TurndownHelper {
  private readonly turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });

    // 使用 GFM 插件支持表格、任务列表等
    this.turndown.use(turndownPluginGfm.gfm);

    // 自定义规则：过滤掉不需要的标签或处理特定格式
    this.turndown.addRule('remove-scripts', {
      filter: ['script', 'style', 'noscript', 'iframe'],
      replacement: () => '',
    });
  }

  /**
   * 将 HTML 转换为 Markdown
   */
  toMarkdown(html: string): string {
    if (!html) return '';
    return this.turndown.turndown(html);
  }
}
