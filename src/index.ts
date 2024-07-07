import express, { Express, NextFunction, Request, Response } from 'express';
import * as dotenv from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import connectDB  from './config/db';
import initLlama from './llama/initializeLlama';
import { run } from './analyzers/anaylzeAndRate';
import { startAnalyzer } from './analyzers/analyzeUser';
import { serviceLogger } from './config/logger';

const logger = serviceLogger('index.ts');

logger.info('Process Started!');

dotenv.config({ path: __dirname + '/config/config.env' });

// const db = connectDB();
const llama = initLlama();

// await Promise.all([db])
// await startAnalyzer()

await Promise.all([llama])
await run()

// await Promise.all([db, llama])