import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'lumi-faturas';
  }

  async uploadPdf(
    pdfBuffer: Buffer,
    clienteNumero: string,
    mesReferencia: string,
  ): Promise<string> {
    // Gera nome único para o arquivo
    const fileName = `faturas/${clienteNumero}/${mesReferencia}-${new Date().getTime()}.pdf`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      // Opcional: tornar público
      // ACL: 'public-read',
    });

    await this.s3Client.send(command);

    // Retorna a URL do arquivo
    return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  }

  async downloadPdf(url: string): Promise<Buffer> {
    // Formato esperado: https://bucket.s3.region.amazonaws.com/path/to/file.pdf
    const urlObj = new URL(url);
    const key = urlObj.pathname.substring(1); // Remove a barra inicial

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    // Converte o stream em Buffer
    if (response.Body instanceof Readable) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk as Uint8Array);
      }
      return Buffer.concat(chunks);
    }

    throw new Error('Não foi possível baixar o arquivo do S3');
  }
}
