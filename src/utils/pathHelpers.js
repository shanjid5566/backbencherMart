import { fileURLToPath } from 'url';            // convert import.meta.url
import { dirname } from 'path';

// helper to get __filename / __dirname equivalents in ESM
export const __filename = fileURLToPath(import.meta.url); // current file path
export const __dirname = dirname(__filename);            // current directory path