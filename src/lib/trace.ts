// Registro simple en memoria para diagnosticar dónde se traba una página (se ve en /estado/registro).
const g = globalThis as unknown as { __nexoTrace?: string[] };
export function trace(msg: string) {
  const list = (g.__nexoTrace ??= []);
  list.push(`${new Date().toISOString().slice(11, 23)} ${msg}`);
  if (list.length > 200) list.splice(0, list.length - 200);
}
export function readTrace() {
  return g.__nexoTrace ?? [];
}
