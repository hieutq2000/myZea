/**
 * EditProfileScreen - Màn hình chỉnh sửa thông tin cá nhân
 * Navigation-based, tích hợp với backend
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    StatusBar,
    Alert,
    Platform,
    KeyboardAvoidingView,
    Image,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { getCurrentUser, updateProfile, uploadImage, API_URL } from '../utils/api';
import { User } from '../types';
import { getAvatarUri } from '../utils/media';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function EditProfileScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { colors, isDark } = useTheme();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    // Form states
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [company, setCompany] = useState('');
    const [department, setDepartment] = useState('');
    const [position, setPosition] = useState('');
    const [avatar, setAvatar] = useState<string | undefined>(undefined);
    const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
    const [birthday, setBirthday] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    // Load user data
    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const userData = await getCurrentUser();
            if (userData) {
                setUser(userData);
                setName(userData.name || '');
                setBio((userData as any).bio || '');
                setPhone((userData as any).phone || '');
                setLocation((userData as any).location || '');
                setCompany((userData as any).company || '');
                setDepartment((userData as any).department || '');
                setPosition((userData as any).position || '');
                setAvatar(userData.avatar);
                setCoverImage(userData.coverImage);
                if ((userData as any).birthday) {
                    setBirthday(new Date((userData as any).birthday));
                }
            }
        } catch (error) {
            console.error('Error loading user:', error);
            Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
        } finally {
            setLoading(false);
        }
    };

    const handlePickAvatar = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setUploadingAvatar(true);
                const uploadResult = await uploadImage(result.assets[0].uri);
                setAvatar(uploadResult.url);
                setUploadingAvatar(false);
            }
        } catch (error) {
            setUploadingAvatar(false);
            Alert.alert('Lỗi', 'Không thể tải ảnh lên');
        }
    };

    const handlePickCover = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [3, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setUploadingCover(true);
                const uploadResult = await uploadImage(result.assets[0].uri);
                setCoverImage(uploadResult.url);
                setUploadingCover(false);
            }
        } catch (error) {
            setUploadingCover(false);
            Alert.alert('Lỗi', 'Không thể tải ảnh lên');
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Lỗi', 'Tên không được để trống');
            return;
        }

        setSaving(true);
        try {
            // TODO: Update backend to accept more profile fields
            await updateProfile(name, avatar, undefined, coverImage);

            Alert.alert('✅ Thành công', 'Đã cập nhật thông tin cá nhân', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể lưu thông tin');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <LinearGradient
                colors={colors.headerGradient}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={[styles.headerButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={() => navigation.goBack()}
                        >
                            <Feather name="x" size={20} color={isDark ? '#FFF' : '#000'} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#000' }]}>
                            Chỉnh sửa hồ sơ
                        </Text>
                        <TouchableOpacity
                            style={[styles.saveHeaderButton, saving && { opacity: 0.5 }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.saveHeaderText}>Lưu</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Cover Image Section */}
                    <TouchableOpacity
                        style={styles.coverSection}
                        onPress={handlePickCover}
                        activeOpacity={0.8}
                    >
                        {coverImage ? (
                            <Image
                                source={{ uri: getAvatarUri(coverImage) }}
                                style={styles.coverImage}
                            />
                        ) : (
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={styles.coverImage}
                            />
                        )}
                        {uploadingCover ? (
                            <View style={styles.uploadingOverlay}>
                                <ActivityIndicator color="#FFF" />
                            </View>
                        ) : (
                            <View style={styles.changeCoverButton}>
                                <Ionicons name="camera" size={16} color="#FFF" />
                                <Text style={styles.changeCoverText}>Đổi ảnh bìa</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={handlePickAvatar}
                            activeOpacity={0.8}
                        >
                            {avatar ? (
                                <Image
                                    source={{ uri: getAvatarUri(avatar) }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Ionicons name="person" size={40} color="#9CA3AF" />
                                </View>
                            )}
                            {uploadingAvatar ? (
                                <View style={styles.avatarOverlay}>
                                    <ActivityIndicator color="#FFF" />
                                </View>
                            ) : (
                                <View style={styles.avatarEditIcon}>
                                    <Ionicons name="camera" size={16} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                        <Text style={[styles.changeAvatarText, { color: colors.primary }]}>
                            Thay đổi ảnh đại diện
                        </Text>
                    </View>

                    {/* Form Fields */}
                    <View style={[styles.formSection, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Thông tin cơ bản
                        </Text>

                        {/* Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Họ và tên *</Text>
                            <TextInput
                                style={[styles.fieldInput, {
                                    backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB',
                                    color: colors.text,
                                    borderColor: colors.border
                                }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="Nhập họ và tên"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        {/* Bio */}
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tiểu sử</Text>
                            <TextInput
                                style={[styles.fieldInput, styles.multilineInput, {
                                    backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB',
                                    color: colors.text,
                                    borderColor: colors.border
                                }]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Viết vài dòng về bạn..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </View>

                    {/* Contact Info */}
                    <View style={[styles.formSection, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Thông tin liên hệ
                        </Text>

                        {/* Email - Read only */}
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
                            <View style={[styles.readOnlyField, { backgroundColor: isDark ? '#1F1F1F' : '#F3F4F6' }]}>
                                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                                <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
                                    {user?.email || 'Chưa có'}
                                </Text>
                                <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
                            </View>
                        </View>

                        {/* Phone */}
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Số điện thoại</Text>
                            <TextInput
                                style={[styles.fieldInput, {
                                    backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB',
                                    color: colors.text,
                                    borderColor: colors.border
                                }]}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="0912 345 678"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="phone-pad"
                            />
                        </View>

                        {/* Location */}
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Địa chỉ</Text>
                            <TextInput
                                style={[styles.fieldInput, {
                                    backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB',
                                    color: colors.text,
                                    borderColor: colors.border
                                }]}
                                value={location}
                                onChangeText={setLocation}
                                placeholder="Thành phố, Quốc gia"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        {/* Birthday */}
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Ngày sinh</Text>
                            <TouchableOpacity
                                style={[styles.fieldInput, styles.dateField, {
                                    backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB',
                                    borderColor: colors.border
                                }]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <MaterialCommunityIcons name="cake-variant" size={18} color={colors.textSecondary} />
                                <Text style={[styles.dateText, { color: birthday ? colors.text : colors.textSecondary }]}>
                                    {birthday ? formatDate(birthday) : 'Chọn ngày sinh'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Work Info */}
                    <View style={[styles.formSection, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Thông tin công việc
                        </Text>

                        {/* Company */}
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Công ty / Tổ chức</Text>
                            <TextInput
                                style={[styles.fieldInput, {
                                    backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB',
                                    color: colors.text,
                                    borderColor: colors.border
                                }]}
                                value={company}
                                onChangeText={setCompany}
                                placeholder="Tên công ty"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        {/* Department */}
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Phòng ban</Text>
                            <TextInput
                                style={[styles.fieldInput, {
                                    backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB',
                                    color: colors.text,
                                    borderColor: colors.border
                                }]}
                                value={department}
                                onChangeText={setDepartment}
                                placeholder="Phòng ban làm việc"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        {/* Position */}
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Chức vụ</Text>
                            <TextInput
                                style={[styles.fieldInput, {
                                    backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB',
                                    color: colors.text,
                                    borderColor: colors.border
                                }]}
                                value={position}
                                onChangeText={setPosition}
                                placeholder="Vị trí công việc"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Date Picker Modal */}
            {showDatePicker && (
                <DateTimePicker
                    value={birthday || new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_event: any, selectedDate?: Date) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                            setBirthday(selectedDate);
                        }
                    }}
                    maximumDate={new Date()}
                    minimumDate={new Date(1950, 0, 1)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    saveHeaderButton: {
        backgroundColor: '#667eea',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveHeaderText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 15,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    coverSection: {
        height: 140,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    changeCoverButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    changeCoverText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '500',
    },
    avatarSection: {
        alignItems: 'center',
        marginTop: -50,
        marginBottom: 20,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#FFF',
    },
    avatarPlaceholder: {
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarEditIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#667eea',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    changeAvatarText: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    formSection: {
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    fieldGroup: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
    },
    fieldInput: {
        fontSize: 15,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
    },
    multilineInput: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    readOnlyField: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
        gap: 10,
    },
    readOnlyText: {
        flex: 1,
        fontSize: 15,
    },
    dateField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dateText: {
        fontSize: 15,
    },
});
