import { randomBytes } from 'node:crypto';
import prisma from '@/lib/prisma';

export const externalCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function generateApiKey() {
  return `fd_live_${randomBytes(32).toString('hex')}`;
}

export async function authenticateExternalRequest(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const apiKey = await prisma.apiKey.findUnique({ where: { key: match[1].trim() } });
  if (!apiKey) return null;
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  return apiKey;
}
