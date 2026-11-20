import { readTrace } from '@/lib/trace';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response((await readTrace()).join('\n') || '(vacío)', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
