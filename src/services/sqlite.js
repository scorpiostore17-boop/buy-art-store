import { DB_KEY, ensureLocalDb, saveLocalDb } from './localStore';

export const sqlite = {
  name: 'local-sqlite',
  dbKey: DB_KEY,
  getState: ensureLocalDb,
  saveState: saveLocalDb,
};

export function ensureSqliteDatabase() {
  return ensureLocalDb();
}
