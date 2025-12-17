import React, { useEffect, useState } from 'react';
import { Table, Avatar, Button, message, Image, Popconfirm, Card } from 'antd';
import { DeleteOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';

interface Post {
    id: string;
    content: string;
    image_url: string | null;
    created_at: string;
    author_name: string;
    author_avatar: string | null;
}

const Content: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.get('/api/admin/posts', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPosts(response.data);
        } catch (error) {
            console.error(error);
            message.error('Không thể tải bài viết');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const token = localStorage.getItem('admin_token');
            await axios.delete(`/api/admin/posts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã xóa bài viết');
            fetchPosts();
        } catch (error: any) {
            message.error('Lỗi khi xóa bài viết');
        }
    };

    const columns = [
        {
            title: 'Người đăng',
            key: 'author',
            render: (record: Post) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar src={record.author_avatar} icon={<UserOutlined />} />
                    <span>{record.author_name}</span>
                </div>
            ),
        },
        {
            title: 'Nội dung',
            key: 'content',
            width: '40%',
            render: (record: Post) => (
                <div>
                    <p>{record.content}</p>
                    {record.image_url && (
                        <Image
                            width={100}
                            src={record.image_url}
                            style={{ borderRadius: 8 }}
                        />
                    )}
                </div>
            ),
        },
        {
            title: 'Thời gian',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => new Date(date).toLocaleString('vi-VN'),
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_: any, record: Post) => (
                <Popconfirm
                    title="Xóa bài viết này?"
                    description="Hành động này không thể hoàn tác"
                    onConfirm={() => handleDelete(record.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                >
                    <Button danger icon={<DeleteOutlined />}>Xóa</Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div>
            <h2 style={{ marginBottom: 16 }}>Kiểm duyệt Nội dung ({posts.length} bài)</h2>
            <Card>
                <Table
                    columns={columns}
                    dataSource={posts}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 5 }}
                />
            </Card>
        </div>
    );
};

export default Content;
