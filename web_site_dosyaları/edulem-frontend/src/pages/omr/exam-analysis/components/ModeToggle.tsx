export type DetailedMode = 'class' | 'student' | 'exam';

export default function ModeToggle({
  value,
  onChange,
}: {
  value: DetailedMode;
  onChange: (v: DetailedMode) => void;
}) {
  return (
    <div className="btn-group" role="group">
      <button
        type="button"
        className={`btn ${value === 'class' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onChange('class')}
      >
        Sınıf Analizi
      </button>
      <button
        type="button"
        className={`btn ${value === 'student' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onChange('student')}
      >
        Öğrenci Analizi
      </button>
      <button
        type="button"
        className={`btn ${value === 'exam' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onChange('exam')}
      >
        Sınav Analizi
      </button>
    </div>
  );
}
