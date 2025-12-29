import React, { useEffect, useState } from 'react';
import { Table, Avatar, Tag, Card, Button, message, Input, Space, Popconfirm, Modal, Form, InputNumber, Switch } from 'antd';
import { UserOutlined, SearchOutlined, EditOutlined, DeleteOutlined, PlusOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import axios from 'axios';

interface User {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    level: number;
    xp: number;
    created_at: string;
    is_banned?: boolean;
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

    // Create User States
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [createForm] = Form.useForm();
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.get('/api/admin/users', {
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
            await axios.delete(`/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã xóa người dùng');
            fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Có lỗi xảy ra khi xóa');
        }
    };

    const handleCreateUser = async () => {
        try {
            const values = await createForm.validateFields();
            setCreating(true);
            const token = localStorage.getItem('admin_token');

            await axios.post('/api/admin/users', values, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Tạo người dùng thành công');
            setIsCreateModalVisible(false);
            createForm.resetFields();
            fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Tạo thất bại');
        } finally {
            setCreating(false);
        }
    };

    const handleEditClick = (user: User) => {
        setEditingUser(user);
        form.setFieldsValue({
            name: user.name,
            email: user.email,
            level: user.level,
            xp: user.xp,
            is_banned: !!user.is_banned,
            resetPassword: ''
        });
        setIsModalVisible(true);
    };

    const handleUpdate = async () => {
        try {
            const values = await form.validateFields();
            setUpdating(true);
            const token = localStorage.getItem('admin_token');

            await axios.put(`/api/admin/users/${editingUser?.id}`, values, {
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

    const handleToggleBan = async (user: User) => {
        try {
            const token = localStorage.getItem('admin_token');
            await axios.put(`/api/admin/users/${user.id}`, {
                is_banned: !user.is_banned
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success(user.is_banned ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
            fetchUsers();
        } catch (error: any) {
            message.error('Thao tác thất bại');
        }
    };

    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchText.toLowerCase()) ||
            user.email.toLowerCase().includes(searchText.toLowerCase());

        if (!matchesSearch) return false;

        if (statusFilter === 'active') return !user.is_banned;
        if (statusFilter === 'banned') return user.is_banned;

        return true;
    });

    const handleResetAvatar = async (userId: string) => {
        try {
            const token = localStorage.getItem('admin_token');
            await axios.put(`/api/admin/users/${userId}/reset-avatar`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã reset avatar về mặc định');
            fetchUsers();
            setIsModalVisible(false);
        } catch (error) {
            message.error('Lỗi khi reset avatar');
        }
    };

    const columns = [
        {
            title: 'Avatar',
            dataIndex: 'avatar',
            key: 'avatar',
            render: (avatar: string, record: User) => (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <Avatar src={avatar} icon={<UserOutlined />} size="large" style={{ filter: record.is_banned ? 'grayscale(100%)' : 'none' }} />
                    {record.is_banned && <LockOutlined style={{ position: 'absolute', bottom: 0, right: 0, color: 'red', backgroundColor: '#fff', borderRadius: '50%', padding: 2 }} />}
                </div>
            ),
        },
        {
            title: 'Thông tin User',
            key: 'info',
            sorter: (a: User, b: User) => a.name.localeCompare(b.name),
            render: (_: any, record: User) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500, textDecoration: record.is_banned ? 'line-through' : 'none', color: record.is_banned ? '#999' : 'inherit' }}>
                        {record.name}
                    </span>
                    <span style={{ fontSize: 12, color: '#888' }}>{record.email}</span>
                    {record.is_banned && <Tag color="red" style={{ marginTop: 4, width: 'fit-content' }}>BANNED</Tag>}
                </div>
            )
        },
        {
            title: 'Cấp độ',
            dataIndex: 'level',
            key: 'level',
            width: 100,
            render: (level: number) => (
                <Tag color="geekblue" key={level}>
                    LV.{level}
                </Tag>
            ),
            sorter: (a: User, b: User) => a.level - b.level,
        },
        {
            title: 'Ngày tham gia',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
            sorter: (a: User, b: User) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_: any, record: User) => (
                <Space size="small">
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => handleEditClick(record)}
                        ghost
                        size="small"
                    >
                        Sửa
                    </Button>
                    <Popconfirm
                        title={record.is_banned ? "Mở khóa tài khoản này?" : "Khóa tài khoản này?"}
                        description={record.is_banned ? "Người dùng sẽ có thể đăng nhập lại." : "Người dùng sẽ không thể đăng nhập."}
                        onConfirm={() => handleToggleBan(record)}
                    >
                        <Button
                            type={record.is_banned ? "default" : "primary"}
                            danger={!record.is_banned}
                            icon={record.is_banned ? <UnlockOutlined /> : <LockOutlined />}
                            size="small"
                        >
                            {record.is_banned ? 'Mở' : 'Khóa'}
                        </Button>
                    </Popconfirm>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa user này?"
                        description="Hành động này không thể hoàn tác!"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa luôn"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ margin: 0 }}>Quản lý Người dùng ({users.length})</h2>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalVisible(true)}>
                        Tạo User
                    </Button>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#fff', padding: 12, borderRadius: 8 }}>
                    <Input
                        placeholder="Tìm kiếm theo tên, email..."
                        prefix={<SearchOutlined />}
                        style={{ width: 300 }}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                    />
                    <div style={{ borderLeft: '1px solid #f0f0f0', height: 24, margin: '0 8px' }} />
                    <Space>
                        <span>Trạng thái:</span>
                        <Button
                            type={statusFilter === 'all' ? 'primary' : 'default'}
                            size="small"
                            onClick={() => setStatusFilter('all')}
                        >
                            Tất cả
                        </Button>
                        <Button
                            type={statusFilter === 'active' ? 'primary' : 'default'}
                            size="small"
                            onClick={() => setStatusFilter('active')}
                        >
                            Hoạt động
                        </Button>
                        <Button
                            type={statusFilter === 'banned' ? 'primary' : 'default'}
                            danger={statusFilter === 'banned'}
                            size="small"
                            onClick={() => setStatusFilter('banned')}
                        >
                            Đã khóa
                        </Button>
                    </Space>
                </div>
            </div>

            <Card style={{ borderRadius: 8, marginTop: 16 }}>
                <Table
                    columns={columns}
                    dataSource={filteredUsers}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* Edit Modal */}
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

                    {editingUser?.avatar && (
                        <Form.Item label="Avatar hiện tại">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <Avatar src={editingUser.avatar} size="large" />
                                <Button
                                    danger
                                    size="small"
                                    onClick={() => handleResetAvatar(editingUser.id)}
                                >
                                    Reset về mặc định
                                </Button>
                            </div>
                        </Form.Item>
                    )}
                    <Form.Item name="is_banned" valuePropName="checked" label="Trạng thái">
                        <Switch checkedChildren="Đang bị chặn" unCheckedChildren="Hoạt động" />
                    </Form.Item>
                    <Form.Item
                        name="resetPassword"
                        label="Đặt lại mật khẩu mới"
                        extra="Để trống nếu không muốn thay đổi mật khẩu hiện tại."
                    >
                        <Input.Password placeholder="Nhập mật khẩu mới..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Create User Modal */}
            <Modal
                title="Tạo Người Dùng Mới"
                open={isCreateModalVisible}
                onOk={handleCreateUser}
                onCancel={() => setIsCreateModalVisible(false)}
                confirmLoading={creating}
            >
                <Form
                    form={createForm}
                    layout="vertical"
                >
                    <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
                        <Input placeholder="Ví dụ: Nguyen Van A" />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
                        <Input placeholder="example@email.com" />
                    </Form.Item>
                    <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6, message: 'Mật khẩu ít nhất 6 ký tự' }]}>
                        <Input.Password placeholder="******" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Users;
