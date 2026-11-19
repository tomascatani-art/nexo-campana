export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="space-y-4">
      <div className="skeleton-light h-9 w-56 rounded-xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-light h-28 rounded-2xl" />)}</div>
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-light h-24 rounded-2xl" />)}
    </div>
  );
}
