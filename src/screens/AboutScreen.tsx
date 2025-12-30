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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { User } from '../types';
import { updateProfile } from '../utils/api';
import DateTimePicker from '@react-native-community/datetimepicker';

interface AboutScreenProps {
    user: User;
    onBack: () => void;
    onUpdate?: (updatedUser: User) => void;
}

interface InfoItem {
    icon: string;
    iconType: 'ionicon' | 'material' | 'feather';
    label: string;
    value: string;
    field: keyof User;
    editable?: boolean;
}

export default function AboutScreen({ user, onBack, onUpdate }: AboutScreenProps) {
    // Editable state
    const [isEditing, setIsEditing] = useState(false);
    const [bio, setBio] = useState(user?.bio || '');
    const [company, setCompany] = useState(user?.company || '');
    const [department, setDepartment] = useState(user?.department || '');
    const [position, setPosition] = useState(user?.position || '');
    const [manager, setManager] = useState(user?.manager || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [location, setLocation] = useState(user?.location || '');
    const [birthday, setBirthday] = useState(user?.birthday ? new Date(user.birthday) : new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // TODO: Call API to save profile
            const updatedUser: User = {
                ...user,
                bio,
                company,
                department,
                position,
                manager,
                phone,
                location,
                birthday: birthday.toISOString(),
            };

            // For now, just call onUpdate callback
            if (onUpdate) {
                onUpdate(updatedUser);
            }

            setIsEditing(false);
            Alert.alert('Thành công', 'Đã cập nhật thông tin!');
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể cập nhật thông tin');
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const renderEditableField = (
        label: string,
        value: string,
        onChangeText: (text: string) => void,
        placeholder: string,
        multiline: boolean = false
    ) => (
        <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {isEditing ? (
                <TextInput
                    style={[styles.fieldInput, multiline && styles.multilineInput]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#999"
                    multiline={multiline}
                    numberOfLines={multiline ? 3 : 1}
                />
            ) : (
                <Text style={styles.fieldValue}>{value || 'Chưa cập nhật'}</Text>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

            {/* Header */}
            <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Giới thiệu</Text>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Bio Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Tiểu sử</Text>
                            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                                <Text style={styles.editButton}>
                                    {isEditing ? 'Hủy' : 'Chỉnh sửa'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {renderEditableField('', bio, setBio, 'Viết tiểu sử về bạn...', true)}
                    </View>

                    {/* Work Info Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Vị trí làm việc</Text>

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="briefcase-outline" size={20} color="#666" />
                            </View>
                            <View style={styles.infoContent}>
                                {isEditing ? (
                                    <TextInput
                                        style={styles.inlineInput}
                                        value={company}
                                        onChangeText={setCompany}
                                        placeholder="Công ty"
                                        placeholderTextColor="#999"
                                    />
                                ) : (
                                    <Text style={styles.infoValue}>{company || 'Chưa cập nhật'}</Text>
                                )}
                                <Text style={styles.infoLabel}>Công ty</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="location-outline" size={20} color="#666" />
                            </View>
                            <View style={styles.infoContent}>
                                {isEditing ? (
                                    <TextInput
                                        style={styles.inlineInput}
                                        value={department}
                                        onChangeText={setDepartment}
                                        placeholder="Phòng ban"
                                        placeholderTextColor="#999"
                                    />
                                ) : (
                                    <Text style={styles.infoValue}>{department || 'Chưa cập nhật'}</Text>
                                )}
                                <Text style={styles.infoLabel}>Phòng ban</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <Feather name="user" size={20} color="#666" />
                            </View>
                            <View style={styles.infoContent}>
                                {isEditing ? (
                                    <TextInput
                                        style={styles.inlineInput}
                                        value={manager}
                                        onChangeText={setManager}
                                        placeholder="Quản lý trực tiếp"
                                        placeholderTextColor="#999"
                                    />
                                ) : (
                                    <Text style={styles.infoValue}>{manager || 'Chưa cập nhật'}</Text>
                                )}
                                <Text style={styles.infoLabel}>Quản lý trực tiếp</Text>
                            </View>
                        </View>
                    </View>

                    {/* Contact Info Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="person-outline" size={20} color="#666" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoValue}>{user?.name || 'Chưa cập nhật'}</Text>
                                <Text style={styles.infoLabel}>Tên</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="email-outline" size={20} color="#666" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoValue}>{user?.email || 'Chưa cập nhật'}</Text>
                                <Text style={styles.infoLabel}>Email</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="call-outline" size={20} color="#666" />
                            </View>
                            <View style={styles.infoContent}>
                                {isEditing ? (
                                    <TextInput
                                        style={styles.inlineInput}
                                        value={phone}
                                        onChangeText={setPhone}
                                        placeholder="Số điện thoại"
                                        placeholderTextColor="#999"
                                        keyboardType="phone-pad"
                                    />
                                ) : (
                                    <Text style={styles.infoValue}>{phone || 'Chưa cập nhật'}</Text>
                                )}
                                <Text style={styles.infoLabel}>Điện thoại</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="location-outline" size={20} color="#666" />
                            </View>
                            <View style={styles.infoContent}>
                                {isEditing ? (
                                    <TextInput
                                        style={styles.inlineInput}
                                        value={location}
                                        onChangeText={setLocation}
                                        placeholder="Địa chỉ"
                                        placeholderTextColor="#999"
                                    />
                                ) : (
                                    <Text style={styles.infoValue}>{location || 'Chưa cập nhật'}</Text>
                                )}
                                <Text style={styles.infoLabel}>Vị trí</Text>
                            </View>
                        </View>

                        {/* Birthday */}
                        <View style={styles.infoRow}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="cake-variant" size={20} color="#666" />
                            </View>
                            <View style={styles.infoContent}>
                                {isEditing ? (
                                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                        <Text style={[styles.infoValue, { color: '#F97316' }]}>
                                            {formatDate(birthday)}
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={styles.infoValue}>
                                        {user?.birthday ? formatDate(new Date(user.birthday)) : 'Chưa cập nhật'}
                                    </Text>
                                )}
                                <Text style={styles.infoLabel}>Ngày sinh</Text>
                            </View>
                        </View>
                    </View>

                    {/* Save Button */}
                    {isEditing && (
                        <TouchableOpacity
                            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            <Text style={styles.saveButtonText}>
                                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Date Picker */}
            {showDatePicker && (
                <DateTimePicker
                    value={birthday}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_event: any, selectedDate?: Date) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                            setBirthday(selectedDate);
                        }
                    }}
                    maximumDate={new Date()}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    headerSafeArea: {
        backgroundColor: '#FFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    content: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 8,
        borderBottomColor: '#F5F5F5',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    editButton: {
        fontSize: 14,
        color: '#F97316',
        fontWeight: '500',
    },
    fieldContainer: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 6,
    },
    fieldValue: {
        fontSize: 15,
        color: '#333',
    },
    fieldInput: {
        fontSize: 15,
        color: '#333',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#FAFAFA',
    },
    multilineInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoValue: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
        marginBottom: 2,
    },
    infoLabel: {
        fontSize: 13,
        color: '#999',
    },
    inlineInput: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
        borderBottomWidth: 1,
        borderBottomColor: '#F97316',
        paddingVertical: 4,
        marginBottom: 2,
    },
    saveButton: {
        marginHorizontal: 16,
        marginTop: 24,
        backgroundColor: '#F97316',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#FDA868',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
