import { initDb } from "../src/db";

const db = initDb();
const tables = db
  .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' ORDER BY name")
  .all() as { name: string; sql: string }[];

for (const t of tables) {
  console.log(`-- ${t.name}\n${t.sql};\n`);
}
db.close();
