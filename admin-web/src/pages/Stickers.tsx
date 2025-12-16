import React, { useEffect, useState } from 'react';
import { Card, List, Button, Image, Upload, message, Modal, Form, Input, Empty, Popconfirm, Tag, Tooltip, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, UploadOutlined, FileImageOutlined, SwapOutlined } from '@ant-design/icons';
import axios from 'axios';

// Interfaces
interface StickerPack {
    id: string;
    name: string;
    title: string;
    description: string;
    icon_url: string;
    sticker_count: number;
    stickers?: Sticker[];
}

interface Sticker {
    id: string;
    image_url: string;
    file_format: string;
    is_animated: boolean;
}

const Stickers: React.FC = () => {
    // State
    const [packs, setPacks] = useState<StickerPack[]>([]);
    const [selectedPack, setSelectedPack] = useState<StickerPack | null>(null);
    const [stickers, setStickers] = useState<Sticker[]>([]);
    const [loadingPacks, setLoadingPacks] = useState(false);
    const [loadingStickers, setLoadingStickers] = useState(false);

    // Modal States
    const [isPackModalVisible, setIsPackModalVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [packForm] = Form.useForm();
    const [uploadingSticker, setUploadingSticker] = useState(false);

    const API_URL = 'http://localhost:3001/api';

    useEffect(() => {
        fetchPacks();
    }, []);

    useEffect(() => {
        if (selectedPack) {
            fetchStickers(selectedPack.id);
        } else {
            setStickers([]);
        }
    }, [selectedPack]);

    // API Calls
    const fetchPacks = async () => {
        setLoadingPacks(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await axios.get(`${API_URL}/admin/sticker-packs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPacks(res.data.packs);
            // Select first pack if none selected
            if (!selectedPack && res.data.packs.length > 0) {
                setSelectedPack(res.data.packs[0]);
            }
        } catch (error) {
            console.error(error);
            message.error('Không thể tải danh sách gói sticker');
        } finally {
            setLoadingPacks(false);
        }
    };

    const fetchStickers = async (packId: string) => {
        setLoadingStickers(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await axios.get(`${API_URL}/admin/sticker-packs/${packId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStickers(res.data.stickers);
        } catch (error) {
            console.error(error);
            message.error('Không thể tải stickers');
        } finally {
            setLoadingStickers(false);
        }
    };

    const handleCreateOrUpdatePack = async () => {
        try {
            const values = await packForm.validateFields();
            const token = localStorage.getItem('admin_token');

            if (isEditMode && selectedPack) {
                await axios.put(`${API_URL}/admin/sticker-packs/${selectedPack.id}`, values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success('Cập nhật thành công');
            } else {
                await axios.post(`${API_URL}/admin/sticker-packs`, values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success('Tạo gói mới thành công');
            }

            setIsPackModalVisible(false);
            packForm.resetFields();
            fetchPacks();
        } catch (error) {
            message.error('Có lỗi xảy ra');
        }
    };

    const handleDeletePack = async (id: string) => {
        try {
            const token = localStorage.getItem('admin_token');
            await axios.delete(`${API_URL}/admin/sticker-packs/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã xóa gói sticker');
            if (selectedPack?.id === id) setSelectedPack(null);
            fetchPacks();
        } catch (error) {
            message.error('Không thể xóa gói này');
        }
    };

    const handleDeleteSticker = async (stickerId: string) => {
        try {
            const token = localStorage.getItem('admin_token');
            await axios.delete(`${API_URL}/admin/stickers/${stickerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Đã xóa sticker');
            if (selectedPack) fetchStickers(selectedPack.id);
        } catch (error) {
            message.error('Xóa thất bại');
        }
    };

    // Upload Handlers
    const handleStickerUpload = async (file: File) => {
        if (!selectedPack) return;

        setUploadingSticker(true);
        const formData = new FormData();
        formData.append('sticker', file);
        const token = localStorage.getItem('admin_token');

        try {
            // 1. Upload File
            const uploadRes = await axios.post(`${API_URL}/upload/sticker`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            // 2. Add to Pack in DB
            const { url, fileFormat, size, width, height, is_animated } = uploadRes.data;

            await axios.post(`${API_URL}/admin/sticker-packs/${selectedPack.id}/stickers`, {
                image_url: url,
                file_format: fileFormat,
                file_size: size,
                width,
                height,
                is_animated,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Upload sticker thành công');
            fetchStickers(selectedPack.id);
        } catch (error) {
            console.error(error);
            message.error('Upload thất bại');
        } finally {
            setUploadingSticker(false);
        }
        return false; // Prevent auto upload by antd
    };

    // Move Sticker Logic
    const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);
    const [movingSticker, setMovingSticker] = useState<Sticker | null>(null);
    const [targetPackId, setTargetPackId] = useState<string | null>(null);

    const handleMoveSticker = async () => {
        if (!movingSticker || !targetPackId) return;

        try {
            const token = localStorage.getItem('admin_token');
            await axios.put(`${API_URL}/admin/stickers/${movingSticker.id}`, { pack_id: targetPackId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('Chuyển sticker thành công');
            setIsMoveModalVisible(false);
            if (selectedPack) fetchStickers(selectedPack.id);
            fetchPacks(); // Update counts
        } catch (error) {
            message.error('Chuyển thất bại');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* ... (Previous UI code remains similar, just adding Move Action) ... */}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Quản lý Sticker</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                    setIsEditMode(false);
                    packForm.resetFields();
                    setIsPackModalVisible(true);
                }}>
                    Tạo Pack Mới
                </Button>
            </div>

            <div style={{ display: 'flex', gap: 20, flex: 1 }}>
                {/* Left Sidebar: Pack List */}
                <Card
                    title="Danh sách Pack"
                    style={{ width: 300, height: 'fit-content' }}
                    bodyStyle={{ padding: 0 }}
                >
                    <List
                        loading={loadingPacks}
                        dataSource={packs}
                        renderItem={item => (
                            <List.Item
                                style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedPack?.id === item.id ? '#e6f7ff' : 'transparent',
                                    borderLeft: selectedPack?.id === item.id ? '3px solid #1890ff' : '3px solid transparent'
                                }}
                                onClick={() => setSelectedPack(item)}
                                actions={[
                                    <Button type="text" icon={<EditOutlined />} onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditMode(true);
                                        setSelectedPack(item);
                                        packForm.setFieldsValue(item);
                                        setIsPackModalVisible(true);
                                    }} />,
                                    <Popconfirm title="Xóa pack này?" onConfirm={(e) => {
                                        e?.stopPropagation();
                                        handleDeletePack(item.id);
                                    }} onCancel={(e) => e?.stopPropagation()}>
                                        <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                                    </Popconfirm>
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={item.icon_url ? <Avatar src={`http://localhost:3001${item.icon_url}`} shape="square" size={48} /> : <div style={{ width: 48, height: 48, background: '#eee', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileImageOutlined /></div>}
                                    title={item.title}
                                    description={<Tag>{item.sticker_count} stickers</Tag>}
                                />
                            </List.Item>
                        )}
                        style={{ maxHeight: '70vh', overflowY: 'auto' }}
                    />
                </Card>

                {/* Right Content: Sticker Grid */}
                <Card
                    title={selectedPack ? `Stickers: ${selectedPack.title}` : 'Chọn pack để xem'}
                    style={{ flex: 1 }}
                    extra={selectedPack && (
                        <Upload
                            showUploadList={false}
                            beforeUpload={handleStickerUpload}
                            accept="image/*"
                            multiple
                        >
                            <Button type="primary" icon={<UploadOutlined />} loading={uploadingSticker}>
                                Thêm Sticker
                            </Button>
                        </Upload>
                    )}
                >
                    {selectedPack ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 16 }}>
                            {stickers.map(sticker => (
                                <Card
                                    key={sticker.id}
                                    hoverable
                                    bodyStyle={{ padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                                    actions={[
                                        <Tooltip title="Di chuyển sang pack khác">
                                            <SwapOutlined key="move" onClick={() => {
                                                setMovingSticker(sticker);
                                                setIsMoveModalVisible(true);
                                            }} />
                                        </Tooltip>,
                                        <Popconfirm title="Xóa sticker này?" onConfirm={() => handleDeleteSticker(sticker.id)}>
                                            <DeleteOutlined key="delete" style={{ color: 'red' }} />
                                        </Popconfirm>
                                    ]}
                                >
                                    <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 8 }}>
                                        <Image
                                            src={`http://localhost:3001${sticker.image_url}`}
                                            height={100}
                                            style={{ objectFit: 'contain' }}
                                            preview={{ mask: 'Xem' }}
                                        />
                                    </div>
                                    <div style={{ fontSize: 10, color: '#999' }}>
                                        {sticker.is_animated && <Tag color="green" style={{ margin: 0, fontSize: 10 }}>Animated</Tag>}
                                    </div>
                                </Card>
                            ))}
                            {stickers.length === 0 && !loadingStickers && (
                                <div style={{ gridColumn: '1 / -1', padding: 40 }}>
                                    <Empty description="Chưa có sticker nào trong pack này" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <Empty description="Vui lòng chọn hoặc tạo Pack Stickers" />
                    )}
                </Card>
            </div>

            {/* Create/Edit Pack Modal */}
            <Modal
                title={isEditMode ? "Chỉnh sửa Pack" : "Tạo Pack mới"}
                open={isPackModalVisible}
                onOk={handleCreateOrUpdatePack}
                onCancel={() => setIsPackModalVisible(false)}
            >
                <Form form={packForm} layout="vertical">
                    <Form.Item name="name" label="Tên (Internal ID)" rules={[{ required: true }]}>
                        <Input placeholder="ví du: zalo_pack_1" />
                    </Form.Item>
                    <Form.Item name="title" label="Tiêu đề hiển thị" rules={[{ required: true }]}>
                        <Input placeholder="ví dụ: Zalo Cute" />
                    </Form.Item>
                    <Form.Item name="sort_order" label="Thứ tự">
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item name="icon_url" label="URL Icon (Tạm thời nhập link)">
                        <Input placeholder="/uploads/..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Move Sticker Modal */}
            <Modal
                title="Di chuyển Sticker"
                open={isMoveModalVisible}
                onOk={handleMoveSticker}
                onCancel={() => setIsMoveModalVisible(false)}
            >
                <p>Chọn pack đích để chuyển sticker này tới:</p>
                <Select
                    style={{ width: '100%' }}
                    placeholder="Chọn pack đích"
                    onChange={(value: string) => setTargetPackId(value)}
                >
                    {packs.filter(p => p.id !== selectedPack?.id).map(pack => (
                        <Select.Option key={pack.id} value={pack.id}>
                            {pack.title}
                        </Select.Option>
                    ))}
                </Select>
            </Modal>
        </div>
    );
};

// Add missing Avatar import since I used it
import { Avatar } from 'antd';

export default Stickers;
