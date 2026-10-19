import { useRef, useEffect } from 'react';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  disabled?: boolean;
  className?: string;
}

const EMPTY_HTML = '<p><br></p>';

function isEmptyHtml(html: string): boolean {
  if (!html || html.trim() === '') return true;
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return text === '';
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Buraya yazın...',
  minHeight = 200,
  maxHeight = 400,
  disabled = false,
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isPlaceholder = isEmptyHtml(value);

  // İlk mount: değeri yükle veya boş editor aç
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = value && !isEmptyHtml(value) ? value : EMPTY_HTML;
  }, []);

  // Parent "sıfırladı" (value='') → editörü temizle
  useEffect(() => {
    if (value !== '') return;
    const el = editorRef.current;
    if (el) el.innerHTML = EMPTY_HTML;
  }, [value]);

  const runCmd = (cmd: string, val?: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(cmd, false, val ?? undefined);
    onChange(el.innerHTML);
  };

  const handleInput = () => {
    const html = editorRef.current?.innerHTML ?? '';
    onChange(html);
  };

  const handleLink = (e: React.MouseEvent) => {
    e.preventDefault(); // Focus'un kaymasını engelle
    const url = prompt('Bağlantı URL\'si:');
    if (url) runCmd('createLink', url);
  };

  return (
    <div className={`rich-text-editor border rounded ${className}`} dir="ltr">
      {/* Araç çubuğu */}
      <div className="d-flex flex-wrap gap-1 p-2 bg-light border-bottom">
        <div className="d-flex gap-1">
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Kalın" onMouseDown={(e) => e.preventDefault()} onClick={() => runCmd('bold')} disabled={disabled}>
            <i className="ti ti-bold"></i>
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="İtalik" onMouseDown={(e) => e.preventDefault()} onClick={() => runCmd('italic')} disabled={disabled}>
            <i className="ti ti-italic"></i>
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Altı çizili" onMouseDown={(e) => e.preventDefault()} onClick={() => runCmd('underline')} disabled={disabled}>
            <i className="ti ti-underline"></i>
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Üstü çizili" onMouseDown={(e) => e.preventDefault()} onClick={() => runCmd('strikeThrough')} disabled={disabled}>
            <i className="ti ti-strikethrough"></i>
          </button>
        </div>
        <div className="vr d-none d-md-inline"></div>
        <div className="d-flex gap-1">
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Madde işaretli liste" onMouseDown={(e) => e.preventDefault()} onClick={() => runCmd('insertUnorderedList')} disabled={disabled}>
            <i className="ti ti-list"></i>
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Numaralı liste" onMouseDown={(e) => e.preventDefault()} onClick={() => runCmd('insertOrderedList')} disabled={disabled}>
            <i className="ti ti-list-numbers"></i>
          </button>
        </div>
        <div className="vr d-none d-md-inline"></div>
        <div className="d-flex gap-1">
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Bağlantı (metni seçip tıklayın)" onMouseDown={handleLink} disabled={disabled}>
            <i className="ti ti-link"></i>
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Biçimi temizle" onMouseDown={(e) => e.preventDefault()} onClick={() => runCmd('removeFormat')} disabled={disabled}>
            <i className="ti ti-clear-formatting"></i>
          </button>
        </div>
      </div>

      {/* Editör alanı */}
      <div className="position-relative">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          className="rich-text-editor-body p-3"
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
            overflow: 'auto',
            outline: 'none',
          }}
          data-placeholder={placeholder}
        />

        {/* Placeholder overlay — sadece boşken */}
        {isPlaceholder && (
          <div
            className="rich-text-editor-placeholder text-muted p-3"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              pointerEvents: 'none',
              minHeight: `${minHeight}px`,
            }}
            aria-hidden
          >
            {placeholder}
          </div>
        )}
      </div>

      <style>{`
        .rich-text-editor-body:empty::before,
        .rich-text-editor-body[data-placeholder]:empty::before { content: none; }
        .rich-text-editor .rich-text-editor-body { direction: ltr; text-align: left; }
        .rich-text-editor .rich-text-editor-body:focus { outline: none; }
        .rich-text-editor-placeholder { font-size: inherit; line-height: 1.5; }
      `}</style>
    </div>
  );
}
