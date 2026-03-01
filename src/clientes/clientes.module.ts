import { Module } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { ClientesController } from './clientes.controller';
import { ClientesRepository } from './clientes.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ClientesService, ClientesRepository],
  controllers: [ClientesController],
  exports: [ClientesService, ClientesRepository],
})
export class ClientesModule {}
