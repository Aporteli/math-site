import { agentJson, callAgent } from '@/lib/admin/agent-proxy';
import { requireAdminActor } from '@/lib/admin/admin-request';

export async function GET(request: Request) {
  const admin = await requireAdminActor(request);
  if ('response' in admin) return admin.response;

  const result = await callAgent({ path: '/docker/containers', actor: admin.actor });
  return agentJson(result.status, result.data, 'Failed to list containers');
}
