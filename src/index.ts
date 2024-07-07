import * as dotenv from 'dotenv';
import connectDB  from './config/db';
import initLlama from './llama/initializeLlama';
import { startUserAnalyzer } from './analyzers/analyzeUser';
import { serviceLogger } from './config/logger';

const logger = serviceLogger('index.ts');

logger.info('Process Started!');

dotenv.config({ path: __dirname + '/config/config.env' });

const db = connectDB();
const llama = initLlama();

await Promise.all([db, llama])

await startUserAnalyzer()