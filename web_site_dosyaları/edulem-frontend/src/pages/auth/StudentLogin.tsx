import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const StudentLogin = () => {
    const [tcNo, setTcNo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await axiosClient.post('/portal/student/login', {
                tc_no: tcNo,
                password: password,
                device_name: 'SchoolPortal Web'
            });

            if (!response.data || !response.data.data) {
                setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
                return;
            }

            const { token, student } = response.data.data;

            localStorage.setItem('ACCESS_TOKEN', token);
            const storedUser: any = { ...student, role: 'student', name: student?.name };
            if ('guardian_name' in storedUser) {
                delete storedUser.guardian_name;
            }
            localStorage.setItem('USER_DATA', JSON.stringify(storedUser));
            localStorage.setItem('USER_ROLE', 'student');
            localStorage.setItem('LOGIN_TYPE', 'student'); // Öğrenci portal girişi işaretle

            window.location.href = '/portal/dashboard';

        } catch (err: any) {
            setError(err.response?.data?.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex min-vh-100 bg-light align-items-center justify-content-center p-4">
            <div className="card border-0 shadow-lg w-100" style={{ maxWidth: '400px' }}>
                <div className="card-body p-5">
                    <div className="text-center mb-4">
                        <div className="avatar-lg bg-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 shadow">
                            <i className="ti ti-school fs-1 text-white"></i>
                        </div>
                        <h3 className="fw-bold">Öğrenci Portalı</h3>
                        <p className="text-muted">Öğrencinin TC Kimlik No bilgisi ile giriş yapın.</p>
                    </div>

                    {error && (
                        <div className="alert alert-danger py-2 small d-flex align-items-center animate__animated animate__shakeX">
                            <i className="ti ti-alert-circle me-2"></i>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div className="mb-3">
                            <label className="form-label fw-bold">Öğrenci TC</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0"><i className="ti ti-id text-muted"></i></span>
                                <input
                                    type="text"
                                    className="form-control border-start-0 ps-0"
                                    placeholder="11 haneli TC"
                                    value={tcNo}
                                    onChange={(e) => setTcNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold">Şifre</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0"><i className="ti ti-lock text-muted"></i></span>
                                <input
                                    type="password"
                                    className="form-control border-start-0 ps-0"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary w-100 py-2 fw-bold" disabled={loading}>
                            {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Giriş Yap'}
                        </button>
                    </form>

                    <div className="mt-4 text-center">
                        <button className="btn btn-link btn-sm text-decoration-none" onClick={() => navigate('/login')}>
                            Personel Girişi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentLogin;
