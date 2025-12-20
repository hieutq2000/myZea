import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { uploadImage, getCurrentUser, apiRequest, API_URL } from '../utils/api';

type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'rejected';

interface FeedbackItem {
    id: string;
    type: string;
    content: string;
    status: FeedbackStatus;
    created_at: string;
}

export default function FeedbackScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { colors, isDark } = useTheme();

    // UI State
    const [viewMode, setViewMode] = useState<'FORM' | 'HISTORY'>('FORM');
    const [feedbackType, setFeedbackType] = useState<'feedback' | 'bug'>('feedback');

    // Form State
    const [content, setContent] = useState('');
    const [context, setContext] = useState('Phản hồi từ tính năng Chung, màn hình Cài đặt');
    const [images, setImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // History State
    const [history, setHistory] = useState<FeedbackItem[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    useEffect(() => {
        if (viewMode === 'HISTORY') {
            fetchHistory();
        }
    }, [viewMode]);

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            // No need to get token manually, apiRequest handles it.
            const data = await apiRequest<FeedbackItem[]>('/api/feedback/my');
            setHistory(data);
        } catch (error) {
            console.log(error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            // Upload immediately or wait? Ideally upload first to get URL.
            // For simplicity, let's assume we upload upon selection or before submit.
            // Here we'll simulate adding to local state and upload on submit for cleaner UX, 
            // OR reuse the provided uploadImage utility.
            try {
                const response = await uploadImage(result.assets[0].uri);
                setImages([...images, response.url]);
            } catch (error) {
                Alert.alert('Lỗi', 'Không thể tải ảnh lên');
            }
        }
    };

    const handleSubmit = async () => {
        if (!content.trim()) {
            Alert.alert('Thông báo', 'Vui lòng nhập nội dung phản hồi');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiRequest('/api/feedback', {
                method: 'POST',
                body: JSON.stringify({
                    type: feedbackType,
                    content: content,
                    context: context,
                    media_urls: images
                })
            });
            Alert.alert('Thành công', 'Cảm ơn bạn đã gửi phản hồi!');
            setContent('');
            setImages([]);
            setViewMode('HISTORY'); // Switch to history to see the new item
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể gửi phản hồi. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (status: FeedbackStatus) => {
        switch (status) {
            case 'pending': return '#F59E0B'; // Orange
            case 'processing': return '#3B82F6'; // Blue
            case 'resolved': return '#10B981'; // Green
            case 'rejected': return '#EF4444'; // Red
            default: return '#9CA3AF';
        }
    };

    const getStatusText = (status: FeedbackStatus) => {
        switch (status) {
            case 'pending': return 'Đã tiếp nhận';
            case 'processing': return 'Đang xử lý';
            case 'resolved': return 'Đã xong';
            case 'rejected': return 'Từ chối';
            default: return 'Chờ';
        }
    };

    const renderForm = () => (
        <ScrollView style={styles.formContainer}>
            {/* Type Selector */}
            <View style={styles.typeContainer}>
                <TouchableOpacity
                    style={[styles.typeButton, feedbackType === 'feedback' && styles.typeButtonActive]}
                    onPress={() => setFeedbackType('feedback')}
                >
                    <Text style={[styles.typeText, feedbackType === 'feedback' && styles.typeTextActive]}>Phản hồi góp ý</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.typeButton, feedbackType === 'bug' && styles.typeButtonActive]}
                    onPress={() => setFeedbackType('bug')}
                >
                    <Text style={[styles.typeText, feedbackType === 'bug' && styles.typeTextActive]}>Báo cáo lỗi</Text>
                </TouchableOpacity>
            </View>

            {/* Content Input */}
            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#333' : '#FFF' }]}>
                <TextInput
                    style={[styles.textInput, { color: isDark ? '#FFF' : '#000', height: 120 }]}
                    placeholder="Nội dung phản hồi góp ý *"
                    placeholderTextColor="#999"
                    multiline
                    textAlignVertical="top"
                    value={content}
                    onChangeText={setContent}
                    maxLength={500}
                />
                <Text style={styles.charCount}>{content.length}/500</Text>
            </View>

            {/* Context Input */}
            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#333' : '#FFF' }]}>
                <Text style={styles.label}>Mô tả ngữ cảnh phản hồi góp ý</Text>
                <TextInput
                    style={[styles.textInput, { color: isDark ? '#FFF' : '#000' }]}
                    value={context}
                    onChangeText={setContext}
                    multiline
                    maxLength={500}
                />
                <Text style={styles.charCount}>{context.length}/500</Text>
            </View>

            {/* Image Upload */}
            <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: isDark ? '#333' : '#FFF' }]}
                onPress={handlePickImage}
            >
                <Text style={[styles.uploadText, { color: isDark ? '#BBB' : '#666' }]}>
                    {images.length > 0 ? `${images.length} ảnh đã chọn` : 'Ảnh/Video liên quan đến phản hồi góp ý'}
                </Text>
                <Ionicons name="cloud-upload-outline" size={24} color="#666" />
            </TouchableOpacity>

            {/* Image Preview */}
            {images.length > 0 && (
                <View style={styles.imagePreviewContainer}>
                    {images.map((img, idx) => (
                        <Image key={idx} source={{ uri: img.startsWith('http') ? img : API_URL + img }} style={styles.previewImage} />
                    ))}
                </View>
            )}

            {/* Footer Message */}
            <View style={styles.footerMessage}>
                <Image
                    source={require('../../assets/adaptive-icon.png')} // Replace with avatar if needed
                    style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
                />
                <Text style={[styles.footerText, { color: '#EA580C' }]}>
                    Cảm ơn Bạn đã dành thời gian gửi phản hồi cho chúng tôi. Ý kiến của Bạn sẽ được chúng tôi ghi nhận để giúp ứng dụng trở nên hoàn thiện hơn.
                </Text>
            </View>
        </ScrollView>
    );

    const renderHistory = () => (
        <ScrollView style={styles.historyContainer}>
            {isLoadingHistory ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : history.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>Chưa có phản hồi nào</Text>
            ) : (
                history.map(item => (
                    <View key={item.id} style={[styles.historyCard, { backgroundColor: isDark ? '#333' : '#FFF' }]}>
                        <View style={styles.historyHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={[styles.historyIcon, { backgroundColor: item.type === 'bug' ? '#FEE2E2' : '#DBEAFE' }]}>
                                    <Ionicons
                                        name={item.type === 'bug' ? 'warning' : 'chatbubble-ellipses'}
                                        size={20}
                                        color={item.type === 'bug' ? '#EF4444' : '#3B82F6'}
                                    />
                                </View>
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={[styles.historyTitle, { color: isDark ? '#FFF' : '#000' }]}>
                                        {item.type === 'bug' ? 'Báo cáo lỗi' : 'Phản hồi góp ý'}
                                    </Text>
                                    <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
                                </View>
                            </View>
                        </View>
                        <Text style={[styles.historyContent, { color: isDark ? '#DDD' : '#333' }]}>{item.content}</Text>
                        <View style={styles.historyFooter}>
                            <Text style={styles.historyStatusLabel}>Trạng thái</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="checkmark-done" size={16} color={getStatusColor(item.status)} style={{ marginRight: 4 }} />
                                <Text style={{ color: getStatusColor(item.status), fontWeight: '500' }}>
                                    {getStatusText(item.status)}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={isDark ? '#FFF' : '#000'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#000' }]}>
                    {viewMode === 'FORM' ? 'Phản hồi' : 'Lịch sử phản hồi'}
                </Text>
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                        onPress={() => setViewMode(viewMode === 'FORM' ? 'HISTORY' : 'FORM')}
                        style={styles.headerIcon}
                    >
                        <Ionicons
                            name={viewMode === 'FORM' ? "time-outline" : "create-outline"}
                            size={24}
                            color={isDark ? '#FFF' : '#000'}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="settings-outline" size={24} color={isDark ? '#FFF' : '#000'} />
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                {viewMode === 'FORM' ? renderForm() : renderHistory()}
            </KeyboardAvoidingView>

            {/* Bottom Button for Form */}
            {viewMode === 'FORM' && (
                <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>Gửi</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        marginLeft: 12,
    },
    headerIcon: {
        marginLeft: 16,
    },
    formContainer: {
        flex: 1,
        padding: 16,
    },
    typeContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    typeButton: {
        marginRight: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    typeButtonActive: {
        backgroundColor: '#F97316', // Orange
    },
    typeText: {
        color: '#666',
        fontWeight: '500',
    },
    typeTextActive: {
        color: '#FFF',
    },
    inputContainer: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    textInput: {
        fontSize: 14,
        minHeight: 40,
        textAlignVertical: 'top',
    },
    label: {
        fontSize: 12,
        color: '#888',
        marginBottom: 8,
    },
    charCount: {
        textAlign: 'right',
        fontSize: 10,
        color: '#999',
        marginTop: 4,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
    },
    uploadText: {
        fontSize: 14,
    },
    imagePreviewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    previewImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 8,
    },
    footerMessage: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#FFF7ED', // Light orange bg
        borderRadius: 12,
        marginBottom: 80,
    },
    footerText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    bottomContainer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    submitButton: {
        backgroundColor: '#E5E7EB', // Default grey as per image (looks disabled until filled?). 
        // Actually image shows grey 'Gửi' button. Maybe it turns to primary when valid?
        // Let's use generic grey for 'Gửi' as per screenshot, or make it primary for clarity.
        // Screenshot 'Gửi' button is at bottom, full width, light grey background, dark text.
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666',
    },
    // History Styles
    historyContainer: {
        flex: 1,
        padding: 16,
        backgroundColor: '#F3F4F6',
    },
    historyCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    historyHeader: {
        marginBottom: 12,
    },
    historyIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    historyDate: {
        fontSize: 12,
        color: '#888',
    },
    historyContent: {
        fontSize: 14,
        marginBottom: 12,
        lineHeight: 20,
    },
    historyFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 8,
    },
    historyStatusLabel: {
        fontSize: 12,
        color: '#888',
    },
});
