import { readTrace } from '@/lib/trace';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(readTrace().slice(-80).join('\n') || '(vacío)', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
