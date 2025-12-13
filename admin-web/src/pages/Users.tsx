import React, { useEffect, useState } from 'react';
import { Table, Avatar, Tag, Card, Button, message, Input, Space, Popconfirm, Modal, Form, InputNumber } from 'antd';
import { UserOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

interface User {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    level: number;
    xp: number;
    created_at: string;
}

const Users: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');

    // Modal Edit States
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form] = Form.useForm();
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.get('http://localhost:3001/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error(error);
            message.error('Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const token = localStorage.getItem('admin_token');
            await axios.delete(`http://localhost:3001/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã xóa người dùng');
            fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Có lỗi xảy ra khi xóa');
        }
    };

    const handleEditClick = (user: User) => {
        setEditingUser(user);
        form.setFieldsValue({
            name: user.name,
            email: user.email,
            level: user.level,
            xp: user.xp,
            resetPassword: ''
        });
        setIsModalVisible(true);
    };

    const handleUpdate = async () => {
        try {
            const values = await form.validateFields();
            setUpdating(true);
            const token = localStorage.getItem('admin_token');

            await axios.put(`http://localhost:3001/api/admin/users/${editingUser?.id}`, values, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Cập nhật thành công!');
            setIsModalVisible(false);
            fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Cập nhật thất bại');
        } finally {
            setUpdating(false);
        }
    };

    const columns = [
        {
            title: 'Avatar',
            dataIndex: 'avatar',
            key: 'avatar',
            render: (avatar: string) => (
                <Avatar src={avatar} icon={<UserOutlined />} size="large" />
            ),
        },
        {
            title: 'Tên hiển thị',
            dataIndex: 'name',
            key: 'name',
            sorter: (a: User, b: User) => a.name.localeCompare(b.name),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Cấp độ',
            dataIndex: 'level',
            key: 'level',
            render: (level: number) => (
                <Tag color="geekblue" key={level}>
                    LV.{level}
                </Tag>
            ),
            sorter: (a: User, b: User) => a.level - b.level,
        },
        {
            title: 'XP',
            dataIndex: 'xp',
            key: 'xp',
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_: any, record: User) => (
                <Space size="middle">
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => handleEditClick(record)}
                        ghost
                    >
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa user này?"
                        description="Hành động này không thể hoàn tác!"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa luôn"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="primary"
                            danger
                            icon={<DeleteOutlined />}
                        >
                            Xóa
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0 }}>Quản lý Người dùng ({users.length})</h2>
                <Input
                    placeholder="Tìm kiếm user..."
                    prefix={<SearchOutlined />}
                    style={{ width: 300 }}
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                />
            </div>

            <Card style={{ borderRadius: 8 }}>
                <Table
                    columns={columns}
                    dataSource={filteredUsers}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={`Chỉnh sửa: ${editingUser?.name}`}
                open={isModalVisible}
                onOk={handleUpdate}
                onCancel={() => setIsModalVisible(false)}
                confirmLoading={updating}
            >
                <Form
                    form={form}
                    layout="vertical"
                >
                    <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                        <Input />
                    </Form.Item>
                    <Space style={{ display: 'flex', width: '100%' }} align="start">
                        <Form.Item name="level" label="Level" style={{ flex: 1 }}>
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="xp" label="XP" style={{ flex: 1 }}>
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                    </Space>
                    <Form.Item
                        name="resetPassword"
                        label="Đặt lại mật khẩu mới (Chỉ nhập nếu muốn đổi)"
                        extra="Để trống nếu không muốn thay đổi mật khẩu hiện tại."
                    >
                        <Input.Password placeholder="Nhập mật khẩu mới..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Users;
