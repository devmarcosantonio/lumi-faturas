import { Module } from '@nestjs/common';
import { FaturasService } from './faturas.service';
import { FaturasController } from './faturas.controller';
import { OpenAiModule } from 'src/open-ai/open-ai.module';
import { FaturasRepository } from './faturas.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { S3Service } from 'src/s3/s3.service';
import { ClientesModule } from 'src/clientes/clientes.module';

@Module({
  imports: [OpenAiModule, PrismaModule, ClientesModule],
  providers: [FaturasService, FaturasRepository, S3Service],
  controllers: [FaturasController],
})
export class FaturasModule {}
