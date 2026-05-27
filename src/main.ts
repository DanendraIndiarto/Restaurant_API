import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Aktifkan CORS (Penting agar API bisa diakses dari luar)
  app.enableCors();

  // 2. Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // 3. Konfigurasi Swagger (Akses di: domain-anda.up.railway.app/api)
  const config = new DocumentBuilder()
    .setTitle('Restaurant API')
    .setDescription('Backend API Restaurant')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 4. PENENTUAN PORT (Sangat Penting!)
  // Kita prioritaskan variabel PORT dari Railway, kalau tidak ada baru pakai 8080
  const port = process.env.PORT || 8080;

  // 5. LISTENING DENGAN HOST 0.0.0.0
  // Tanpa '0.0.0.0', Railway tidak bisa meneruskan trafik ke aplikasi Anda
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Restaurant API is running on port: ${port}`);
}

void bootstrap();
