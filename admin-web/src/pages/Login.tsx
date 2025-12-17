import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const Login: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Gọi API qua Nginx Proxy (Relative path)
            const response = await axios.post('/api/auth/login', {
                email: values.email,
                password: values.password,
            });

            const { token, user } = response.data;

            // KIỂM TRA QUYỀN ADMIN (Cho phép hieu@gmail.com và admin@gmail.com)
            const adminEmails = ['hieu@gmail.com', 'admin@gmail.com'];
            if (!adminEmails.includes(user.email)) {
                message.error('Tài khoản không có quyền truy cập Admin!');
                setLoading(false);
                return;
            }

            // Lưu token vào localStorage
            localStorage.setItem('admin_token', token);
            localStorage.setItem('admin_user', JSON.stringify(user));

            message.success('Đăng nhập thành công!');
            onLoginSuccess();
        } catch (error: any) {
            console.error(error);
            const errorMsg = error.response?.data?.error || 'Đăng nhập thất bại';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #1890ff 0%, #001529 100%)'
        }}>
            <Card style={{ width: 400, borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={3}>Vinalive Admin</Title>
                    <Text type="secondary">Đăng nhập để quản lý hệ thống</Text>
                </div>

                <Form
                    name="login_form"
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                    layout="vertical"
                >
                    <Form.Item
                        name="email"
                        rules={[{ required: true, message: 'Vui lòng nhập Email!' }]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="Email"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Mật khẩu"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" style={{ width: '100%' }} size="large" loading={loading}>
                            Đăng nhập
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Login;
