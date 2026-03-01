import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FaturasService } from './faturas.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('faturas')
export class FaturasController {
  constructor(private faturasService: FaturasService) {}

  @Get()
  async getFaturas(
    @Query('numero_cliente') numeroCliente?: string,
    @Query('mes_referencia') mesReferencia?: string,
    @Query('mes_referencia_inicio') mesReferenciaInicio?: string,
    @Query('mes_referencia_fim') mesReferenciaFim?: string,
  ) {
    return this.faturasService.getFaturaByClienteEMesReferencia({
      numeroCliente,
      mesReferencia,
      mesReferenciaInicio,
      mesReferenciaFim,
    });
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(
            new BadRequestException('Somente arquivos PDF são permitidos'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async createFatura(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo PDF é obrigatório');
    }

    const resposta = await this.faturasService.processarFatura(file.buffer);

    return { mensagem: 'Fatura processada com sucesso', resposta };
  }
}
