export class MockS3Service {
  async uploadPdf(
    buffer: Buffer,
    numeroCliente: string,
    mesReferencia: string,
  ): Promise<string> {
    return `https://mock-s3-bucket.amazonaws.com/faturas/${numeroCliente}/${mesReferencia}.pdf`;
  }

  async downloadPdf(url: string): Promise<Buffer> {
    return Buffer.from('mock pdf content');
  }

  extractKeyFromUrl(url: string): string {
    return `faturas/mock/file.pdf`;
  }
}
