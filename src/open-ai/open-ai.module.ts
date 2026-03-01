import { Module } from '@nestjs/common';
import { OpenAiService } from './open-ai.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [OpenAiService, ConfigService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
