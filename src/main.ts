import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Tekana Backend API')
    .setDescription(`
      Comprehensive API documentation for Tekana Safety & Rescue Platform.
      Supports JWT authentication for secure endpoints.
    `)
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addServer('http://localhost:3086', 'Development Server')
    .addServer('https://api.tekana.com', 'Production Server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Tekana API Documentation',
    customCss: '.swagger-ui .topbar { display: none; }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  });


  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
