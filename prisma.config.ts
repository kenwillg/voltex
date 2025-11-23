import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

// 1. Force load the .env file
dotenv.config();

// 2. Verify it loaded (Optional, but helpful for debugging)
if (!process.env.DIRECT_URL) {
  throw new Error('🔴 DIRECT_URL is missing from .env file');
}

export default defineConfig({
  datasource: {
    provider: 'postgresql',
    // 3. Use the variable
    url: process.env.DIRECT_URL, 
  },
});