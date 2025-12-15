/**
 * VoiceInputScreen - Màn hình ghi âm giọng nói
 * 
 * UI giống ảnh mẫu với hiệu ứng waveform
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
    Alert,
    Animated,
    ScrollView,
    Modal,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { addTransaction, getWallets } from '../../utils/finance/storage';
import { findCategoryFromText, getCategoryById, getCategoriesByType } from '../../utils/finance/categories';
import { VoiceParseResult, TransactionType, Category } from '../../types/finance';

import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

const { width } = Dimensions.get('window');

// Format số tiền
const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

// Parse số tiền từ text
const parseAmount = (text: string): number => {
    const lowerText = text.toLowerCase();

    const nghinMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*(?:nghìn|ngàn|ngh)/);
    if (nghinMatch) return parseFloat(nghinMatch[1].replace(',', '.')) * 1000;

    const kMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*k/);
    if (kMatch) return parseFloat(kMatch[1].replace(',', '.')) * 1000;

    const trieuMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*tri[ệe]u/);
    if (trieuMatch) return parseFloat(trieuMatch[1].replace(',', '.')) * 1000000;

    const numMatch = lowerText.match(/(\d{1,3}(?:[.,]?\d{3})*)/g);
    if (numMatch) {
        const numbers = numMatch.map(n => parseFloat(n.replace(/[.,]/g, '')));
        return Math.max(...numbers);
    }

    return 0;
};

// Parse voice to result
const parseVoiceLocal = (text: string): VoiceParseResult | null => {
    const lowerText = text.toLowerCase();

    const incomeKeywords = ['lương', 'thu', 'nhận', 'bán', 'thưởng', 'được cho', 'lì xì', 'tiền mừng'];
    const isIncome = incomeKeywords.some(kw => lowerText.includes(kw));
    const type: TransactionType = isIncome ? 'income' : 'expense';

    const amount = parseAmount(text);
    if (amount <= 0) return null;

    const category = findCategoryFromText(text, type);

    return {
        type,
        amount,
        description: text,
        categoryId: category.id,
        categoryName: category.name,
        date: new Date().toISOString().split('T')[0],
        confidence: 0.8,
    };
};

// Waveform Bar Component
const WaveformBar = ({ index, isListening }: { index: number; isListening: boolean }) => {
    const heightAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (isListening) {
            const animate = () => {
                Animated.sequence([
                    Animated.timing(heightAnim, {
                        toValue: 15 + Math.random() * 50,
                        duration: 100 + Math.random() * 100,
                        useNativeDriver: false,
                    }),
                    Animated.timing(heightAnim, {
                        toValue: 15 + Math.random() * 30,
                        duration: 100 + Math.random() * 100,
                        useNativeDriver: false,
                    }),
                ]).start(() => {
                    if (isListening) animate();
                });
            };

            // Delay each bar slightly for wave effect
            setTimeout(() => animate(), index * 50);
        } else {
            Animated.timing(heightAnim, {
                toValue: 20,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    }, [isListening]);

    return (
        <Animated.View
            style={[
                styles.waveBar,
                { height: heightAnim }
            ]}
        />
    );
};

export default function VoiceInputScreen() {
    const navigation = useNavigation();

    // State
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [parseResult, setParseResult] = useState<VoiceParseResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);


    // Animation
    const micScale = useRef(new Animated.Value(1)).current;

    // Check permission on mount
    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
        setHasPermission(result.granted);
    };

    const requestPermission = async () => {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        setHasPermission(result.granted);
        return result.granted;
    };

    // Speech Recognition Events
    useSpeechRecognitionEvent('start', () => {
        setIsListening(true);
        setError(null);
    });

    useSpeechRecognitionEvent('end', () => {
        setIsListening(false);
    });

    useSpeechRecognitionEvent('result', (event) => {
        const text = event.results[0]?.transcript || '';
        setTranscript(text);
        if (event.isFinal) {
            processVoice(text);
        }
    });

    useSpeechRecognitionEvent('error', (event) => {
        setIsListening(false);
        if (event.error === 'no-speech') {
            setError('Không nghe thấy giọng nói');
        } else if (event.error === 'not-allowed') {
            setError('Chưa cấp quyền microphone');
        } else {
            setError('Có lỗi xảy ra');
        }
    });

    // Mic button animation
    useEffect(() => {
        if (isListening) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(micScale, {
                        toValue: 1.1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(micScale, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            micScale.setValue(1);
        }
    }, [isListening]);

    const startListening = async () => {
        if (!hasPermission) {
            const granted = await requestPermission();
            if (!granted) {
                Alert.alert('Cần cấp quyền microphone');
                return;
            }
        }

        setTranscript('');
        setParseResult(null);
        setError(null);

        try {
            await ExpoSpeechRecognitionModule.start({
                lang: 'vi-VN',
                interimResults: true,
                maxAlternatives: 1,
                continuous: false,
            });
        } catch (err) {
            setError('Không thể bắt đầu ghi âm');
        }
    };

    const stopListening = async () => {
        try {
            await ExpoSpeechRecognitionModule.stop();
        } catch (err) {
            console.error('Stop error:', err);
        }
    };

    const processVoice = async (text: string) => {
        if (!text.trim()) {
            setError('Không nhận được nội dung');
            return;
        }

        // Hiển thị loading
        setIsProcessing(true);

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const result = parseVoiceLocal(text);
        if (result) {
            setParseResult(result);
            setError(null);
        } else {
            setError('Không nhận dạng được số tiền');
        }

        setIsProcessing(false);
    };


    const handleChangeCategory = (category: Category) => {
        if (parseResult) {
            setParseResult({
                ...parseResult,
                categoryId: category.id,
                categoryName: category.name,
            });
        }
        setShowCategoryModal(false);
    };

    const handleToggleType = () => {
        if (parseResult) {
            const newType: TransactionType = parseResult.type === 'expense' ? 'income' : 'expense';
            const categories = getCategoriesByType(newType);
            setParseResult({
                ...parseResult,
                type: newType,
                categoryId: categories[0].id,
                categoryName: categories[0].name,
            });
        }
    };

    const handleSave = async () => {
        if (!parseResult) return;

        try {
            const wallets = await getWallets();
            const walletId = wallets[0]?.id || 'wallet_default';

            await addTransaction({
                walletId,
                type: parseResult.type,
                amount: parseResult.amount,
                categoryId: parseResult.categoryId,
                description: parseResult.description,
                date: parseResult.date,
                createdBy: 'voice',
            });

            Alert.alert('✅ Thành công', 'Đã lưu giao dịch!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (err) {
            Alert.alert('Lỗi', 'Không thể lưu giao dịch');
        }
    };

    const handleRetry = () => {
        setTranscript('');
        setParseResult(null);
        setError(null);
    };

    const category = parseResult ? getCategoryById(parseResult.categoryId) : null;
    const categories = parseResult ? getCategoriesByType(parseResult.type) : [];

    // Generate waveform bars
    const waveBars = Array.from({ length: 30 }, (_, i) => i);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <SafeAreaView>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Ghi âm giọng nói</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {!parseResult ? (
                // Recording View
                <View style={styles.recordingView}>
                    {/* Waveform */}
                    <View style={styles.waveformContainer}>
                        {waveBars.map((_, index) => (
                            <WaveformBar key={index} index={index} isListening={isListening || isProcessing} />
                        ))}
                    </View>

                    {/* Processing Indicator */}
                    {isProcessing && (
                        <View style={styles.processingContainer}>
                            <ActivityIndicator size="large" color="#8B5CF6" />
                            <Text style={styles.processingText}>Đang xử lý...</Text>
                        </View>
                    )}

                    {/* Status Text */}
                    <View style={styles.statusContainer}>
                        {isProcessing ? null : transcript ? (
                            <Text style={styles.transcriptText}>
                                {transcript}
                            </Text>
                        ) : isListening ? (
                            <Text style={styles.listeningText}>Đang nghe...</Text>

                        ) : (
                            <>
                                <Text style={styles.instructionText}>
                                    Ghi âm được chuyển đổi sang văn bản ngay trên thiết bị này.
                                </Text>
                                <Text style={styles.instructionText}>
                                    Bằng cách nhấn ghi âm, bạn đồng ý chia sẻ văn bản để chuyển đổi
                                </Text>
                                <Text style={styles.instructionText}>
                                    với Google Gemini.
                                </Text>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                                </View>
                            </>
                        )}

                        {error && (
                            <Text style={styles.errorText}>{error}</Text>
                        )}
                    </View>

                    {/* Button Section */}
                    <View style={styles.micSection}>
                        <Text style={styles.micLabel}>
                            {transcript ? 'Chọn hành động' : isListening ? 'Nhấn để dừng' : 'Nhấn để ghi âm'}
                        </Text>

                        {transcript && !isListening ? (
                            // 3 nút sau khi có transcript
                            <View style={styles.actionButtons}>
                                {/* Nút Xóa (đỏ) */}
                                <TouchableOpacity
                                    style={styles.actionBtnRed}
                                    onPress={handleRetry}
                                >
                                    <Ionicons name="close" size={24} color="#FFF" />
                                </TouchableOpacity>

                                {/* Nút Ghi âm lại (xám) */}
                                <TouchableOpacity
                                    style={styles.actionBtnGray}
                                    onPress={startListening}
                                >
                                    <Ionicons name="mic" size={28} color="#FFF" />
                                </TouchableOpacity>

                                {/* Nút Tiếp tục (xanh) */}
                                <TouchableOpacity
                                    style={styles.actionBtnBlue}
                                    onPress={() => processVoice(transcript)}
                                >
                                    <Ionicons name="arrow-forward" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            // Nút mic bình thường
                            <TouchableOpacity
                                onPress={isListening ? stopListening : startListening}
                                activeOpacity={0.8}
                            >
                                <Animated.View style={[
                                    styles.micButton,
                                    isListening && styles.micButtonActive,
                                    { transform: [{ scale: micScale }] }
                                ]}>
                                    <Ionicons
                                        name={isListening ? 'stop' : 'mic'}
                                        size={32}
                                        color="#FFF"
                                    />
                                </Animated.View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

            ) : (
                // Result View
                <ScrollView style={styles.resultView} contentContainerStyle={styles.resultContent}>
                    <View style={styles.resultCard}>
                        <Text style={styles.resultTitle}>✨ Kết quả nhận dạng</Text>

                        <View style={styles.transcriptBox}>
                            <Text style={styles.resultTranscript}>"{parseResult.description}"</Text>
                        </View>

                        {/* Type */}
                        <TouchableOpacity style={styles.resultRow} onPress={handleToggleType}>
                            <Text style={styles.resultLabel}>Loại</Text>
                            <View style={[
                                styles.typeBadge,
                                { backgroundColor: parseResult.type === 'expense' ? '#FEE2E2' : '#D1FAE5' }
                            ]}>
                                <Text style={{
                                    color: parseResult.type === 'expense' ? '#EF4444' : '#10B981',
                                    fontWeight: '600',
                                }}>
                                    {parseResult.type === 'expense' ? '💸 Chi tiêu' : '💰 Thu nhập'}
                                </Text>
                                <Ionicons
                                    name="swap-horizontal"
                                    size={16}
                                    color={parseResult.type === 'expense' ? '#EF4444' : '#10B981'}
                                />
                            </View>
                        </TouchableOpacity>

                        {/* Amount */}
                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>Số tiền</Text>
                            <Text style={[styles.resultAmount, {
                                color: parseResult.type === 'expense' ? '#EF4444' : '#10B981'
                            }]}>
                                {parseResult.type === 'expense' ? '-' : '+'}{formatMoney(parseResult.amount)}
                            </Text>
                        </View>

                        {/* Category */}
                        <TouchableOpacity style={styles.resultRow} onPress={() => setShowCategoryModal(true)}>
                            <Text style={styles.resultLabel}>Danh mục</Text>
                            <View style={styles.categorySelector}>
                                {category && (
                                    <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                                )}
                                <Text style={styles.categoryText}>{category?.name}</Text>
                                <Ionicons name="chevron-down" size={18} color="#6B7280" />
                            </View>
                        </TouchableOpacity>

                        {/* Ngày giờ */}
                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>Ngày giờ</Text>
                            <Text style={styles.dateTimeText}>
                                {new Date().toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                })} - {new Date().toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </View>

                        {/* Actions */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                                <Ionicons name="refresh" size={20} color="#9CA3AF" />
                                <Text style={styles.retryText}>Thử lại</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveText}>Lưu giao dịch</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* Category Modal */}
            <Modal
                visible={showCategoryModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn danh mục</Text>
                            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.categoryGrid}>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryItem,
                                        parseResult?.categoryId === cat.id && styles.categoryItemActive,
                                    ]}
                                    onPress={() => handleChangeCategory(cat)}
                                >
                                    <View style={[
                                        styles.categoryIcon,
                                        { backgroundColor: cat.color + '20' },
                                        parseResult?.categoryId === cat.id && { backgroundColor: cat.color },
                                    ]}>
                                        <Ionicons
                                            name={cat.icon as any}
                                            size={22}
                                            color={parseResult?.categoryId === cat.id ? '#FFF' : cat.color}
                                        />
                                    </View>
                                    <Text style={[
                                        styles.categoryName,
                                        parseResult?.categoryId === cat.id && styles.categoryNameActive,
                                    ]}>
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F23',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFF',
    },
    // Recording View
    recordingView: {
        flex: 1,
        justifyContent: 'space-between',
        paddingBottom: 60,
    },
    // Waveform
    waveformContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 100,
        marginTop: 60,
        gap: 3,
    },
    waveBar: {
        width: 3,
        backgroundColor: '#8B5CF6',
        borderRadius: 2,
    },
    // Status
    statusContainer: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    instructionText: {
        color: '#6B7280',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    infoIcon: {
        marginTop: 12,
    },
    transcriptText: {
        color: '#A78BFA',
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        marginTop: 12,
    },
    // Mic Section
    micSection: {
        alignItems: 'center',
    },
    micLabel: {
        color: '#9CA3AF',
        fontSize: 14,
        marginBottom: 16,
    },
    micButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#EC4899',
        alignItems: 'center',
        justifyContent: 'center',
    },
    micButtonActive: {
        backgroundColor: '#EF4444',
    },
    // Result View
    resultView: {
        flex: 1,
    },
    resultContent: {
        padding: 16,
    },
    resultCard: {
        backgroundColor: '#1A1A2E',
        borderRadius: 20,
        padding: 20,
    },
    resultTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    transcriptBox: {
        backgroundColor: '#0F0F23',
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
    },
    resultTranscript: {
        color: '#A78BFA',
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2D2D4A',
    },
    resultLabel: {
        color: '#6B7280',
        fontSize: 14,
    },
    resultAmount: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    categorySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    categoryText: {
        color: '#FFF',
        fontSize: 14,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    retryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#374151',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    retryText: {
        color: '#9CA3AF',
        fontWeight: '600',
    },
    saveBtn: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981',
        paddingVertical: 14,
        borderRadius: 12,
    },
    saveText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 15,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1A1A2E',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#2D2D4A',
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 12,
    },
    categoryItem: {
        width: (width - 80) / 3,
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    categoryItemActive: {
        backgroundColor: '#2D2D4A',
    },
    categoryIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    categoryName: {
        color: '#9CA3AF',
        fontSize: 11,
        textAlign: 'center',
    },
    categoryNameActive: {
        color: '#FFF',
    },
    // Listening text
    listeningText: {
        color: '#A78BFA',
        fontSize: 18,
        fontWeight: '500',
    },
    // Action Buttons (3 nút)
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    actionBtnRed: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnGray: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#4B5563',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnBlue: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Processing
    processingContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    processingText: {
        color: '#A78BFA',
        fontSize: 16,
        marginTop: 12,
    },
    dateTimeText: {
        color: '#FFF',
        fontSize: 14,
    },

});


