import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(ROOT, 'storage', 'store.sqlite'));
const password = process.env.ADMIN_PASSWORD || '';

if (password.length < 12) {
  throw new Error('Set ADMIN_PASSWORD in .env to a password with at least 12 characters.');
}
if (!fs.existsSync(DB_PATH)) {
  throw new Error(`SQLite database not found at ${DB_PATH}. Start the app once to create it, then retry.`);
}

const SQL = await initSqlJs({ locateFile: (file) => path.join(ROOT, 'node_modules', 'sql.js', 'dist', file) });
const db = new SQL.Database(fs.readFileSync(DB_PATH));
db.run('CREATE TABLE IF NOT EXISTS secrets (name TEXT PRIMARY KEY, value TEXT NOT NULL)');
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
db.run('INSERT OR REPLACE INTO secrets (name, value) VALUES (?, ?)', ['admin_password_hash', `${salt}:${hash}`]);

const tempPath = `${DB_PATH}.reset.tmp`;
fs.writeFileSync(tempPath, Buffer.from(db.export()));
db.close();
fs.renameSync(tempPath, DB_PATH);
console.log('Admin password reset to the ADMIN_PASSWORD value in .env. Store data was kept.');
