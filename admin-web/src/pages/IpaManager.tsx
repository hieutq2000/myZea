import React, { useState, useEffect } from 'react';
import { Card, Button, Table, message, Modal, Input, Upload, Dropdown, Typography, Tag, Empty, Form, Divider, Row, Col, Progress, Select, Space } from 'antd';
import { UploadOutlined, MoreOutlined, DownloadOutlined, DeleteOutlined, AppleFilled, SearchOutlined, AndroidOutlined, AppleOutlined, SaveOutlined, InboxOutlined, PictureOutlined, EditOutlined, BarChartOutlined, RocketOutlined, GlobalOutlined, ShareAltOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import type { MenuProps, UploadProps } from 'antd';
import axios from 'axios';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface IpaFile {
    name: string;
    size: number;
    createdAt: string;
    appName?: string;
    appSlug?: string;
    bundleId?: string;
    version?: string;
    iconUrl?: string;
    installLink?: string;
    directLink?: string;
    shortLink?: string;
    appPageLink?: string;
    testFlightLink?: string;
    developer?: string;
    supportEmail?: string;
    description?: string;
    changelog?: string;
}

const IpaManager: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [ipaFiles, setIpaFiles] = useState<IpaFile[]>([]);
    const [searchText, setSearchText] = useState('');
    const [selectedAppFilter, setSelectedAppFilter] = useState<string>('all');
    const [form] = Form.useForm();
    const [uploadForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [statsModalVisible, setStatsModalVisible] = useState(false);
    const [statsData, setStatsData] = useState<{ appName: string; views: number; downloads: number } | null>(null);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [iconFile, setIconFile] = useState<any>(null);
    const [screenshotFiles, setScreenshotFiles] = useState<any[]>([]);
    const [editingRecord, setEditingRecord] = useState<IpaFile | null>(null);
    const [storageInfo, setStorageInfo] = useState({ used: 0, total: 1024 });
    const [uploadProgress, setUploadProgress] = useState(0);
    const [signModalVisible, setSignModalVisible] = useState(false);
    const [selectedIpaForSign, setSelectedIpaForSign] = useState<IpaFile | null>(null);
    const [certificates, setCertificates] = useState<any[]>([]);
    const [selectedCertId, setSelectedCertId] = useState<number | null>(null);
    const [signing, setSigning] = useState(false);

    const fetchIpas = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.get('/api/admin/ipas', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Transform data and calculate storage
            let totalUsed = 0;
            const files = response.data.map((file: any) => {
                totalUsed += file.size;
                const timestamp = file.name.replace('zyea_', '').replace('.ipa', '');
                const baseUrl = 'https://data5g.site';
                return {
                    ...file,
                    appName: file.appName || 'Zyea',
                    appSlug: file.appSlug || 'app',
                    bundleId: file.bundleId || 'com.zyea.mobile',
                    version: file.version || `1.0.${timestamp.slice(-6)}`,
                    developer: file.developer,
                    supportEmail: file.supportEmail,
                    description: file.description,
                    changelog: file.changelog,
                    iconUrl: file.iconUrl || null,
                    installLink: `itms-services://?action=download-manifest&url=${baseUrl}/uploads/ipa/manifest_${timestamp}.plist`,
                    directLink: `${baseUrl}/uploads/ipa/${file.name}`,
                    shortLink: `${baseUrl}/app/ios`,
                    appPageLink: `${baseUrl}/download`,
                    testFlightLink: `${baseUrl}/app/${file.appSlug || 'app'}/${timestamp}`
                };
            });

            setIpaFiles(files);
            setStorageInfo({ used: totalUsed, total: 1024 * 1024 * 1024 }); // 1GB total
        } catch (error) {
            console.error('Failed to fetch IPAs:', error);
            message.error('Không thể tải danh sách IPA');
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await axios.get('/api/app-settings');
            form.setFieldsValue({
                google_play_link: response.data.google_play_link,
                app_store_link: response.data.app_store_link
            });
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    useEffect(() => {
        fetchIpas();
        fetchSettings();
    }, []);

    const handleDelete = async (fileName: string) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: 'Bạn có chắc chắn muốn xóa file IPA này? Hành động này không thể hoàn tác.',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    const token = localStorage.getItem('admin_token');
                    await axios.delete(`/api/admin/ipas/${fileName}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    message.success('Đã xóa file thành công');
                    fetchIpas();
                } catch (error) {
                    console.error(error);
                    message.error('Xóa file thất bại');
                }
            }
        });
    };

    const handleEdit = (record: IpaFile) => {
        setEditingRecord(record);
        editForm.setFieldsValue({
            appName: record.appName,
            version: record.version,
            bundleId: record.bundleId,
            developer: record.developer || 'Zyea Software',
            supportEmail: record.supportEmail || 'support@data5g.site',
            description: record.description || '',
            changelog: record.changelog || '',
            testFlightLink: record.testFlightLink
        });
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        try {
            const values = await editForm.validateFields();
            if (editingRecord) {
                const timestamp = editingRecord.name.replace('zyea_', '').replace('.ipa', '');
                const token = localStorage.getItem('admin_token');

                const formData = new FormData();
                formData.append('appName', values.appName);
                formData.append('version', values.version);
                formData.append('bundleId', values.bundleId);
                formData.append('developer', values.developer);
                formData.append('supportEmail', values.supportEmail);
                formData.append('description', values.description);
                formData.append('changelog', values.changelog);

                if (selectedFile) {
                    formData.append('ipa', selectedFile);
                }

                await axios.put(`/api/admin/ipas/${timestamp}`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });

                message.success('Đã cập nhật thông tin thành công!');
                setEditModalVisible(false);
                setEditingRecord(null);
                setSelectedFile(null); // Reset file
                fetchIpas();
            }
        } catch (error) {
            console.error('Update failed:', error);
            message.error('Cập nhật thất bại');
        }
    };

    const handleViewStats = async (record: IpaFile) => {
        const timestamp = record.name.replace('zyea_', '').replace('.ipa', '');
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.get(`/api/admin/app-stats/${timestamp}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatsData({
                appName: response.data.appName || record.appName || 'Unknown',
                views: response.data.views || 0,
                downloads: response.data.downloads || 0
            });
            setStatsModalVisible(true);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            message.error('Không thể tải thống kê');
        }
    };

    const handleSaveLinks = async (values: any) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            await axios.post('/api/admin/app-settings', {
                settings: {
                    google_play_link: values.google_play_link,
                    app_store_link: values.app_store_link
                }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã cập nhật link tải app thành công!');
        } catch (error) {
            console.error(error);
            message.error('Cập nhật thất bại');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        message.success(`Đã sao chép ${label}`);
    };

    const handleGetShortLink = async (url: string) => {
        try {
            message.loading({ content: 'Đang tạo link rút gọn...', key: 'shorten' });
            const token = localStorage.getItem('admin_token');
            const response = await axios.post('/api/admin/shorten', { url }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success && response.data.shortUrl) {
                navigator.clipboard.writeText(response.data.shortUrl);
                message.success({ content: 'Đã sao chép link rút gọn (is.gd)!', key: 'shorten' });
            } else {
                throw new Error('No short URL returned');
            }
        } catch (error) {
            console.error('Shorten error:', error);
            message.error({ content: 'Không thể tạo link rút gọn, đã sao chép link gốc.', key: 'shorten' });
            navigator.clipboard.writeText(url);
        }
    };

    const handleOpenSignModal = async (record: IpaFile) => {
        setSelectedIpaForSign(record);
        setSignModalVisible(true);
        // Load certificates
        try {
            const token = localStorage.getItem('admin_token');
            const response = await axios.get('/api/admin/certificates', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const activeCerts = response.data.filter((c: any) => c.is_active);
            setCertificates(activeCerts);
            if (activeCerts.length > 0) {
                setSelectedCertId(activeCerts[0].id);
            }
        } catch (error) {
            message.error('Không thể tải danh sách chứng chỉ');
        }
    };

    const handleSignIpa = async () => {
        if (!selectedIpaForSign || !selectedCertId) {
            message.error('Vui lòng chọn chứng chỉ');
            return;
        }

        setSigning(true);
        try {
            const token = localStorage.getItem('admin_token');
            const timestamp = selectedIpaForSign.name.replace('zyea_', '').replace('.ipa', '');

            const response = await axios.post('/api/admin/sign-ipa', {
                ipaTimestamp: timestamp,
                certificateId: selectedCertId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                message.success('Đã ký IPA thành công!');
                setSignModalVisible(false);
                fetchIpas(); // Reload list
            }
        } catch (error: any) {
            console.error(error);
            message.error(error.response?.data?.error || 'Lỗi khi ký IPA');
        } finally {
            setSigning(false);
        }
    };

    const getActionMenu = (record: IpaFile): MenuProps['items'] => [
        {
            key: 'header',
            label: <Text strong style={{ color: '#666' }}>Actions</Text>,
            disabled: true
        },
        {
            key: 'short-link',
            icon: <ShareAltOutlined />,
            label: 'Get Install Link (is.gd)',
            onClick: () => handleGetShortLink(record.installLink || '')
        },
        {
            key: 'direct-link',
            icon: <DownloadOutlined />,
            label: 'Get IPA Direct Link',
            onClick: () => copyToClipboard(record.directLink || '', 'IPA Direct Link')
        },
        {
            key: 'app-page',
            icon: <GlobalOutlined />,
            label: 'Get App Page Link',
            onClick: () => copyToClipboard(record.appPageLink || '', 'App Page Link')
        },
        {
            key: 'testflight',
            icon: <RocketOutlined />,
            label: 'Get TestFlight UI Link',
            onClick: () => copyToClipboard(record.testFlightLink || '', 'TestFlight Link')
        },
        {
            key: 'stats',
            icon: <BarChartOutlined />,
            label: 'View Statistics',
            onClick: () => handleViewStats(record)
        },
        {
            key: 'sign',
            icon: <SafetyCertificateOutlined />,
            label: 'Sign IPA (Ký ứng dụng)',
            onClick: () => handleOpenSignModal(record)
        },
        {
            type: 'divider'
        },
        {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Edit',
            onClick: () => handleEdit(record)
        },
        {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Delete',
            danger: true,
            onClick: () => handleDelete(record.name)
        }
    ];

    const columns = [
        {
            title: 'ICON',
            key: 'icon',
            width: 80,
            render: (_: any, record: IpaFile) => (
                record.iconUrl ? (
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}>
                        <img
                            src={record.iconUrl}
                            alt={record.appName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
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
            title: 'App Name',
            dataIndex: 'appName',
            key: 'appName',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'Bundle ID',
            dataIndex: 'bundleId',
            key: 'bundleId',
            render: (text: string) => <Tag color="blue">{text}</Tag>
        },
        {
            title: 'Version',
            dataIndex: 'version',
            key: 'version',
            render: (text: string) => <Tag color="green">{text}</Tag>
        },
        {
            title: 'File Size',
            dataIndex: 'size',
            key: 'size',
            render: (size: number, record: any) => (
                <Space direction="vertical" size={0}>
                    <Text>{(size / 1024 / 1024).toFixed(2)} MB</Text>
                    {record.signedAt && <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>SIGNED</Tag>}
                </Space>
            )
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleDateString('vi-VN')
        },
        {
            title: '',
            key: 'actions',
            width: 60,
            render: (_: any, record: IpaFile) => (
                <Dropdown menu={{ items: getActionMenu(record) }} trigger={['click']} placement="bottomRight">
                    <Button type="text" icon={<MoreOutlined style={{ fontSize: 20 }} />} />
                </Dropdown>
            )
        }
    ];

    const handleCreateIpa = async () => {
        if (!selectedFile) {
            message.error('Vui lòng chọn file IPA');
            return;
        }

        const values = uploadForm.getFieldsValue();

        setUploading(true);
        const formData = new FormData();
        formData.append('ipa', selectedFile);
        formData.append('appName', values.appName || 'Zyea');
        formData.append('version', values.version || '1.0.0');
        formData.append('bundleId', values.bundleId || 'com.zyea.mobile');
        formData.append('description', values.description || '');
        formData.append('developer', values.developer || 'Zyea Software');
        formData.append('supportEmail', values.supportEmail || 'support@data5g.site');
        formData.append('changelog', values.changelog || '');

        // Add icon if selected
        if (iconFile) {
            formData.append('icon', iconFile);
        }

        // Add screenshots if selected
        screenshotFiles.forEach(file => {
            formData.append('screenshots', file);
        });

        try {
            const token = localStorage.getItem('admin_token');
            setUploadProgress(0);
            const response = await axios.post('/api/admin/upload-ipa', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setUploadProgress(percent);
                }
            });

            const { itmsLink } = response.data;
            form.setFieldsValue({ app_store_link: itmsLink });
            message.success('Tải lên thành công! Link iOS đã được cập nhật.');
            setUploadModalVisible(false);
            setSelectedFile(null);
            setIconFile(null);
            setScreenshotFiles([]);
            uploadForm.resetFields();
            fetchIpas();
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 413) {
                message.error('File quá lớn! Server giới hạn 100MB (Cloudflare).');
            } else {
                message.error(error.response?.data?.error || 'Tải lên thất bại. Kiểm tra kết nối mạng.');
            }
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const draggerProps: UploadProps = {
        name: 'ipa',
        multiple: false,
        accept: '.ipa',
        beforeUpload: (file) => {
            setSelectedFile(file);
            return false; // Prevent auto upload
        },
        onRemove: () => {
            setSelectedFile(null);
        },
        fileList: selectedFile ? [selectedFile] : []
    };

    const uniqueApps = React.useMemo(() => {
        const apps = new Map();
        ipaFiles.forEach(file => {
            if (file.bundleId && !apps.has(file.bundleId)) {
                apps.set(file.bundleId, file.appName);
            }
        });
        return Array.from(apps.entries()).map(([bundleId, appName]) => ({ bundleId, appName }));
    }, [ipaFiles]);

    const filteredFiles = ipaFiles.filter(file => {
        const matchesSearch = file.appName?.toLowerCase().includes(searchText.toLowerCase()) ||
            file.bundleId?.toLowerCase().includes(searchText.toLowerCase());
        const matchesApp = selectedAppFilter === 'all' || file.bundleId === selectedAppFilter;
        return matchesSearch && matchesApp;
    });

    const usedMB = (storageInfo.used / 1024 / 1024).toFixed(2);
    const totalGB = (storageInfo.total / 1024 / 1024 / 1024).toFixed(0);
    const usagePercent = (storageInfo.used / storageInfo.total) * 100;

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Quản lý IPA & Link Tải App</Title>
                    <Text type="secondary">Upload IPA và quản lý link tải ứng dụng cho iOS/Android</Text>
                </div>
                <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    size="large"
                    onClick={() => setUploadModalVisible(true)}
                >
                    Upload New IPA
                </Button>
            </div>

            {/* IPA Files Table */}
            <Card style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 16, display: 'flex' }}>
                    <Select
                        value={selectedAppFilter}
                        style={{ width: 220, marginRight: 12 }}
                        onChange={setSelectedAppFilter}
                        options={[
                            { value: 'all', label: '📂 Tất cả ứng dụng' },
                            ...uniqueApps.map(app => ({ value: app.bundleId, label: `📱 ${app.appName}` }))
                        ]}
                    />
                    <Input
                        placeholder="Tìm kiếm version, tên file..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: 300 }}
                        allowClear
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={filteredFiles}
                    rowKey="name"
                    loading={loading}
                    pagination={{
                        showSizeChanger: true,
                        showTotal: (total) => `${total} file(s) total`,
                        pageSize: 10
                    }}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Chưa có file IPA nào"
                            >
                                <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalVisible(true)}>
                                    Upload IPA đầu tiên
                                </Button>
                            </Empty>
                        )
                    }}
                />
            </Card>

            {/* App Download Links */}
            <Card title="🔗 Link Tải App (Hiển thị trên Landing Page)" style={{ marginBottom: 24 }}>
                <Form layout="vertical" form={form} onFinish={handleSaveLinks}>
                    <Form.Item
                        name="google_play_link"
                        label="Link Google Play (hoặc Android APK)"
                        rules={[{ required: true, message: 'Nhập link Android' }]}
                    >
                        <Input prefix={<AndroidOutlined />} placeholder="https://play.google.com/..." size="large" />
                    </Form.Item>

                    <Form.Item
                        name="app_store_link"
                        label="Link Cài đặt iOS (itms-services)"
                        rules={[{ required: true, message: 'Nhập link iOS' }]}
                        extra="Link này sẽ tự động cập nhật khi bạn upload file IPA mới"
                    >
                        <Input prefix={<AppleOutlined />} placeholder="itms-services://?action=download-manifest&url=..." size="large" />
                    </Form.Item>

                    <Divider />

                    <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} size="large">
                        Lưu thay đổi Link
                    </Button>
                </Form>
            </Card>

            {/* Upload Modal */}
            <Modal
                title="Create New IPA"
                open={uploadModalVisible}
                onCancel={() => {
                    setUploadModalVisible(false);
                    setSelectedFile(null);
                    uploadForm.resetFields();
                }}
                width={700}
                footer={[
                    <Button key="cancel" onClick={() => {
                        setUploadModalVisible(false);
                        setSelectedFile(null);
                        uploadForm.resetFields();
                    }}>
                        Cancel
                    </Button>,
                    <Button key="submit" type="primary" loading={uploading} onClick={handleCreateIpa}>
                        Create New IPA
                    </Button>
                ]}
            >
                {/* Storage Info */}
                <Card size="small" style={{ marginBottom: 24, background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text strong>Storage Information</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">Available: {(1024 - parseFloat(usedMB)).toFixed(2)} MB</Text>
                        <Text type="secondary">Used: {usedMB} MB / {totalGB} GB</Text>
                    </div>
                    <Progress percent={usagePercent} size="small" showInfo={false} />
                </Card>

                <Form form={uploadForm} layout="vertical">
                    {/* Upload Progress */}
                    {uploading && (
                        <Card size="small" style={{ marginBottom: 16, background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                            <div style={{ marginBottom: 8 }}>
                                <Text strong style={{ color: '#1890ff' }}>
                                    📤 Đang tải lên... {uploadProgress}%
                                </Text>
                            </div>
                            <Progress
                                percent={uploadProgress}
                                status={uploadProgress < 100 ? 'active' : 'success'}
                                strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                            />
                            {uploadProgress === 100 && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Đang xử lý file trên server...
                                </Text>
                            )}
                        </Card>
                    )}

                    {/* File Upload */}
                    <Form.Item label="1. Select IPA File *" required>
                        <Dragger {...draggerProps} style={{ padding: '20px 0' }} disabled={uploading}>
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                            </p>
                            <p className="ant-upload-text">Drop files or <span style={{ color: '#1890ff' }}>browse files</span></p>
                        </Dragger>
                    </Form.Item>

                    {/* App Icon (Optional) */}
                    <Form.Item label="2. Select App Icon (Optional)">
                        <Upload
                            accept="image/*"
                            maxCount={1}
                            listType="picture"
                            beforeUpload={(file) => {
                                setIconFile(file);
                                return false;
                            }}
                            onRemove={() => setIconFile(null)}
                        >
                            <Button icon={<PictureOutlined />}>Select Icon</Button>
                        </Upload>
                    </Form.Item>

                    {/* Screenshots (Optional) */}
                    <Form.Item label="3. Select Screenshots (Optional, max 5)">
                        <Upload
                            accept="image/*"
                            maxCount={5}
                            multiple
                            listType="picture-card"
                            beforeUpload={(file) => {
                                setScreenshotFiles(prev => [...prev, file]);
                                return false;
                            }}
                            onRemove={(file) => {
                                setScreenshotFiles(prev => prev.filter(f => f.uid !== file.uid));
                            }}
                        >
                            <div>
                                <PictureOutlined />
                                <div style={{ marginTop: 8 }}>Upload</div>
                            </div>
                        </Upload>
                    </Form.Item>

                    <Divider />

                    {/* App Info */}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="appName" label="App Name *" rules={[{ required: true }]}>
                                <Input placeholder="Enter app name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="version" label="Version *" rules={[{ required: true }]}>
                                <Input placeholder="Enter version (e.g., 1.0.0 or any)" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="bundleId" label="Bundle ID *" rules={[{ required: true }]}>
                        <Input placeholder="com.example.app" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="developer" label="Developer Name">
                                <Input placeholder="Zyea Software" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="supportEmail" label="Support Email">
                                <Input placeholder="support@data5g.site" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Description (Optional)">
                        <Input.TextArea rows={3} placeholder="Enter app description (optional)" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title="Edit IPA Information"
                open={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setEditingRecord(null);
                    editForm.resetFields();
                }}
                width={600}
                footer={[
                    <Button key="cancel" onClick={() => {
                        setEditModalVisible(false);
                        setEditingRecord(null);
                        editForm.resetFields();
                    }}>
                        Cancel
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleSaveEdit}>
                        Save Changes
                    </Button>
                ]}
            >
                <Form form={editForm} layout="vertical">
                    <Form.Item label="IPA File (Optional - Upload to replace existing file)">
                        <Dragger
                            accept=".ipa"
                            maxCount={1}
                            beforeUpload={(file) => {
                                setSelectedFile(file);
                                // Auto-fill version if possible (simple heuristic)
                                return false;
                            }}
                            onRemove={() => setSelectedFile(null)}
                            fileList={selectedFile ? [selectedFile] : []}
                        >
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Drag & drop new IPA here to replace the old one</p>
                            <p className="ant-upload-hint">Upload file mới sẽ thay thế file hiện tại nhưng vẫn giữ nguyên link cài đặt.</p>
                        </Dragger>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="appName" label="App Name">
                                <Input placeholder="Enter app name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="version" label="Version">
                                <Input placeholder="Enter version" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="bundleId" label="Bundle ID">
                        <Input placeholder="com.example.app" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="developer" label="Developer Name">
                                <Input placeholder="Zyea Software" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="supportEmail" label="Support Email">
                                <Input placeholder="support@data5g.site" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider />

                    <Form.Item
                        name="testFlightLink"
                        label="TestFlight Link"
                        extra="Nhập link TestFlight nếu bạn có sử dụng TestFlight để phân phối"
                    >
                        <Input prefix={<RocketOutlined />} placeholder="https://testflight.apple.com/join/XXXXXX" />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} placeholder="Enter app description" />
                    </Form.Item>

                    <Form.Item name="changelog" label="Tính năng mới (What's New)">
                        <Input.TextArea
                            rows={4}
                            placeholder="Nhập danh sách tính năng mới. Mỗi dòng bắt đầu bằng - hoặc * sẽ được hiển thị dưới dạng bullet point."
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Quick Guide */}
            <Card title="📱 Hướng dẫn cài đặt iOS">
                <ol style={{ paddingLeft: 20, marginBottom: 16 }}>
                    <li>Click <strong>"Upload New IPA"</strong> để mở form upload</li>
                    <li>Kéo thả file .ipa vào vùng upload hoặc click để chọn file</li>
                    <li>Điền thông tin App Name, Version, Bundle ID</li>
                    <li>Nhấn <strong>"Create New IPA"</strong></li>
                    <li>Link iOS sẽ tự động được cập nhật</li>
                </ol>
                <Text type="secondary">
                    <strong>Lưu ý:</strong> Thiết bị iOS cần được đăng ký UDID trong tài khoản Developer để cài đặt được.
                </Text>
            </Card>

            {/* Statistics Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BarChartOutlined />
                        <span>App Statistics</span>
                    </div>
                }
                open={statsModalVisible}
                onCancel={() => setStatsModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setStatsModalVisible(false)}>
                        Close
                    </Button>
                ]}
                width={400}
            >
                {statsData && (
                    <>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                            View and download statistics for "{statsData.appName}"
                        </Text>
                        <Row gutter={24}>
                            <Col span={12}>
                                <Card
                                    size="small"
                                    style={{
                                        textAlign: 'center',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        border: 'none'
                                    }}
                                >
                                    <div style={{ color: 'white', opacity: 0.9, fontSize: 12, marginBottom: 4 }}>
                                        👁️ Views
                                    </div>
                                    <div style={{ color: 'white', fontSize: 32, fontWeight: 700 }}>
                                        {statsData.views}
                                    </div>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card
                                    size="small"
                                    style={{
                                        textAlign: 'center',
                                        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                                        border: 'none'
                                    }}
                                >
                                    <div style={{ color: 'white', opacity: 0.9, fontSize: 12, marginBottom: 4 }}>
                                        ⬇️ Downloads
                                    </div>
                                    <div style={{ color: 'white', fontSize: 32, fontWeight: 700 }}>
                                        {statsData.downloads}
                                    </div>
                                </Card>
                            </Col>
                        </Row>
                    </>
                )}
            </Modal>

            {/* Sign IPA Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
                        <span>Sign IPA (Ký ứng dụng iOS)</span>
                    </div>
                }
                open={signModalVisible}
                onCancel={() => setSignModalVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setSignModalVisible(false)}>
                        Hủy
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        icon={<SafetyCertificateOutlined />}
                        loading={signing}
                        onClick={handleSignIpa}
                        disabled={!selectedCertId}
                    >
                        Bắt đầu Ký IPA
                    </Button>
                ]}
                width={500}
            >
                <div style={{ marginBottom: 20 }}>
                    <Text type="secondary">
                        Hệ thống sẽ sử dụng <strong>zsign</strong> trên VPS để ký lại file IPA với chứng chỉ bạn chọn.
                        Sau khi ký xong, link cài đặt sẽ tự động cập nhật bản mới nhất.
                    </Text>
                </div>

                <Form layout="vertical">
                    <Form.Item label="Chọn Chứng chỉ (.p12) để ký" required>
                        <Select
                            placeholder="Chọn một chứng chỉ đang hoạt động"
                            style={{ width: '100%' }}
                            value={selectedCertId}
                            onChange={(val) => setSelectedCertId(val)}
                            size="large"
                        >
                            {certificates.map(cert => (
                                <Select.Option key={cert.id} value={cert.id}>
                                    <Space>
                                        <SafetyCertificateOutlined />
                                        <span>{cert.name}</span>
                                        <Tag color="blue">{cert.p12_filename}</Tag>
                                    </Space>
                                </Select.Option>
                            ))}
                        </Select>
                        {certificates.length === 0 && (
                            <Text type="danger" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                                Chưa có chứng chỉ nào được kích hoạt. Vui lòng vào mục "Certificates" để thêm.
                            </Text>
                        )}
                    </Form.Item>

                    <Card size="small" style={{ background: '#f5f5f5', border: 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <Text style={{ fontSize: 13 }}><strong>App:</strong> {selectedIpaForSign?.appName}</Text>
                            <Text style={{ fontSize: 13 }}><strong>Version:</strong> {selectedIpaForSign?.version}</Text>
                            <Text style={{ fontSize: 13 }}><strong>Bundle ID:</strong> {selectedIpaForSign?.bundleId}</Text>
                        </div>
                    </Card>
                </Form>
            </Modal>
        </div>
    );
};

export default IpaManager;
