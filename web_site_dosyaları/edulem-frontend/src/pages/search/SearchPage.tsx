import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { isTeacher } from '../../utils/userScope';

interface SearchResults {
  students: Array<{ id: number; name: string; school_no?: string; tc_no?: string; url: string }>;
  lessons: Array<{ id: number; name: string; code?: string; url: string }>;
  users: Array<{ id: number; name: string; email?: string; url: string }>;
}

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [loading, setLoading] = useState(!!q);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const viewerIsTeacher = isTeacher();

  useEffect(() => {
    if (!q || q.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    axiosClient
      .get('/search', { params: { q: q.trim() } })
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data ?? res.data;
        setResults({
          students: data?.students ?? [],
          lessons: data?.lessons ?? [],
          users: data?.users ?? [],
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Arama yapılamadı.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [q]);

  const total = results
    ? results.students.length + results.lessons.length + results.users.length
    : 0;

  return (
    <div className="container-fluid">
      <div className="page-title-head d-flex align-items-center mb-4">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Arama</h4>
          <p className="text-muted mb-0">
            {q ? (
              <>Aranan: &quot;<strong>{q}</strong>&quot;</>
            ) : (
              'Öğrenci, ders veya kullanıcı adı ile arayın (en az 2 karakter).'
            )}
          </p>
        </div>
      </div>

      {!q && (
        <div className="card border">
          <div className="card-body text-center text-muted py-5">
            <i className="ti ti-search fs-1 d-block mb-2"></i>
            <p className="mb-0">Üst menüdeki arama kutusuna en az 2 karakter yazıp Enter&apos;a basın.</p>
          </div>
        </div>
      )}

      {q && q.trim().length < 2 && (
        <div className="alert alert-info">
          Arama için en az 2 karakter girin.
        </div>
      )}

      {q && q.trim().length >= 2 && (
        <>
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="mt-2 text-muted">Aranıyor...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          {!loading && !error && results && (
            <>
              {total === 0 ? (
                <div className="card border">
                  <div className="card-body text-center py-5 text-muted">
                    <i className="ti ti-mood-empty fs-1 d-block mb-2"></i>
                    &quot;{q}&quot; için sonuç bulunamadı.
                  </div>
                </div>
              ) : (
                <div className="row g-3">
                  {results.students.length > 0 && (
                    <div className="col-12">
                      <div className="card border">
                        <div className="card-header bg-soft-primary">
                          <h6 className="mb-0"><i className="ti ti-school me-2"></i>Öğrenciler</h6>
                        </div>
                    <div className="list-group list-group-flush">
                          {results.students.map((s) => (
                            <Link key={s.id} to={s.url} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                              <span>{s.name}</span>
                              <span className="text-muted small">{viewerIsTeacher ? (s.school_no || '') : (s.school_no || s.tc_no || '')}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {results.lessons.length > 0 && (
                    <div className="col-12">
                      <div className="card border">
                        <div className="card-header bg-soft-info">
                          <h6 className="mb-0"><i className="ti ti-book me-2"></i>Dersler</h6>
                        </div>
                        <div className="list-group list-group-flush">
                          {results.lessons.map((l) => (
                            <Link key={l.id} to={l.url} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                              <span>{l.name}</span>
                              <span className="text-muted small">{l.code || ''}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {results.users.length > 0 && !viewerIsTeacher && (
                    <div className="col-12">
                      <div className="card border">
                        <div className="card-header bg-soft-success">
                          <h6 className="mb-0"><i className="ti ti-users me-2"></i>Kullanıcılar</h6>
                        </div>
                        <div className="list-group list-group-flush">
                          {results.users.map((u) => (
                            <Link key={u.id} to={u.url} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                              <span>{u.name}</span>
                              <span className="text-muted small">{u.email || ''}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default SearchPage;
