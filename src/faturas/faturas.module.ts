import { Module } from '@nestjs/common';
import { FaturasService } from './faturas.service';
import { FaturasController } from './faturas.controller';

@Module({
  providers: [FaturasService],
  controllers: [FaturasController],
})
export class FaturasModule {}
