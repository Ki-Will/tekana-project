import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle("Tekana Backend API")
    .setDescription(
      `
      This is a documentation of all APIs in Tekana
      `
    )
    .setVersion("1.0.0")
    // .addBearerAuth(
    //   {
    //     type: "http",
    //     scheme: "bearer",
    //     bearerFormat: "JWT",
    //     name: "Authorization",
    //     description: "Enter your JWT access token",
    //     in: "header"
    //   },
    //   "JWT-auth"
    // )
    // .addCookieAuth(
    //   "refresh_toke",
    //   {
    //     type: "apiKey",
    //     in:"cookie",
    //     name:"refresh_token",
    //     description:"Refresh token here"
    //   },
    //   "refresh-token"
    // )
    .addServer("http://localhost:3086", "Dev Server")
    .build()

    const document = SwaggerModule.createDocument(app ,config);
    SwaggerModule.setup("api", app , document , {
      customSiteTitle: "Tekana API docs",
      customCss: ".swagger-ui .topbar {display: none}",
      swaggerOptions: {
        persistAuthorization: true ,
      },
    });


  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
