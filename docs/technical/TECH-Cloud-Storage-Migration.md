# AI 博客云存储集成方案 (Cloudflare R2 零成本方案)

## 1. 业务背景

当前博客系统的图片转储功能 [oss-uploader.service.ts](file:///Users/wares/Desktop/Blog/apps/api/src/modules/crawler/transformers/oss-uploader.service.ts) 采用本地磁盘存储。在云端（如 Railway/Vercel）部署时，由于文件系统是非持久化的，会导致部署后图片丢失。

为了实现**零成本、高可用、持久化**的存储，我们选择 **Cloudflare R2** 作为最终方案。

---

## 2. 为什么选择 Cloudflare R2？

- **零成本启动**：每月前 10GB 存储免费。
- **免出口流量费**：访问图片完全不消耗带宽费用（这是阿里云 OSS 和 AWS S3 的主要开销点）。
- **S3 兼容**：可以使用标准的 S3 SDK 进行集成。

---

## 3. Cloudflare 控制台配置步骤 (详细图文级说明)

> **控制台地址**：[https://dash.cloudflare.com/](https://dash.cloudflare.com/)

### 第一步：创建 R2 存储桶 (Bucket)

1. 登录后，在左侧主菜单点击 **R2**。
2. 点击页面中间或右上角的 **Create bucket** 按钮。
3. **Bucket Name**：输入 `wares-blog` (记住这个名字，对应环境变量 `R2_BUCKET_NAME`)。
4. **Location**：保持默认的 `Automatic`。
5. 点击底部的 **Create bucket** 完成创建。

### 第二步：获取 API 凭证 (Token)

1. 返回 R2 主页面（点击左侧菜单的 R2）。
2. 在右侧边栏找到并点击 **Manage R2 API Tokens**。
3. 点击 **Create API token**。
4. **Token name**：输入 `blog-crawler-token`。
5. **Permissions**：选择 **Object Read & Write (Edit)** (注意：不要选只读)。
6. **TTL**：选择 **Forever** (或者根据安全需求选择较长时间)。
7. 点击底部的 **Create API Token**。
8. **重点保存**：页面会显示以下信息，请务必立即复制并保存到 `.env`，离开页面后将无法再次查看：
   - **Access Key ID** (对应 `R2_ACCESS_KEY_ID`)
   - **Secret Access Key** (对应 `R2_ACCESS_KEY_SECRET`)

### 第三步：获取 Endpoint 地址

1. 进入你刚刚创建的 `wares-blog` 存储桶详情页。
2. 在存储桶名称下方，你会看到一行 **S3 API** 地址。
3. 复制该地址（格式如：`https://<account-id>.r2.cloudflarestorage.com`），这对应环境变量 `R2_ENDPOINT`。

### 第四步：配置公开访问 (Public Access)
1. 在存储桶详情页点击顶部的 **Settings** 选项卡。
2. **方案 A (推荐：自定义域名)**：
   - 找到 **Custom Domains** 区域。
   - 点击 **Connect Domain**。
   - **输入子域名**：输入如 `img.waresblog.xyz`（前提是主域名已在 CF 托管）。
   - **注意**：子域名无需购买，只要主域名是你的，你可以随意创建。
3. **方案 B (快速测试：临时开发域名 - 无需主域名)**：
   - 找到 **Public Development URL** 区域。
   - 点击 **Expose** 或 **Allow Access**。
   - **确认**：在弹窗中输入 `allow` 并点击确认。
   - **获取地址**：你会得到一个以 `.r2.dev` 结尾的链接（如 `https://pub-xxx.r2.dev`）。
4. **环境变量设置**：复制生成的完整地址（无论是方案 A 还是方案 B），填入 `.env` 中的 `R2_PUBLIC_URL`。

---

## 4. 技术实施方案

### 4.1 环境变量配置 (.env)

```bash
R2_ACCESS_KEY_ID=你的_Access_Key_ID
R2_ACCESS_KEY_SECRET=你的_Secret_Access_Key
R2_BUCKET_NAME=wares-blog
R2_ENDPOINT=https://<你的账号ID>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://img.waresblog.xyz  # 或者 R2.dev 的临时域名
```

### 4.2 安装依赖

```bash
pnpm add @aws-sdk/client-s3 --filter api
```

### 4.3 代码实现参考

#### 创建 R2 存储服务

在 `apps/api/src/modules/crawler/transformers/r2-storage.service.ts` 创建：

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class R2StorageService {
  private client: S3Client;
  private readonly logger = new Logger(R2StorageService.name);

  constructor() {
    this.client = new S3Client({
      region: "auto",
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_ACCESS_KEY_SECRET,
      },
      endpoint: process.env.R2_ENDPOINT,
    });
  }

  async upload(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    const key = `crawler/${fileName}`;
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }));
    
      // 返回公开访问地址
      return `${process.env.R2_PUBLIC_URL}/${key}`;
    } catch (error) {
      this.logger.error(`R2 Upload Failed: ${error.message}`);
      throw error;
    }
  }
}
```

### 4.4 集成到 OssUploaderService

修改 [oss-uploader.service.ts](file:///Users/wares/Desktop/Blog/apps/api/src/modules/crawler/transformers/oss-uploader.service.ts)：

```typescript
// 构造函数中注入 R2StorageService
constructor(private readonly r2Storage: R2StorageService) {}

// 在 uploadImage 方法中替换本地写入逻辑
const cloudUrl = await this.r2Storage.upload(response.data, fileName, contentType);
return cloudUrl;
```

---

## 5. 迁移与验证

1. **配置环境变量**：在生产环境配置上述 R2 参数。
2. **运行测试**：手动触发爬虫任务，观察图片地址是否已变为 `https://img.waresblog.xyz/crawler/...`。
3. **清理本地缓存**：确认云端正常后，可以删除服务器上的 `public/uploads/crawler` 目录。
