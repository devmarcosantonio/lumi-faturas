import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FaturasModule } from './faturas/faturas.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [FaturasModule, LlmModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
