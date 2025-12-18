import { useState, type FormEvent, type FC } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

const Login: FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            navigate('/chat');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Left Panel - Branding */}
            <div className="login-left">
                <div className="brand-content">
                    <div className="logo-area">
                        {/* You can replace this icon with an image logo */}
                        <div style={{ background: '#FF6B00', width: 30, height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <b style={{ color: 'white', fontSize: 18 }}>Z</b>
                        </div>
                        <span className="brand-name">Zyea Group</span>
                    </div>
                    <h1>Kết nối mọi khoảng cách,<br />hiệu suất không giới hạn!</h1>
                    <p className="brand-slogan">myZyea Chat, cùng tạo nhịp thành công</p>

                    <div className="phone-preview">
                        <div className="mockup-frame">
                            <img src="https://data5g.site/app-screen.png" alt="App Preview" />
                        </div>
                    </div>
                </div>
                <div className="left-bg-overlay"></div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="login-right">
                <div className="login-box">
                    <div className="login-header">
                        <h2>Đăng nhập myZyea Chat</h2>
                    </div>

                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label>Email / Số điện thoại</label>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Nhập email"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Mật khẩu</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nhập mật khẩu"
                                required
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <div className="form-actions">
                            <a href="#" className="forgot-password">Quên mật khẩu?</a>
                        </div>

                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                        </button>

                        <div className="divider">
                            <span>Hoặc</span>
                        </div>

                        <button type="button" className="btn-qr-login">
                            Đăng nhập bằng mã QR
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>Chưa có tài khoản? <a href="#">Đăng ký ngay</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
