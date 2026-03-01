import { Module } from '@nestjs/common';
import { FaturasService } from './faturas.service';
import { FaturasController } from './faturas.controller';
import { OpenAiModule } from 'src/open-ai/open-ai.module';
import { ClientesRepository } from 'src/clientes/clientes.repository';
import { FaturasRepository } from './faturas.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [OpenAiModule, PrismaModule],
  providers: [FaturasService, ClientesRepository, FaturasRepository],
  controllers: [FaturasController],
})
export class FaturasModule {}
