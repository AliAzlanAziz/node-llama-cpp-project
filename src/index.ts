import * as dotenv from 'dotenv';
import initLlama from './llama/initializeLlama';
import { run } from './analyzers/anaylzeAndRate';
import { serviceLogger } from './config/logger';

const logger = serviceLogger('index.ts');

logger.info('node-llama-cpp main process started!');

dotenv.config({ path: __dirname + '/config/config.env' });

await initLlama();

await run()