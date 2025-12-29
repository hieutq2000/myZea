import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, message, Button, Space, Table, Avatar, Tag } from 'antd';
import {
    UserOutlined,
    FileTextOutlined,
    TeamOutlined,
    CustomerServiceOutlined,
    ArrowUpOutlined,
    ReloadOutlined,
    RocketOutlined,
    ClockCircleOutlined,
    MessageOutlined
} from '@ant-design/icons';
import { Line, Column } from '@ant-design/charts';
import axios from 'axios';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

interface Stats {
    users: number;
    posts: number;
    groups: number;
    pendingFeedback: number;
    uptime: number;
}

interface ChartData {
    usersPerDay: { date: string; count: number }[];
    postsPerDay: { date: string; count: number }[];
    messagesPerDay: { date: string; count: number }[];
    recentUsers: { id: string; name: string; email: string; avatar: string; created_at: string }[];
}

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        fetchStats();
        fetchChartData();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.get('/api/admin/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data);
        } catch (error) {
            console.error(error);
            message.error('Không thể tải thống kê');
        } finally {
            setLoading(false);
        }
    };

    const fetchChartData = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.get('/api/admin/stats/charts', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChartData(response.data);
        } catch (error) {
            console.error('Chart data error:', error);
        }
    };

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };

    const StatCard = ({ title, value, icon, color, suffix, link }: any) => (
        <Card
            bordered={false}
            hoverable
            style={{
                height: '100%',
                borderRadius: 16,
                background: `linear-gradient(135deg, ${color[0]} 0%, ${color[1]} 100%)`,
                boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.15, transform: 'rotate(-15deg)' }}>
                {React.cloneElement(icon, { style: { fontSize: 100, color: '#fff' } })}
            </div>

            <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>{title}</span>}
                value={value}
                prefix={<span style={{ color: '#fff', marginRight: 8 }}>{icon}</span>}
                valueStyle={{ color: '#fff', fontWeight: 700, fontSize: 36 }}
                suffix={suffix}
            />
            {link && (
                <div style={{ marginTop: 16 }}>
                    <Link to={link} style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Xem chi tiết <ArrowUpOutlined rotate={45} />
                    </Link>
                </div>
            )}
        </Card>
    );

    // Prepare chart data
    const activityData = chartData ? [
        ...chartData.usersPerDay.map(d => ({ date: formatDate(d.date), value: d.count, type: 'Users mới' })),
        ...chartData.postsPerDay.map(d => ({ date: formatDate(d.date), value: d.count, type: 'Bài viết' })),
        ...chartData.messagesPerDay.map(d => ({ date: formatDate(d.date), value: d.count, type: 'Tin nhắn' })),
    ] : [];

    const lineConfig = {
        data: activityData,
        xField: 'date',
        yField: 'value',
        seriesField: 'type',
        smooth: true,
        animation: { appear: { animation: 'wave-in' } },
        color: ['#667eea', '#ff9966', '#11998e'],
        legend: { position: 'top' as const },
        point: { size: 4, shape: 'circle' },
    };

    const usersColumnData = chartData?.usersPerDay.map(d => ({
        date: formatDate(d.date),
        count: d.count
    })) || [];

    const columnConfig = {
        data: usersColumnData,
        xField: 'date',
        yField: 'count',
        color: '#667eea',
        columnWidthRatio: 0.6,
        label: {
            position: 'top' as const,
            style: { fill: '#666', fontSize: 12 }
        },
    };

    const recentUsersColumns = [
        {
            title: 'Người dùng',
            key: 'user',
            render: (_: any, record: any) => (
                <Space>
                    <Avatar src={record.avatar} icon={<UserOutlined />} />
                    <div>
                        <div style={{ fontWeight: 500 }}>{record.name}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'Ngày đăng ký',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => (
                <Tag color="blue">{new Date(date).toLocaleDateString('vi-VN')}</Tag>
            )
        }
    ];

    return (
        <div style={{ paddingBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
                    <Text type="secondary">Tổng quan hệ thống • {currentTime.toLocaleTimeString('vi-VN')}</Text>
                </div>
                <Button
                    icon={<ReloadOutlined spin={loading} />}
                    onClick={() => { fetchStats(); fetchChartData(); }}
                    shape="circle"
                    size="large"
                />
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Người dùng"
                        value={stats?.users || 0}
                        icon={<UserOutlined />}
                        color={['#667eea', '#764ba2']}
                        link="/users"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Bài viết"
                        value={stats?.posts || 0}
                        icon={<FileTextOutlined />}
                        color={['#ff9966', '#ff5e62']}
                        link="/content"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Nhóm"
                        value={stats?.groups || 0}
                        icon={<TeamOutlined />}
                        color={['#11998e', '#38ef7d']}
                        link="/content"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Phản hồi chờ"
                        value={stats?.pendingFeedback || 0}
                        icon={<CustomerServiceOutlined />}
                        color={['#f2709c', '#ff9472']}
                        suffix={(stats?.pendingFeedback || 0) > 0 ? <span style={{ fontSize: 14, background: 'white', color: '#ff5e62', padding: '2px 8px', borderRadius: 10, verticalAlign: 'middle', marginLeft: 8 }}>Mới</span> : null}
                        link="/feedback"
                    />
                </Col>
            </Row>

            {/* Charts Section */}
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={16}>
                    <Card
                        title={<Space><MessageOutlined /> Hoạt động 7 ngày qua</Space>}
                        bordered={false}
                        style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                    >
                        {activityData.length > 0 ? (
                            <Line {...lineConfig} height={280} />
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                                Chưa có dữ liệu
                            </div>
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card
                        title={<Space><UserOutlined /> Users mới theo ngày</Space>}
                        bordered={false}
                        style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                    >
                        {usersColumnData.length > 0 ? (
                            <Column {...columnConfig} height={280} />
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                                Chưa có dữ liệu
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* System Info & Recent Users */}
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={12}>
                    <Card
                        title={<Title level={4} style={{ margin: 0 }}>Hệ thống</Title>}
                        bordered={false}
                        style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                    >
                        <Row gutter={[24, 24]}>
                            <Col span={12}>
                                <Statistic
                                    title="Thời gian hoạt động (Uptime)"
                                    value={stats ? formatUptime(stats.uptime) : '-'}
                                    prefix={<ClockCircleOutlined />}
                                />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="Trạng thái Server"
                                    value="Online"
                                    valueStyle={{ color: '#3f8600' }}
                                    prefix={<RocketOutlined />}
                                />
                            </Col>
                        </Row>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card
                        title={<Space><UserOutlined /> Người dùng mới nhất</Space>}
                        bordered={false}
                        style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                        extra={<Link to="/users">Xem tất cả</Link>}
                    >
                        <Table
                            dataSource={chartData?.recentUsers || []}
                            columns={recentUsersColumns}
                            pagination={false}
                            size="small"
                            rowKey="id"
                        />
                    </Card>
                </Col>
            </Row>

            {/* Quick Links */}
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col xs={24}>
                    <Card
                        title="Truy cập nhanh"
                        bordered={false}
                        style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                    >
                        <Space wrap>
                            <Link to="/ipa-manager">
                                <Button size="large" icon={<RocketOutlined />}>Quản lý IPA</Button>
                            </Link>
                            <Link to="/users">
                                <Button size="large" icon={<UserOutlined />}>Quản lý User</Button>
                            </Link>
                            <Link to="/notifications">
                                <Button size="large" icon={<MessageOutlined />}>Gửi thông báo</Button>
                            </Link>
                            <Link to="/feedback">
                                <Button size="large" icon={<CustomerServiceOutlined />}>Phản hồi</Button>
                            </Link>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
