import React, { useState } from 'react';
import { Card, Form, Input, Button, Radio, message, Typography, Modal } from 'antd';
import { SendOutlined, RocketOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Notifications: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    const onFinish = async (values: any) => {
        setPreviewData(values);
        setPreviewVisible(true);
    };

    const handleSend = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            await axios.post('/api/admin/notifications/send', previewData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã gửi thông báo thành công!');
            form.resetFields();
            setPreviewVisible(false);
        } catch (error: any) {
            console.error(error);
            message.error(error.response?.data?.error || 'Gửi thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <Title level={2}><RocketOutlined /> Gửi Thông Báo</Title>
                <Text type="secondary">Gửi Push Notification đến người dùng ứng dụng mobile</Text>
            </div>

            <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ target: 'all', priority: 'default' }}
                >
                    <Form.Item
                        name="title"
                        label="Tiêu đề"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                    >
                        <Input placeholder="Ví dụ: Cập nhật mới..." size="large" />
                    </Form.Item>

                    <Form.Item
                        name="body"
                        label="Nội dung"
                        rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
                    >
                        <TextArea
                            rows={4}
                            placeholder="Nhập nội dung thông báo..."
                            showCount
                            maxLength={200}
                            style={{ fontSize: 16 }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="target"
                        label="Đối tượng nhận"
                        rules={[{ required: true }]}
                    >
                        <Radio.Group buttonStyle="solid">
                            <Radio.Button value="all">Tất cả người dùng</Radio.Button>
                            <Radio.Button value="active_7days" disabled>Hoạt động (7 ngày qua)</Radio.Button>
                            <Radio.Button value="specific" disabled>User cụ thể (Sắp có)</Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item name="data" label="Dữ liệu kèm theo (JSON - Tùy chọn)">
                        <TextArea placeholder='{"screen": "Chat", "params": {"id": "123"}}' rows={2} />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 24 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            icon={<SendOutlined />}
                            block
                            style={{ height: 48, fontSize: 16 }}
                        >
                            Xem trước & Gửi
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            <Modal
                title="Xác nhận gửi thông báo"
                open={previewVisible}
                onOk={handleSend}
                onCancel={() => setPreviewVisible(false)}
                confirmLoading={loading}
                okText="Gửi ngay"
                cancelText="Hủy"
            >
                <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                    <p><strong>Tiêu đề:</strong> {previewData?.title}</p>
                    <p><strong>Nội dung:</strong> {previewData?.body}</p>
                    <p><strong>Đối tượng:</strong> {previewData?.target === 'all' ? 'Tất cả người dùng' : previewData?.target}</p>
                </div>
                <p style={{ marginTop: 16, color: '#ff4d4f' }}>
                    * Hành động này sẽ gửi thông báo đến hàng loạt thiết bị. Hãy kiểm tra kỹ nội dung.
                </p>
            </Modal>
        </div>
    );
};

export default Notifications;
