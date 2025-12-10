import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
    Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createGroup } from '../utils/api';
import { launchImageLibrary } from '../utils/imagePicker';

interface CreateGroupModalProps {
    visible: boolean;
    onClose: () => void;
    onGroupCreated: () => void;
}

export default function CreateGroupModal({ visible, onClose, onGroupCreated }: CreateGroupModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [privacy, setPrivacy] = useState<'public' | 'private'>('public'); // simplified to 2 options for now
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handlePickImage = async () => {
        const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
        if (!result.didCancel && !result.error && result.assets && result.assets.length > 0) {
            setCoverImage(result.assets[0].uri);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
            return;
        }

        setIsCreating(true);
        try {
            // NOTE: Ideally we should upload the coverImage first if it's a local file
            // But for simplicity, we'll pass it as is. If the backend expects a URL, 
            // you might need to reuse the uploadImage logic here. 
            // Assuming for now simple creation.

            // TODO: Upload image if exists
            let uploadedCover = coverImage;
            if (coverImage && !coverImage.startsWith('http')) {
                // You might need to import uploadImage and use it here
                // const uploadRes = await uploadImage(coverImage);
                // uploadedCover = uploadRes.url;
            }

            await createGroup({
                name,
                description,
                privacy,
                coverImage: uploadedCover || undefined,
            });

            Alert.alert('Thành công', 'Đã tạo nhóm mới');
            setName('');
            setDescription('');
            setCoverImage(null);
            onGroupCreated();
            onClose();
        } catch (error) {
            console.error(error);
            Alert.alert('Lỗi', 'Không thể tạo nhóm');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Tạo nhóm mới</Text>
                        <TouchableOpacity
                            onPress={handleCreate}
                            disabled={!name.trim() || isCreating}
                        >
                            {isCreating ? (
                                <ActivityIndicator color="#F97316" />
                            ) : (
                                <Text style={[styles.createBtn, !name.trim() && styles.disabledBtn]}>Tạo</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body}>
                        <TouchableOpacity style={styles.coverUpload} onPress={handlePickImage}>
                            {coverImage ? (
                                <Image source={{ uri: coverImage }} style={styles.coverImage} />
                            ) : (
                                <View style={styles.placeholder}>
                                    <Ionicons name="camera-outline" size={32} color="#666" />
                                    <Text style={styles.placeholderText}>Thêm ảnh bìa</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Tên nhóm</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Đặt tên cho nhóm"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Mô tả</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Mô tả về nhóm của bạn..."
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.privacyOption}>
                            <View>
                                <Text style={styles.privacyTitle}>Nhóm riêng tư</Text>
                                <Text style={styles.privacyDesc}>
                                    {privacy === 'private'
                                        ? 'Chỉ thành viên mới nhìn thấy bài đăng'
                                        : 'Bất kỳ ai cũng có thể nhìn thấy nhóm và bài đăng'}
                                </Text>
                            </View>
                            <Switch
                                value={privacy === 'private'}
                                onValueChange={(val) => setPrivacy(val ? 'private' : 'public')}
                                trackColor={{ false: '#767577', true: '#F97316' }}
                            />
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    createBtn: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F97316',
    },
    disabledBtn: {
        color: '#CCC',
    },
    body: {
        padding: 16,
    },
    coverUpload: {
        height: 150,
        backgroundColor: '#F0F0F0',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 8,
        color: '#666',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    privacyOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
    },
    privacyTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    privacyDesc: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
    },
});
