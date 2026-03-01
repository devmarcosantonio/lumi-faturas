import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FaturasModule } from './faturas/faturas.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { OpenAiModule } from './open-ai/open-ai.module';
import { ClientesModule } from './clientes/clientes.module';
import { S3Module } from './s3/s3.module';

@Module({
  imports: [
    FaturasModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    OpenAiModule,
    ClientesModule,
    S3Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
