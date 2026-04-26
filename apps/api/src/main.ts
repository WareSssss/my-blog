import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      /^http:\/\/localhost:5173$/,
      /^http:\/\/127\.0\.0\.1:5173$/,
      /^http:\/\/localhost:5174$/,
      /^http:\/\/127\.0\.0\.1:5174$/,
      // 允许生产环境的前端域名
      /\.vercel\.app$/, 
      /\.railway\.app$/,
      // 如果有自定义域名，请在此添加，例如：
      // 'https://www.yourdomain.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
