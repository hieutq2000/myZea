import React, { useState, useEffect } from 'react';
import { Card, Button, Table, message, Modal, Input, Upload, Typography, Tag, Space, Form, Row, Col, Popconfirm } from 'antd';
import {
    SafetyCertificateOutlined,
    PlusOutlined,
    DeleteOutlined,
    KeyOutlined,
    FileProtectOutlined,
    EditOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

interface Certificate {
    id: number;
    name: string;
    p12_filename: string;
    provision_filename: string;
    p12_password?: string;
    description?: string;
    is_active: boolean;
    created_at: string;
}

const Certificates: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [editingId, setEditingId] = useState<number | null>(null);

    const [p12File, setP12File] = useState<any>(null);
    const [provisionFile, setProvisionFile] = useState<any>(null);

    const fetchCertificates = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.get('/api/admin/certificates', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCertificates(response.data);
        } catch (error) {
            message.error('Không thể tải danh sách chứng chỉ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCertificates();
    }, []);

    const handleDelete = async (id: number) => {
        try {
            const token = localStorage.getItem('admin_token');
            await axios.delete(`/api/admin/certificates/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã xóa chứng chỉ');
            fetchCertificates();
        } catch (error) {
            message.error('Xóa thất bại');
        }
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const token = localStorage.getItem('admin_token');

            if (editingId) {
                // Update
                await axios.put(`/api/admin/certificates/${editingId}`, values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success('Cập nhật thành công');
            } else {
                // Create
                if (!p12File || !provisionFile) {
                    message.error('Vui lòng chọn đầy đủ file .p12 và .mobileprovision');
                    return;
                }

                const formData = new FormData();
                formData.append('p12', p12File);
                formData.append('provision', provisionFile);
                formData.append('name', values.name);
                formData.append('password', values.password || '');
                formData.append('description', values.description || '');

                await axios.post('/api/admin/certificates', formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                message.success('Thêm chứng chỉ thành công');
            }

            setIsModalOpen(false);
            form.resetFields();
            setP12File(null);
            setProvisionFile(null);
            setEditingId(null);
            fetchCertificates();
        } catch (error) {
            console.error(error);
            message.error('Lưu thất bại');
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: Certificate) => (
                <Space>
                    <SafetyCertificateOutlined style={{ color: record.is_active ? '#52c41a' : '#d9d9d9' }} />
                    <Text strong>{text}</Text>
                </Space>
            )
        },
        {
            title: 'Files',
            key: 'files',
            render: (_: any, record: Certificate) => (
                <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: 12 }}>P12: {record.p12_filename}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>Prov: {record.provision_filename}</Text>
                </Space>
            )
        },
        {
            title: 'Password',
            dataIndex: 'p12_password',
            key: 'password',
            render: (text: string) => text ? <Tag icon={<KeyOutlined />}>********</Tag> : <Text type="secondary">None</Text>
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'status',
            render: (active: boolean) => active ? <Tag color="green">Active</Tag> : <Tag color="default">Inactive</Tag>
        },
        {
            title: 'Created',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => new Date(date).toLocaleDateString('vi-VN')
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: Certificate) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditingId(record.id);
                            form.setFieldsValue({
                                name: record.name,
                                password: record.p12_password,
                                description: record.description,
                                is_active: record.is_active
                            });
                            setIsModalOpen(true);
                        }}
                    />
                    <Popconfirm
                        title="Xóa chứng chỉ?"
                        description="Hành động này không thể hoàn tác."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okType="danger"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Quản lý Chứng chỉ iOS</Title>
                    <Text type="secondary">Quản lý file .p12 và Mobile Provision để ký ứng dụng</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => {
                        setEditingId(null);
                        form.resetFields();
                        setIsModalOpen(true);
                    }}
                >
                    Thêm Chứng chỉ
                </Button>
            </div>

            <Card>
                <Table
                    columns={columns}
                    dataSource={certificates}
                    rowKey="id"
                    loading={loading}
                />
            </Card>

            <Modal
                title={editingId ? "Cập nhật Chứng chỉ" : "Thêm Chứng chỉ Mới"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleSave}
                width={600}
                destroyOnClose
            >
                <Form form={form} layout="vertical" initialValues={{ is_active: true }}>
                    <Form.Item name="name" label="Tên Chứng chỉ" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
                        <Input placeholder="Ví dụ: Cert 2025 - Vinalive" />
                    </Form.Item>

                    {!editingId && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="File .p12" required>
                                    <Upload
                                        accept=".p12"
                                        maxCount={1}
                                        beforeUpload={(file) => { setP12File(file); return false; }}
                                        onRemove={() => setP12File(null)}
                                    >
                                        <Button icon={<KeyOutlined />}>Chọn file .p12</Button>
                                    </Upload>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="File .mobileprovision" required>
                                    <Upload
                                        accept=".mobileprovision"
                                        maxCount={1}
                                        beforeUpload={(file) => { setProvisionFile(file); return false; }}
                                        onRemove={() => setProvisionFile(null)}
                                    >
                                        <Button icon={<FileProtectOutlined />}>Chọn file .provision</Button>
                                    </Upload>
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    <Form.Item name="password" label="Mật khẩu P12">
                        <Input.Password placeholder="Nhập mật khẩu file .p12 (nếu có)" />
                    </Form.Item>

                    <Form.Item name="description" label="Ghi chú">
                        <Input.TextArea rows={3} placeholder="Ghi chú về chứng chỉ này..." />
                    </Form.Item>

                    {editingId && (
                        <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                            <Input type="checkbox" />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default Certificates;
