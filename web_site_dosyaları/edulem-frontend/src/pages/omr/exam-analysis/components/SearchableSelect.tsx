import { useEffect, useMemo, useRef, useState } from 'react';

export type SelectOption<T> = {
  value: T;
  label: string;
  groupLabel?: string;
  subLabel?: string;
};

export default function SearchableSelect<T>({
  value,
  options,
  placeholder,
  searchPlaceholder,
  onChange,
  disabled,
  className,
}: {
  value: T | null;
  options: SelectOption<T>[];
  placeholder: string;
  searchPlaceholder?: string;
  onChange: (next: T | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => {
    if (value === null) return null;
    return options.find((o) => o.value === value) ?? null;
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return options;
    return options.filter((o) => {
      const a = o.label.toLocaleLowerCase('tr-TR');
      const b = (o.subLabel ?? '').toLocaleLowerCase('tr-TR');
      const g = (o.groupLabel ?? '').toLocaleLowerCase('tr-TR');
      return a.includes(q) || b.includes(q) || g.includes(q);
    });
  }, [options, query]);

  const groups = useMemo(() => {
    const map = new Map<string, SelectOption<T>[]>();
    for (const opt of filtered) {
      const g = opt.groupLabel ?? '';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(opt);
    }
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={rootRef} className={`dropdown ${className ?? ''}`}>
      <button
        type="button"
        className="btn btn-outline-primary dropdown-toggle w-100 text-start"
        onClick={() => setOpen(!open)}
        disabled={disabled}
      >
        {selected ? selected.label : placeholder}
      </button>

      <div
        className={`dropdown-menu p-2 ${open ? 'show' : ''}`}
        style={{ minWidth: '100%', maxHeight: 340, overflow: 'auto' }}
      >
        <input
          className="form-control form-control-sm mb-2"
          placeholder={searchPlaceholder ?? 'Ara...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        />

        <button
          type="button"
          className="dropdown-item text-muted"
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
        >
          {placeholder}
        </button>

        <div className="dropdown-divider"></div>

        {groups.map(([groupLabel, items]) => (
          <div key={groupLabel || 'root'}>
            {groupLabel ? (
              <div className="px-2 py-1 text-muted small fw-semibold">{groupLabel}</div>
            ) : null}
            {items.map((o) => (
              <button
                key={`${groupLabel || 'root'}-${String(o.value)}`}
                type="button"
                className={`dropdown-item ${selected?.value === o.value ? 'active' : ''}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <div className="fw-semibold">{o.label}</div>
                {o.subLabel ? <div className="small opacity-75">{o.subLabel}</div> : null}
              </button>
            ))}
          </div>
        ))}

        {filtered.length === 0 ? <div className="text-muted small px-2 py-2">Kayıt bulunamadı</div> : null}
      </div>
    </div>
  );
}
