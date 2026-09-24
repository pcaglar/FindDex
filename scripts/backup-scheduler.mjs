const baseUrl = process.env.INTERNAL_BASE_URL || 'http://127.0.0.1:3000';
const intervalOverride = Number(process.env.BACKUP_INTERVAL_MS || 0);

async function runIfEnabled() {
  try {
    const settingsResponse = await fetch(`${baseUrl}/api/settings`);
    if (!settingsResponse.ok) return;
    const settings = await settingsResponse.json();
    if (settings?.data?.automaticBackupEnabled) {
      const response = await fetch(`${baseUrl}/api/settings/backups`, { method: 'POST' });
      if (!response.ok) console.error('[backup] Automatic backup failed:', response.status);
      else console.log('[backup] Automatic JSON backup created.');
    }
  } catch (error) { console.error('[backup] Scheduler request failed:', error?.message || error); }
}

function scheduleNext() {
  if (intervalOverride >= 10000) {
    setInterval(runIfEnabled, intervalOverride);
    setTimeout(runIfEnabled, 5000);
    return;
  }
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  setTimeout(async () => { await runIfEnabled(); scheduleNext(); }, next.getTime() - now.getTime());
}

scheduleNext();
