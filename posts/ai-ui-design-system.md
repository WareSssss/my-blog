---
title: "这个 5 万 Star 的项目，让 AI 写出来的 UI 终于不丑了"
slug: "ai-ui-design-system"
date: "2026-04-17"
category: "tech"
tags:
  - GitHub
  - 开源项目
  - 设计系统
  - AI编程
  - 前端开发
  - 效率工具
excerpt: "66 个知名品牌设计系统的 Markdown 版本，复制到项目里 AI 直接生成对应风格的 UI。5 万 Star，MIT 协议，AI 时代的前端效果神器…"
readTimeMinutes: 7
status: "published"
---

## 背景

很多时候 AI 能写出可用的组件，但“好看”不容易。

## 解决方案

这里推荐一种实践：把成熟设计系统的规范喂给 AI，让生成的 UI 更贴近品牌。

### 你可以怎么做

1. 选一个设计系统
2. 拿到对应的规范文档
3. 让 AI 按规范生成组件

## 示例代码

```ts
type ButtonProps = {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function Button(props: ButtonProps) {
  return <button disabled={props.disabled}>Button</button>;
}
```
