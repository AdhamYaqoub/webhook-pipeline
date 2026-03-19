import dotenv from 'dotenv';

import { createServer } from './server';
import { startWorkerLoop } from './worker';
import { config } from './config';

dotenv.config();

async function main() {
  const app = createServer();

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Webhook pipeline service listening on port ${config.port}`);
  });

  startWorkerLoop();
}

void main();


