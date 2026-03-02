import { config } from 'dotenv';
import { resolve } from 'path';

// Carrega variáveis de ambiente do .env.test
config({ path: resolve(__dirname, '../.env.test') });
