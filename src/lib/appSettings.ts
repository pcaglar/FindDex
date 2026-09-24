import prisma from '@/lib/prisma';

export const SETTING_DEFAULTS = {
  automaticBackupEnabled: false,
  backupRetention: 7,
  trashRetentionDays: 30,
};

export async function getAppSettings() {
  const rows = await prisma.appSetting.findMany();
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    automaticBackupEnabled: values.automaticBackupEnabled === 'true',
    backupRetention: [3, 7, 14, 30].includes(Number(values.backupRetention)) ? Number(values.backupRetention) : SETTING_DEFAULTS.backupRetention,
    trashRetentionDays: [7, 15, 30, 60].includes(Number(values.trashRetentionDays)) ? Number(values.trashRetentionDays) : SETTING_DEFAULTS.trashRetentionDays,
  };
}

export async function updateAppSettings(input: Record<string, unknown>) {
  const current = await getAppSettings();
  const next = {
    automaticBackupEnabled: typeof input.automaticBackupEnabled === 'boolean' ? input.automaticBackupEnabled : current.automaticBackupEnabled,
    backupRetention: [3, 7, 14, 30].includes(Number(input.backupRetention)) ? Number(input.backupRetention) : current.backupRetention,
    trashRetentionDays: [7, 15, 30, 60].includes(Number(input.trashRetentionDays)) ? Number(input.trashRetentionDays) : current.trashRetentionDays,
  };
  await prisma.$transaction(Object.entries(next).map(([key, value]) => prisma.appSetting.upsert({
    where: { key }, update: { value: String(value) }, create: { key, value: String(value) },
  })));
  return next;
}
