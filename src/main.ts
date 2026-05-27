import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { join } from 'path'; // <--- Tambahkan import ini
import { NestExpressApplication } from '@nestjs/platform-express'; // <--- Tambahkan import ini

async function bootstrap() {
  // Ubah baris ini agar mendukung Express Application
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();

  // --- TAMBAHKAN BARIS INI ---
  // Ini gunanya agar folder 'uploads' bisa diakses lewat URL /uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  // ---------------------------

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Restaurant API')
    .setDescription('Backend API Restaurant')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 8080;

  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Restaurant API is running on port: ${port}`);
}

void bootstrap();
