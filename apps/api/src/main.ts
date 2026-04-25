import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      /^http:\/\/localhost:5173$/,
      /^http:\/\/127\.0\.0\.1:5173$/,
      // 允许生产环境的前端域名，可以根据实际情况修改
      /\.vercel\.app$/, 
      /\.railway\.app$/,
      /你的正式域名\.com$/ 
    ],
  });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
