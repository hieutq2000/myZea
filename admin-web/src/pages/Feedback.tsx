import React, { useEffect, useState } from 'react';
import { Table, Card, Button, message, Tag, Space, Select, Image, Typography } from 'antd';
import { UserOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

interface Feedback {
    id: string;
    type: 'feedback' | 'bug';
    content: string;
    context: string;
    media_urls: string[];
    status: 'pending' | 'processing' | 'resolved' | 'rejected';
    created_at: string;
    user_name: string;
    user_email: string;
    user_avatar: string;
}

const FeedbackPage: React.FC = () => {
    const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.get('/api/admin/feedback', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeedbackList(response.data);
        } catch (error) {
            console.error(error);
            message.error('Không thể tải danh sách phản hồi');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const token = localStorage.getItem('admin_token');
            await axios.put(`/api/admin/feedback/${id}`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã cập nhật trạng thái');
            fetchFeedback();
        } catch (error) {
            message.error('Có lỗi xảy ra');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bạn có chắc muốn xóa phản hồi này không?')) return;
        try {
            const token = localStorage.getItem('admin_token');
            await axios.delete(`/api/admin/feedback/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã xóa phản hồi');
            setFeedbackList(feedbackList.filter(item => item.id !== id));
        } catch (error) {
            message.error('Không thể xóa phản hồi');
        }
    };

    const getFullUrl = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return url; // Relative path is fine now, handled by proxy if accessing via same domain
    };

    const columns = [
        {
            title: 'Người gửi',
            key: 'user',
            render: (_: any, record: Feedback) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {record.user_avatar ? (
                        <img src={getFullUrl(record.user_avatar)} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                    ) : <UserOutlined />}
                    <div>
                        <div style={{ fontWeight: 500 }}>{record.user_name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{record.user_email}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => type === 'bug' ? <Tag color="red">Báo lỗi</Tag> : <Tag color="blue">Góp ý</Tag>
        },
        {
            title: 'Nội dung',
            dataIndex: 'content',
            key: 'content',
            width: '30%',
            render: (content: string, record: Feedback) => (
                <div>
                    <Text>{content}</Text>
                    {record.context && (
                        <div style={{ marginTop: 5, fontSize: 12, color: '#888', fontStyle: 'italic' }}>
                            Ngữ cảnh: {record.context}
                        </div>
                    )}
                </div>
            )
        },
        {
            title: 'Ảnh/Video',
            key: 'media',
            render: (_: any, record: Feedback) => {
                let media = record.media_urls;
                if (typeof media === 'string') {
                    try {
                        media = JSON.parse(media);
                    } catch (e) {
                        media = [];
                    }
                }
                if (!Array.isArray(media)) media = [];

                return (
                    <Space>
                        {media.map((url, index) => (
                            <Image
                                key={index}
                                width={50}
                                src={getFullUrl(url)}
                                style={{ borderRadius: 4 }}
                            />
                        ))}
                    </Space>
                );
            }
        },
        {
            title: 'Thời gian',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => new Date(date).toLocaleString('vi-VN')
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: string, record: Feedback) => (
                <Select
                    defaultValue={status}
                    style={{ width: 140 }}
                    onChange={(value) => handleStatusChange(record.id, value)}
                >
                    <Option value="pending">⏳ Đang chờ</Option>
                    <Option value="processing">⚙️ Đang xử lý</Option>
                    <Option value="resolved">✅ Đã xong</Option>
                    <Option value="rejected">❌ Từ chối</Option>
                </Select>
            )
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_: any, record: Feedback) => (
                <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(record.id)}
                />
            )
        }
    ];

    return (
        <div>
            <Title level={3}>Quản lý Phản hồi & Báo lỗi</Title>
            <Card>
                <Table
                    columns={columns}
                    dataSource={feedbackList}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </div>
    );
};

export default FeedbackPage;
