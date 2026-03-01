import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FaturasService } from './faturas.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('faturas')
export class FaturasController {
  constructor(private faturasService: FaturasService) {}

  @Get()
  getFaturas() {
    return 'Retornando todas as faturas';
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
