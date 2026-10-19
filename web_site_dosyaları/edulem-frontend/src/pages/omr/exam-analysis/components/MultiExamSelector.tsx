import { useMemo, useState } from 'react';
import type { ExamListItem } from '../types';

export default function MultiExamSelector({
  exams,
  selectedIds,
  onChange,
  disabled,
}: {
  exams: ExamListItem[];
  selectedIds: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (selectedIds.length === 0) return 'Sınav seçin';
    if (selectedIds.length === 1) {
      const ex = exams.find((e) => e.id === selectedIds[0]);
      return ex ? ex.name : '1 sınav seçili';
    }
    return `${selectedIds.length} sınav seçili`;
  }, [exams, selectedIds]);

  const toggle = (id: number) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    onChange(next);
  };

  return (
    <div className="dropdown">
      <button
        type="button"
        className="btn btn-outline-primary dropdown-toggle"
        onClick={() => setOpen(!open)}
        disabled={disabled}
      >
        {selectedLabel}
      </button>
      <div
        className={`dropdown-menu p-2 ${open ? 'show' : ''}`}
        style={{ minWidth: 360, maxHeight: 360, overflow: 'auto' }}
      >
        {exams.map((ex) => (
          <label key={ex.id} className="dropdown-item d-flex align-items-start gap-2" style={{ whiteSpace: 'normal' }}>
            <input
              className="form-check-input mt-1"
              type="checkbox"
              checked={selectedIds.includes(ex.id)}
              onChange={() => toggle(ex.id)}
            />
            <span>
              <div className="fw-semibold">{ex.name}</div>
              <div className="text-muted small">{ex.exam_date ?? '—'} {ex.exam_type ? `• ${ex.exam_type}` : ''}</div>
            </span>
          </label>
        ))}
        {exams.length === 0 && <div className="text-muted small px-2 py-2">Sınav bulunamadı</div>}
      </div>
    </div>
  );
}
