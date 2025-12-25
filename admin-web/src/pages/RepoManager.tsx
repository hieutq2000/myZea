import React, { useState, useEffect } from 'react';
import {
    Card, Button, Table, message, Modal, Input, Form,
    Typography, Tag, Tabs, Space, Popconfirm, Divider,
    Row, Col, Alert, Tooltip, Badge, Empty
} from 'antd';
import {
    CloudSyncOutlined, EditOutlined, DeleteOutlined,
    PlusOutlined, CopyOutlined, ReloadOutlined,
    AppstoreOutlined, NotificationOutlined, SettingOutlined,
    CheckCircleOutlined, EyeOutlined,
    SyncOutlined, CloudUploadOutlined, AppleFilled
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface RepoApp {
    name: string;
    bundleIdentifier: string;
    developerName: string;
    subtitle: string;
    localizedDescription: string;
    iconURL: string;
    tintColor: string;
    screenshotURLs: string[];
    versions: Array<{
        version: string;
        date: string;
        size: number;
        downloadURL: string;
        localizedDescription: string;
        minOSVersion: string;
    }>;
    appPermissions?: {
        entitlements: string[];
        privacy: Record<string, string>;
    };
}

interface RepoNews {
    identifier: string;
    title: string;
    caption: string;
    date: string;
    tintColor: string;
    imageURL?: string;
    notify: boolean;
    appID?: string;
}

interface RepoData {
    name: string;
    identifier: string;
    subtitle: string;
    description: string;
    iconURL: string;
    headerURL: string;
    website: string;
    tintColor: string;
    featuredApps: string[];
    apps: RepoApp[];
    news: RepoNews[];
}

interface IpaFile {
    name: string;
    realFileName: string;
    size: number;
    createdAt: string;
    updatedAt?: string;
    appName: string;
    appSlug: string;
    version: string;
    bundleId: string;
    developer?: string;
    iconUrl?: string;
}

const RepoManager: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [repo, setRepo] = useState<RepoData | null>(null);
    const [activeTab, setActiveTab] = useState('store');

    // Forms
    const [storeForm] = Form.useForm();
    const [appForm] = Form.useForm();
    const [newsForm] = Form.useForm();

    // Modals
    const [appModalVisible, setAppModalVisible] = useState(false);
    const [newsModalVisible, setNewsModalVisible] = useState(false);
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [editingApp, setEditingApp] = useState<RepoApp | null>(null);

    // IPA Files
    const [ipaFiles, setIpaFiles] = useState<IpaFile[]>([]);
    const [ipaLoading, setIpaLoading] = useState(false);
    const [editingIpa, setEditingIpa] = useState<IpaFile | null>(null);
    const [ipaEditModalVisible, setIpaEditModalVisible] = useState(false);
    const [ipaEditForm] = Form.useForm();

    const fetchRepo = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.get('/api/admin/repo', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setRepo(response.data.data);
                storeForm.setFieldsValue(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch repo:', error);
            message.error('Không thể tải dữ liệu Repository');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRepo();
        fetchIpaFiles();
    }, []);

    const fetchIpaFiles = async () => {
        setIpaLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.get('/api/admin/ipas', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIpaFiles(response.data || []);
        } catch (error) {
            console.error('Failed to fetch IPAs:', error);
        } finally {
            setIpaLoading(false);
        }
    };

    const handleSyncIpa = async (ipaName: string) => {
        try {
            const timestamp = ipaName.replace('zyea_', '').replace('.ipa', '');
            const token = localStorage.getItem('admin_token');
            message.loading({ content: 'Đang sync lên Repo...', key: 'sync' });

            await axios.post(`/api/admin/repo/sync-ipa/${timestamp}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success({ content: 'Đã sync IPA lên Repository!', key: 'sync' });
            fetchRepo();
        } catch (error) {
            console.error('Failed to sync IPA:', error);
            message.error({ content: 'Sync thất bại', key: 'sync' });
        }
    };

    const handleDeleteIpa = async (fileName: string) => {
        try {
            const token = localStorage.getItem('admin_token');
            await axios.delete(`/api/admin/ipas/${fileName}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã xóa IPA!');
            fetchIpaFiles();
        } catch (error) {
            console.error('Failed to delete IPA:', error);
            message.error('Xóa IPA thất bại');
        }
    };

    const handleEditIpa = (ipa: IpaFile) => {
        setEditingIpa(ipa);
        ipaEditForm.setFieldsValue({
            appName: ipa.appName,
            version: ipa.version,
            bundleId: ipa.bundleId,
            developer: ipa.developer || 'Zyea Software',
            description: '',
            changelog: ''
        });
        setIpaEditModalVisible(true);
    };

    const handleSaveIpa = async () => {
        try {
            const values = await ipaEditForm.validateFields();
            if (!editingIpa) return;

            const timestamp = editingIpa.name.replace('zyea_', '').replace('.ipa', '');
            const token = localStorage.getItem('admin_token');

            message.loading({ content: 'Đang lưu...', key: 'saveIpa' });

            const formData = new FormData();
            formData.append('appName', values.appName);
            formData.append('version', values.version);
            formData.append('bundleId', values.bundleId);
            formData.append('developer', values.developer || '');
            formData.append('description', values.description || '');
            formData.append('changelog', values.changelog || '');

            await axios.put(`/api/admin/ipas/${timestamp}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            message.success({ content: 'Đã cập nhật thông tin IPA!', key: 'saveIpa' });
            setIpaEditModalVisible(false);
            setEditingIpa(null);
            ipaEditForm.resetFields();
            fetchIpaFiles();

            // Auto sync to repo after edit
            await handleSyncIpa(editingIpa.name);
        } catch (error) {
            console.error('Failed to save IPA:', error);
            message.error({ content: 'Lưu thất bại', key: 'saveIpa' });
        }
    };

    const handleSaveStore = async (values: Partial<RepoData>) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('admin_token');
            await axios.patch('/api/admin/repo/store', values, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã cập nhật thông tin Store!');
            fetchRepo();
        } catch (error) {
            console.error('Failed to save store:', error);
            message.error('Lưu thất bại');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveApp = async () => {
        try {
            const values = await appForm.validateFields();
            const token = localStorage.getItem('admin_token');

            // Parse screenshots if string
            if (typeof values.screenshotURLs === 'string') {
                values.screenshotURLs = values.screenshotURLs.split('\n').filter((s: string) => s.trim());
            }

            await axios.post('/api/admin/repo/apps', values, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success(editingApp ? 'Đã cập nhật App!' : 'Đã thêm App mới!');
            setAppModalVisible(false);
            setEditingApp(null);
            appForm.resetFields();
            fetchRepo();
        } catch (error) {
            console.error('Failed to save app:', error);
            message.error('Lưu App thất bại');
        }
    };

    const handleDeleteApp = async (bundleId: string) => {
        try {
            const token = localStorage.getItem('admin_token');
            await axios.delete(`/api/admin/repo/apps/${encodeURIComponent(bundleId)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã xóa App khỏi Repository');
            fetchRepo();
        } catch (error) {
            console.error('Failed to delete app:', error);
            message.error('Xóa App thất bại');
        }
    };

    const handleSaveNews = async () => {
        try {
            const values = await newsForm.validateFields();
            const token = localStorage.getItem('admin_token');

            await axios.post('/api/admin/repo/news', values, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Đã thêm Tin tức mới!');
            setNewsModalVisible(false);
            newsForm.resetFields();
            fetchRepo();
        } catch (error) {
            console.error('Failed to save news:', error);
            message.error('Lưu Tin tức thất bại');
        }
    };

    const handleDeleteNews = async (newsId: string) => {
        try {
            const token = localStorage.getItem('admin_token');
            await axios.delete(`/api/admin/repo/news/${encodeURIComponent(newsId)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã xóa Tin tức');
            fetchRepo();
        } catch (error) {
            console.error('Failed to delete news:', error);
            message.error('Xóa Tin tức thất bại');
        }
    };

    const copyRepoLink = () => {
        const link = 'https://data5g.site/source.json';
        navigator.clipboard.writeText(link);
        message.success('Đã sao chép link Repository!');
    };

    const openEditApp = (app: RepoApp) => {
        setEditingApp(app);
        appForm.setFieldsValue({
            ...app,
            screenshotURLs: app.screenshotURLs?.join('\n') || ''
        });
        setAppModalVisible(true);
    };

    const openAddApp = () => {
        setEditingApp(null);
        appForm.resetFields();
        appForm.setFieldsValue({
            tintColor: '#f97316',
            versions: []
        });
        setAppModalVisible(true);
    };

    const appColumns = [
        {
            title: 'Icon',
            dataIndex: 'iconURL',
            key: 'icon',
            width: 70,
            render: (url: string) => (
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            )
        },
        {
            title: 'Tên App',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: RepoApp) => (
                <div>
                    <Text strong>{text}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.bundleIdentifier}</Text>
                </div>
            )
        },
        {
            title: 'Version',
            key: 'version',
            render: (_: unknown, record: RepoApp) => (
                <Tag color="green">
                    v{record.versions?.[0]?.version || 'N/A'}
                </Tag>
            )
        },
        {
            title: 'Versions',
            key: 'versions',
            render: (_: unknown, record: RepoApp) => (
                <Badge count={record.versions?.length || 0} style={{ backgroundColor: '#1890ff' }} />
            )
        },
        {
            title: 'Developer',
            dataIndex: 'developerName',
            key: 'developer',
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_: unknown, record: RepoApp) => (
                <Space>
                    <Tooltip title="Chỉnh sửa">
                        <Button type="text" icon={<EditOutlined />} onClick={() => openEditApp(record)} />
                    </Tooltip>
                    <Popconfirm
                        title="Xóa App này?"
                        description="App sẽ bị xóa khỏi Repository"
                        onConfirm={() => handleDeleteApp(record.bundleIdentifier)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const newsColumns = [
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'Mô tả',
            dataIndex: 'caption',
            key: 'caption',
            ellipsis: true
        },
        {
            title: 'Ngày',
            dataIndex: 'date',
            key: 'date',
            width: 120,
            render: (date: string) => new Date(date).toLocaleDateString('vi-VN')
        },
        {
            title: 'Notify',
            dataIndex: 'notify',
            key: 'notify',
            width: 80,
            render: (notify: boolean) => notify ?
                <Tag color="green">ON</Tag> :
                <Tag color="default">OFF</Tag>
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 80,
            render: (_: unknown, record: RepoNews) => (
                <Popconfirm
                    title="Xóa tin này?"
                    onConfirm={() => handleDeleteNews(record.identifier)}
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    const tabItems = [
        {
            key: 'store',
            label: (
                <span><SettingOutlined /> Store Info</span>
            ),
            children: (
                <Card>
                    <Form
                        form={storeForm}
                        layout="vertical"
                        onFinish={handleSaveStore}
                    >
                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item name="name" label="Tên Store" rules={[{ required: true }]}>
                                    <Input placeholder="myZyea Official Store" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="identifier" label="Identifier">
                                    <Input placeholder="com.zyea.source" disabled />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item name="subtitle" label="Subtitle">
                            <Input placeholder="Kho ứng dụng chính thức" />
                        </Form.Item>

                        <Form.Item name="description" label="Mô tả">
                            <TextArea rows={3} placeholder="Mô tả chi tiết về Store..." />
                        </Form.Item>

                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item name="iconURL" label="Icon URL">
                                    <Input placeholder="https://..." />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="headerURL" label="Header URL">
                                    <Input placeholder="https://..." />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item name="website" label="Website">
                                    <Input placeholder="https://data5g.site" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="tintColor" label="Màu chủ đạo">
                                    <Input placeholder="#f97316" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider />

                        <Button type="primary" htmlType="submit" loading={saving} icon={<CheckCircleOutlined />}>
                            Lưu thay đổi
                        </Button>
                    </Form>
                </Card>
            )
        },
        {
            key: 'apps',
            label: (
                <span><AppstoreOutlined /> Apps ({repo?.apps?.length || 0})</span>
            ),
            children: (
                <Card
                    title="Ứng dụng trong Repository"
                    extra={
                        <Button type="primary" icon={<PlusOutlined />} onClick={openAddApp}>
                            Thêm App
                        </Button>
                    }
                >
                    <Table
                        columns={appColumns}
                        dataSource={repo?.apps || []}
                        rowKey="bundleIdentifier"
                        loading={loading}
                        locale={{
                            emptyText: (
                                <Empty description="Chưa có App nào">
                                    <Button type="primary" onClick={openAddApp}>Thêm App đầu tiên</Button>
                                </Empty>
                            )
                        }}
                    />
                </Card>
            )
        },
        {
            key: 'news',
            label: (
                <span><NotificationOutlined /> News ({repo?.news?.length || 0})</span>
            ),
            children: (
                <Card
                    title="Tin tức & Thông báo"
                    extra={
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                            newsForm.resetFields();
                            newsForm.setFieldsValue({
                                tintColor: '#f97316',
                                notify: true,
                                date: new Date().toISOString().split('T')[0]
                            });
                            setNewsModalVisible(true);
                        }}>
                            Thêm Tin
                        </Button>
                    }
                >
                    <Table
                        columns={newsColumns}
                        dataSource={repo?.news || []}
                        rowKey="identifier"
                        loading={loading}
                        locale={{
                            emptyText: <Empty description="Chưa có tin tức" />
                        }}
                    />
                </Card>
            )
        },
        {
            key: 'ipas',
            label: (
                <span><AppleFilled /> IPA Files ({ipaFiles.length})</span>
            ),
            children: (
                <Card
                    title="IPA Files đã Upload"
                    extra={
                        <Button icon={<ReloadOutlined />} onClick={fetchIpaFiles} loading={ipaLoading}>
                            Làm mới
                        </Button>
                    }
                >
                    <Alert
                        message="Sync IPA lên Repository"
                        description="Click nút 'Sync to Repo' để cập nhật IPA vào source.json. Khi upload IPA mới, hệ thống sẽ tự động sync."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                    <Table
                        columns={[
                            {
                                title: 'Icon',
                                dataIndex: 'iconUrl',
                                key: 'icon',
                                width: 70,
                                render: (url: string) => (
                                    url ? (
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 12,
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                        }}>
                                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ) : (
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 12,
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <AppleFilled style={{ fontSize: 24, color: 'white' }} />
                                        </div>
                                    )
                                )
                            },
                            {
                                title: 'App',
                                key: 'app',
                                render: (_: unknown, record: IpaFile) => (
                                    <div>
                                        <Text strong>{record.appName}</Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 12 }}>{record.bundleId}</Text>
                                    </div>
                                )
                            },
                            {
                                title: 'Version',
                                dataIndex: 'version',
                                key: 'version',
                                render: (v: string) => <Tag color="green">v{v}</Tag>
                            },
                            {
                                title: 'Size',
                                dataIndex: 'size',
                                key: 'size',
                                render: (size: number) => `${(size / 1024 / 1024).toFixed(1)} MB`
                            },
                            {
                                title: 'Ngày tạo',
                                dataIndex: 'createdAt',
                                key: 'createdAt',
                                render: (date: string) => new Date(date).toLocaleDateString('vi-VN')
                            },
                            {
                                title: 'Actions',
                                key: 'actions',
                                width: 180,
                                render: (_: unknown, record: IpaFile) => (
                                    <Space>
                                        <Tooltip title="Chỉnh sửa thông tin">
                                            <Button
                                                icon={<EditOutlined />}
                                                size="small"
                                                onClick={() => handleEditIpa(record)}
                                            />
                                        </Tooltip>
                                        <Tooltip title="Sync lên Repository">
                                            <Button
                                                type="primary"
                                                icon={<CloudUploadOutlined />}
                                                size="small"
                                                onClick={() => handleSyncIpa(record.name)}
                                            >
                                                Sync
                                            </Button>
                                        </Tooltip>
                                        <Popconfirm
                                            title="Xóa IPA này?"
                                            description="File sẽ bị xóa vĩnh viễn"
                                            onConfirm={() => handleDeleteIpa(record.name)}
                                            okText="Xóa"
                                            cancelText="Hủy"
                                        >
                                            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                                        </Popconfirm>
                                    </Space>
                                )
                            }
                        ]}
                        dataSource={ipaFiles}
                        rowKey="name"
                        loading={ipaLoading}
                        locale={{
                            emptyText: <Empty description="Chưa có IPA nào. Vào trang IPA Files để upload." />
                        }}
                    />
                </Card>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>
                        <CloudSyncOutlined style={{ marginRight: 12, color: '#1890ff' }} />
                        Quản lý AltStore Repository
                    </Title>
                    <Text type="secondary">
                        Quản lý source.json cho AltStore / SideStore
                    </Text>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchRepo} loading={loading}>
                        Làm mới
                    </Button>
                    <Button icon={<EyeOutlined />} onClick={() => setPreviewModalVisible(true)}>
                        Xem JSON
                    </Button>
                    <Button type="primary" icon={<CopyOutlined />} onClick={copyRepoLink}>
                        Copy Link Repo
                    </Button>
                </Space>
            </div>

            {/* Info Alert */}
            <Alert
                message="Tự động đồng bộ"
                description={
                    <span>
                        Khi bạn upload IPA mới qua trang <b>IPA Files</b>, Repository sẽ tự động được cập nhật.
                        Link Repository: <a href="https://data5g.site/source.json" target="_blank" rel="noreferrer">
                            https://data5g.site/source.json
                        </a>
                    </span>
                }
                type="info"
                showIcon
                icon={<SyncOutlined spin />}
                style={{ marginBottom: 24 }}
            />

            {/* Tabs */}
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                type="card"
            />

            {/* App Modal */}
            <Modal
                title={editingApp ? 'Chỉnh sửa App' : 'Thêm App mới'}
                open={appModalVisible}
                onCancel={() => {
                    setAppModalVisible(false);
                    setEditingApp(null);
                    appForm.resetFields();
                }}
                onOk={handleSaveApp}
                width={700}
                okText={editingApp ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
            >
                <Form form={appForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="name" label="Tên App" rules={[{ required: true }]}>
                                <Input placeholder="myZyea" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="bundleIdentifier" label="Bundle ID" rules={[{ required: true }]}>
                                <Input placeholder="com.zyea.mobile" disabled={!!editingApp} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="developerName" label="Developer">
                                <Input placeholder="myZyea Team" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="tintColor" label="Tint Color">
                                <Input placeholder="#f97316" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="subtitle" label="Subtitle">
                        <Input placeholder="Mô tả ngắn..." />
                    </Form.Item>

                    <Form.Item name="localizedDescription" label="Mô tả chi tiết">
                        <TextArea rows={4} placeholder="Mô tả đầy đủ về app..." />
                    </Form.Item>

                    <Form.Item name="iconURL" label="Icon URL">
                        <Input placeholder="https://data5g.site/assets/icon.png" />
                    </Form.Item>

                    <Form.Item name="screenshotURLs" label="Screenshot URLs (mỗi dòng 1 URL)">
                        <TextArea rows={3} placeholder="https://...&#10;https://..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* News Modal */}
            <Modal
                title="Thêm Tin tức"
                open={newsModalVisible}
                onCancel={() => {
                    setNewsModalVisible(false);
                    newsForm.resetFields();
                }}
                onOk={handleSaveNews}
                width={600}
                okText="Thêm"
                cancelText="Hủy"
            >
                <Form form={newsForm} layout="vertical">
                    <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
                        <Input placeholder="🎉 App v1.0.0 đã ra mắt!" />
                    </Form.Item>

                    <Form.Item name="caption" label="Mô tả ngắn">
                        <TextArea rows={2} placeholder="Phiên bản mới với nhiều tính năng..." />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="date" label="Ngày">
                                <Input placeholder="2024-12-25" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="tintColor" label="Tint Color">
                                <Input placeholder="#f97316" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="imageURL" label="Image URL (tùy chọn)">
                        <Input placeholder="https://..." />
                    </Form.Item>

                    <Form.Item name="appID" label="App ID (Bundle ID, tùy chọn)">
                        <Input placeholder="com.zyea.mobile" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* JSON Preview Modal */}
            <Modal
                title="Preview source.json"
                open={previewModalVisible}
                onCancel={() => setPreviewModalVisible(false)}
                footer={[
                    <Button key="copy" icon={<CopyOutlined />} onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(repo, null, 2));
                        message.success('Đã sao chép JSON!');
                    }}>
                        Copy JSON
                    </Button>,
                    <Button key="close" type="primary" onClick={() => setPreviewModalVisible(false)}>
                        Đóng
                    </Button>
                ]}
                width={800}
            >
                <div style={{
                    background: '#1e1e1e',
                    padding: 16,
                    borderRadius: 8,
                    maxHeight: 500,
                    overflow: 'auto'
                }}>
                    <pre style={{
                        color: '#d4d4d4',
                        margin: 0,
                        fontSize: 12,
                        fontFamily: 'Consolas, Monaco, monospace'
                    }}>
                        {JSON.stringify(repo, null, 2)}
                    </pre>
                </div>
            </Modal>

            {/* IPA Edit Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AppleFilled style={{ color: '#1890ff' }} />
                        <span>Chỉnh sửa thông tin IPA</span>
                    </div>
                }
                open={ipaEditModalVisible}
                onCancel={() => {
                    setIpaEditModalVisible(false);
                    setEditingIpa(null);
                    ipaEditForm.resetFields();
                }}
                onOk={handleSaveIpa}
                width={600}
                okText="Lưu & Sync lên Repo"
                cancelText="Hủy"
            >
                <Alert
                    message="Sau khi lưu, thông tin sẽ tự động được cập nhật lên Repository (source.json)"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
                <Form form={ipaEditForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="appName" label="Tên App" rules={[{ required: true }]}>
                                <Input placeholder="myZyea" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="version" label="Version" rules={[{ required: true }]}>
                                <Input placeholder="1.0.6" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="bundleId" label="Bundle ID" rules={[{ required: true }]}>
                        <Input placeholder="com.zyea.mobile" />
                    </Form.Item>

                    <Form.Item name="developer" label="Developer">
                        <Input placeholder="myZyea Team" />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả ngắn (Subtitle)">
                        <Input placeholder="Mạng xã hội chia sẻ, chat nội bộ, tích hợp AI" />
                    </Form.Item>

                    <Form.Item name="changelog" label="Tính năng mới (What's New)">
                        <TextArea
                            rows={4}
                            placeholder="• Cập nhật giao diện mới&#10;• Sửa lỗi và cải thiện hiệu năng&#10;• Thêm tính năng chat AI"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default RepoManager;
