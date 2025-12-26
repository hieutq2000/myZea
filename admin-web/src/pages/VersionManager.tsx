import { useState, useEffect } from 'react';
import { Card, Form, Input, Checkbox, Button, message, Alert, Typography } from 'antd';
import { CloudUploadOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

export default function VersionManager() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await axios.get('https://api.data5g.site/api/app-version/latest');
            if (res.data) {
                form.setFieldsValue(res.data);
            }
        } catch (error) {
            console.error(error);
            message.error('Không thể tải cấu hình phiên bản');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (values: any) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await axios.post('https://api.data5g.site/api/admin/app-version', values, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                message.success('Cập nhật cấu hình thành công!');
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi khi lưu cấu hình');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
            <Title level={2}>
                <CloudUploadOutlined style={{ marginRight: 12, color: '#1890ff' }} />
                Quản lý Cập nhật Ứng dụng (Force Update)
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Cấu hình yêu cầu ứng dụng Mobile phải cập nhật phiên bản mới.
            </Text>

            <Card loading={loading} hoverable>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    initialValues={{ forceUpdate: false }}
                >
                    <Alert
                        message="Lưu ý quan trọng"
                        description="Khi bật 'Bắt buộc cập nhật', người dùng sẽ không thể sử dụng ứng dụng cho đến khi cập nhật lên phiên bản mới nhất."
                        type="warning"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item
                            name="version"
                            label="Phiên bản mới nhất"
                            rules={[{ required: true, message: 'Nhập version (VD: 1.1.7)' }]}
                        >
                            <Input placeholder="1.1.7" size="large" />
                        </Form.Item>

                        <Form.Item
                            name="title"
                            label="Tiêu đề popup"
                            rules={[{ required: true }]}
                        >
                            <Input placeholder="Cập nhật ứng dụng" size="large" />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="message"
                        label="Nội dung thông báo"
                        rules={[{ required: true }]}
                    >
                        <Input.TextArea rows={4} placeholder="Phiên bản mới với nhiều tính năng hấp dẫn..." />
                    </Form.Item>

                    <Form.Item
                        name="downloadUrl"
                        label="Link tải (IPA / App Store / Website)"
                        rules={[{ required: true, type: 'url' }]}
                    >
                        <Input placeholder="https://data5g.site/..." size="large" />
                    </Form.Item>

                    <Form.Item name="forceUpdate" valuePropName="checked">
                        <Checkbox style={{ fontSize: 16 }}>
                            <b>Bắt buộc cập nhật (Force Update)</b>
                        </Checkbox>
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                        <Button icon={<ReloadOutlined />} onClick={fetchConfig} loading={loading}>
                            Reset
                        </Button>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
                            Lưu Cấu Hình
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
