// Campos de formulario simples para el panel (sin estado, sirven en servidor y cliente).
export function Field({ label, name, defaultValue, type = 'text', required, placeholder, help, maxLength, inputMode, className = '' }: {
  label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; placeholder?: string; help?: string; maxLength?: number; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block font-semibold text-gray-800">{label}{required && <span className="text-gold-deep"> *</span>}</span>
      <input name={name} type={type} defaultValue={defaultValue ?? ''} required={required} placeholder={placeholder} maxLength={maxLength} inputMode={inputMode} className={inputCls} />
      {help && <span className="mt-1.5 block text-sm text-gray-500">{help}</span>}
    </label>
  );
}

export function TextArea({ label, name, defaultValue, rows = 4, help, maxLength, placeholder }: { label: string; name: string; defaultValue?: string | null; rows?: number; help?: string; maxLength?: number; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-semibold text-gray-800">{label}</span>
      <textarea name={name} defaultValue={defaultValue ?? ''} rows={rows} maxLength={maxLength} placeholder={placeholder} className={inputCls} />
      {help && <span className="mt-1.5 block text-sm text-gray-500">{help}</span>}
    </label>
  );
}

export function PriceField({ label, name, defaultValue, help }: { label: string; name: string; defaultValue?: number | null; help?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-semibold text-gray-800">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-500">$</span>
        <input name={name} defaultValue={defaultValue == null ? '' : defaultValue.toLocaleString('es-AR')} inputMode="decimal" placeholder="Sin precio" className={`${inputCls} pl-9 text-lg font-bold`} />
      </span>
      {help && <span className="mt-1.5 block text-sm text-gray-500">{help}</span>}
    </label>
  );
}

export function Check({ label, name, defaultChecked, help }: { label: string; name: string; defaultChecked?: boolean; help?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-6 shrink-0 accent-gold-deep" />
      <span>
        <span className="block font-semibold text-gray-900">{label}</span>
        {help && <span className="block text-sm text-gray-500">{help}</span>}
      </span>
    </label>
  );
}

export function Select({ label, name, defaultValue, options, help }: { label: string; name: string; defaultValue?: string; options: { value: string; label: string }[]; help?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-semibold text-gray-800">{label}</span>
      <select name={name} defaultValue={defaultValue} className={inputCls}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {help && <span className="mt-1.5 block text-sm text-gray-500">{help}</span>}
    </label>
  );
}

export function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {description && <p className="mt-1 text-gray-500">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const inputCls = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-gold-deep focus:ring-4 focus:ring-gold/30';
