import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
}
