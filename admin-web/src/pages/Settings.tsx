import React, { useState } from 'react';
import { Card, Button, Form, Input, Switch, message, Divider, Alert, Tag } from 'antd';
import { BellOutlined, SafetyCertificateOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const Settings: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);

    const handleSendNotification = async (values: any) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            await axios.post('http://localhost:3001/api/admin/system/notification', values, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã gửi thông báo đến toàn hệ thống!');
        } catch (error) {
            console.error(error);
            message.error('Gửi thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 800 }}>
            <h2 style={{ marginBottom: 24 }}>Cài đặt hệ thống</h2>

            <Alert
                message="Khu vực quan trọng"
                description="Các thay đổi ở đây sẽ ảnh hưởng trực tiếp đến trải nghiệm của toàn bộ người dùng."
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Card title="📢 Gửi thông báo toàn hệ thống" style={{ marginBottom: 24 }}>
                <Form layout="vertical" onFinish={handleSendNotification}>
                    <Form.Item name="title" label="Tiêu đề thông báo" initialValue="Thông báo từ Admin">
                        <Input prefix={<BellOutlined />} />
                    </Form.Item>
                    <Form.Item name="message" label="Nội dung" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}>
                        <Input.TextArea rows={4} placeholder="Nhập nội dung muốn gửi..." />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} icon={<ReloadOutlined />}>
                        Gửi ngay
                    </Button>
                </Form>
            </Card>

            <Card title="⚙️ Trạng thái hệ thống">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>Chế độ Bảo trì (Maintenance Mode)</div>
                        <div style={{ color: '#666' }}>Khi bật, người dùng sẽ không thể truy cập ứng dụng.</div>
                    </div>
                    <Switch
                        checked={maintenanceMode}
                        onChange={checked => {
                            setMaintenanceMode(checked);
                            message.info(checked ? 'Đã bật chế độ bảo trì' : 'Đã tắt chế độ bảo trì');
                        }}
                    />
                </div>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>Phiên bản Server</div>
                        <Tag color="green">v1.0.0</Tag>
                    </div>
                    <Button icon={<SafetyCertificateOutlined />}>Kiểm tra cập nhật</Button>
                </div>
            </Card>
        </div>
    );
};

export default Settings;
