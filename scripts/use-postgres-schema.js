/**
 * Vercel cannot run SQLite. Flip Prisma provider to postgresql for cloud builds.
 * Local Windows keeps sqlite unless USE_POSTGRES=1.
 */
const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const usePostgres = process.env.VERCEL === "1" || process.env.USE_POSTGRES === "1";

if (!usePostgres) {
  process.exit(0);
}

let schema = fs.readFileSync(schemaPath, "utf8");
if (!schema.includes('provider = "sqlite"')) {
  console.log("[db] schema already non-sqlite");
  process.exit(0);
}

schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
fs.writeFileSync(schemaPath, schema);
console.log("[db] prisma provider → postgresql (Vercel/USE_POSTGRES)");
