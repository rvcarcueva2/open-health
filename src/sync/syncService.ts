import { isOnline } from './networkMonitor';
import { processQueue } from './syncWorker';

export async function syncNow() {
  const online =
    await isOnline();

  if (!online) {
    return;
  }

  await processQueue();
}