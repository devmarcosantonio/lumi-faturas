import { Injectable } from '@nestjs/common';
import { ClientesRepository } from './clientes.repository';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientesService {
  constructor(private clientesRepository: ClientesRepository) {}

  async findByNumeroCliente(numeroCliente: string) {
    return this.clientesRepository.findClientByNumber(numeroCliente);
  }

  async create(data: Prisma.ClienteCreateInput) {
    return this.clientesRepository.create(data);
  }
}
