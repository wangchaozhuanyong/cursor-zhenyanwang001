require('dotenv').config();
const { validateEnv } = require('./config/validateEnv');
validateEnv();

const app = require('./app');
const { runPendingMigrations } = require('./db/migrateRunner');
const { startCleanupScheduler } = require('./modules/admin/adminExport.service');

const PORT = process.env.PORT || 3000;

runPendingMigrations()
  .then(() => {
    startCleanupScheduler();
    app.listen(PORT, () => {
      console.log(`✅ Server running → http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
