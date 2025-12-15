/**
 * VoiceInputScreen - Màn hình nhập giao dịch bằng giọng nói THẬT
 * 
 * Sử dụng expo-speech-recognition để nhận dạng giọng nói
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
    ActivityIndicator,
    Animated,
    TextInput,
    KeyboardAvoidingView,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { addTransaction, getWallets } from '../../utils/finance/storage';
import { findCategoryFromText, getCategoryById } from '../../utils/finance/categories';
import { VoiceParseResult, TransactionType } from '../../types/finance';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

// Format số tiền
const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

// Parse số tiền từ text
const parseAmount = (text: string): number => {
    const lowerText = text.toLowerCase();

    // Tìm số với đơn vị nghìn
    const nghinMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*(?:nghìn|ngàn|ngh)/);
    if (nghinMatch) {
        return parseFloat(nghinMatch[1].replace(',', '.')) * 1000;
    }

    // Tìm số với đơn vị k/K
    const kMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*k/);
    if (kMatch) {
        return parseFloat(kMatch[1].replace(',', '.')) * 1000;
    }

    // Tìm số với đơn vị triệu
    const trieuMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*tri[ệe]u/);
    if (trieuMatch) {
        return parseFloat(trieuMatch[1].replace(',', '.')) * 1000000;
    }

    // Tìm số thuần túy
    const numMatch = lowerText.match(/(\d{1,3}(?:[.,]?\d{3})*)/g);
    if (numMatch) {
        const numbers = numMatch.map(n => parseFloat(n.replace(/[.,]/g, '')));
        return Math.max(...numbers);
    }

    return 0;
};

// Parse local
const parseVoiceLocal = (text: string): VoiceParseResult | null => {
    const lowerText = text.toLowerCase();

    const incomeKeywords = ['lương', 'thu', 'nhận', 'bán', 'thưởng', 'được cho', 'lì xì', 'tiền mừng', 'trả lại'];
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

// Example texts for manual input
const EXAMPLE_TEXTS = [
    'Mua bánh mì 30k',
    'Đổ xăng 100 nghìn',
    'Ăn trưa 150k',
    'Nhận lương 15 triệu',
];

export default function VoiceInputScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();

    // State
    const [mode, setMode] = useState<'voice' | 'text'>('voice');
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [manualText, setManualText] = useState('');
    const [parseResult, setParseResult] = useState<VoiceParseResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    // Animation
    const pulseAnim = useRef(new Animated.Value(1)).current;

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
        console.log('Speech error:', event.error);
        setIsListening(false);
        if (event.error === 'no-speech') {
            setError('Không nghe thấy giọng nói. Vui lòng thử lại.');
        } else if (event.error === 'not-allowed') {
            setError('Chưa cấp quyền microphone. Vui lòng cấp quyền trong Cài đặt.');
        } else {
            setError('Có lỗi xảy ra. Vui lòng thử lại.');
        }
    });

    // Pulse animation
    useEffect(() => {
        if (isListening) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.3,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isListening]);

    // Start listening
    const startListening = async () => {
        if (!hasPermission) {
            const granted = await requestPermission();
            if (!granted) {
                Alert.alert(
                    'Cần quyền microphone',
                    'Vui lòng cấp quyền microphone để sử dụng tính năng nhập giọng nói.',
                    [{ text: 'OK' }]
                );
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
            console.error('Start error:', err);
            setError('Không thể khởi động nhận dạng giọng nói.');
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
            setError('Vui lòng nói nội dung giao dịch.');
            return;
        }

        setIsProcessing(true);

        try {
            const result = parseVoiceLocal(text);

            if (result) {
                setParseResult(result);
                setError(null);
            } else {
                setError('Không thể nhận dạng số tiền. Vui lòng nói rõ ràng hơn, ví dụ: "Mua cafe 35 nghìn"');
            }
        } catch (err) {
            console.error('Parse error:', err);
            setError('Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualSubmit = () => {
        if (manualText.trim()) {
            setTranscript(manualText);
            processVoice(manualText);
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
                createdBy: mode === 'voice' ? 'voice' : 'manual',
            });

            Alert.alert('✅ Thành công', 'Đã lưu giao dịch!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (err) {
            console.error('Save error:', err);
            Alert.alert('Lỗi', 'Không thể lưu giao dịch.');
        }
    };

    const handleRetry = () => {
        setTranscript('');
        setManualText('');
        setParseResult(null);
        setError(null);
    };

    const category = parseResult ? getCategoryById(parseResult.categoryId) : null;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="close" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Nhập nhanh</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {/* Mode Switcher */}
                    <View style={styles.modeSwitcher}>
                        <TouchableOpacity
                            style={[styles.modeBtn, mode === 'voice' && styles.modeBtnActive]}
                            onPress={() => setMode('voice')}
                        >
                            <Ionicons name="mic" size={18} color={mode === 'voice' ? '#8B5CF6' : '#FFF'} />
                            <Text style={[styles.modeBtnText, mode === 'voice' && styles.modeBtnTextActive]}>
                                Giọng nói
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeBtn, mode === 'text' && styles.modeBtnActive]}
                            onPress={() => setMode('text')}
                        >
                            <Ionicons name="create" size={18} color={mode === 'text' ? '#8B5CF6' : '#FFF'} />
                            <Text style={[styles.modeBtnText, mode === 'text' && styles.modeBtnTextActive]}>
                                Nhập text
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Voice Mode Instructions */}
                    {mode === 'voice' && !transcript && !isListening && (
                        <View style={styles.instructions}>
                            <View style={styles.micIconLarge}>
                                <Ionicons name="mic" size={48} color="#8B5CF6" />
                            </View>
                            <Text style={styles.instructionTitle}>
                                Bấm nút mic và nói
                            </Text>
                            <Text style={styles.instructionText}>
                                Ví dụ: "Mua cafe 35 nghìn"
                            </Text>
                            <Text style={styles.instructionText}>
                                Hoặc: "Nhận lương 15 triệu"
                            </Text>
                        </View>
                    )}

                    {/* Text Mode Input */}
                    {mode === 'text' && !parseResult && (
                        <View style={styles.textInputSection}>
                            <Text style={styles.inputLabel}>
                                Nhập mô tả giao dịch:
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder='Ví dụ: "Mua cafe 35k" hoặc "Nhận lương 15 triệu"'
                                placeholderTextColor="#6B7280"
                                value={manualText}
                                onChangeText={setManualText}
                                multiline
                                autoFocus
                            />

                            <View style={styles.quickExamples}>
                                <Text style={styles.quickExamplesLabel}>Gợi ý:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {EXAMPLE_TEXTS.map((text, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.exampleChip}
                                            onPress={() => setManualText(text)}
                                        >
                                            <Text style={styles.exampleChipText}>{text}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, !manualText.trim() && styles.submitBtnDisabled]}
                                onPress={handleManualSubmit}
                                disabled={!manualText.trim()}
                            >
                                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                                <Text style={styles.submitBtnText}>Phân tích</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Listening Animation */}
                    {isListening && (
                        <View style={styles.listeningContainer}>
                            <Animated.View style={[
                                styles.listeningCircle,
                                { transform: [{ scale: pulseAnim }] }
                            ]}>
                                <Ionicons name="mic" size={48} color="#FFF" />
                            </Animated.View>
                            <Text style={styles.listeningText}>Đang nghe...</Text>
                            {transcript ? (
                                <Text style={styles.realtimeTranscript}>"{transcript}"</Text>
                            ) : (
                                <Text style={styles.listeningHint}>Hãy nói vào microphone</Text>
                            )}
                        </View>
                    )}

                    {/* Transcript */}
                    {transcript && !isListening && !parseResult && !isProcessing && (
                        <View style={styles.transcriptCard}>
                            <Text style={styles.transcriptLabel}>Nội dung:</Text>
                            <Text style={styles.transcriptText}>"{transcript}"</Text>
                        </View>
                    )}

                    {/* Processing */}
                    {isProcessing && (
                        <View style={styles.processingContainer}>
                            <ActivityIndicator size="large" color="#8B5CF6" />
                            <Text style={styles.processingText}>Đang phân tích...</Text>
                        </View>
                    )}

                    {/* Parse Result */}
                    {parseResult && !isProcessing && (
                        <View style={styles.resultCard}>
                            <Text style={styles.resultTitle}>✨ Thông tin giao dịch</Text>

                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Loại:</Text>
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
                                </View>
                            </View>

                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Số tiền:</Text>
                                <Text style={[styles.resultAmount, {
                                    color: parseResult.type === 'expense' ? '#EF4444' : '#10B981'
                                }]}>
                                    {parseResult.type === 'expense' ? '-' : '+'}{formatMoney(parseResult.amount)}
                                </Text>
                            </View>

                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Danh mục:</Text>
                                <View style={styles.categoryBadge}>
                                    {category && (
                                        <>
                                            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                                            <Text style={styles.categoryText}>{category.name}</Text>
                                        </>
                                    )}
                                </View>
                            </View>

                            <View style={styles.resultActions}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.retryButton]}
                                    onPress={handleRetry}
                                >
                                    <Ionicons name="refresh" size={20} color="#6B7280" />
                                    <Text style={styles.retryButtonText}>Thử lại</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton, styles.saveButton]}
                                    onPress={handleSave}
                                >
                                    <Ionicons name="checkmark" size={20} color="#FFF" />
                                    <Text style={styles.saveButtonText}>Lưu giao dịch</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Error */}
                    {error && (
                        <View style={styles.errorCard}>
                            <Ionicons name="warning" size={24} color="#EF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Mic Button (only in voice mode) */}
            {mode === 'voice' && !parseResult && (
                <View style={styles.micContainer}>
                    <TouchableOpacity
                        style={styles.micButtonWrapper}
                        onPress={isListening ? stopListening : startListening}
                        activeOpacity={0.8}
                    >
                        <Animated.View style={[
                            styles.micButton,
                            { transform: [{ scale: isListening ? pulseAnim : 1 }] }
                        ]}>
                            <LinearGradient
                                colors={isListening ? ['#EF4444', '#DC2626'] : ['#8B5CF6', '#7C3AED']}
                                style={styles.micGradient}
                            >
                                <Ionicons
                                    name={isListening ? 'stop' : 'mic'}
                                    size={40}
                                    color="#FFF"
                                />
                            </LinearGradient>
                        </Animated.View>
                    </TouchableOpacity>
                    <Text style={styles.micHint}>
                        {isListening ? 'Bấm để dừng' : 'Bấm để nói'}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F23',
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
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    // Mode Switcher
    modeSwitcher: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 4,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
    },
    modeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    modeBtnActive: {
        backgroundColor: '#FFF',
    },
    modeBtnText: {
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
        fontSize: 13,
    },
    modeBtnTextActive: {
        color: '#8B5CF6',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 140,
    },
    // Instructions
    instructions: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    micIconLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#8B5CF620',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    instructionTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    instructionText: {
        color: '#9CA3AF',
        fontSize: 15,
        marginBottom: 6,
        textAlign: 'center',
    },
    // Text Input Section
    textInputSection: {
        marginBottom: 24,
    },
    inputLabel: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    textInput: {
        backgroundColor: '#1A1A2E',
        borderRadius: 12,
        padding: 16,
        color: '#FFF',
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    quickExamples: {
        marginBottom: 16,
    },
    quickExamplesLabel: {
        color: '#6B7280',
        fontSize: 12,
        marginBottom: 8,
    },
    exampleChip: {
        backgroundColor: '#1A1A2E',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    exampleChipText: {
        color: '#A78BFA',
        fontSize: 13,
    },
    submitBtn: {
        backgroundColor: '#8B5CF6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    submitBtnDisabled: {
        backgroundColor: '#4B5563',
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Listening
    listeningContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    listeningCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#8B5CF6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    listeningText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '600',
    },
    listeningHint: {
        color: '#6B7280',
        fontSize: 14,
        marginTop: 8,
    },
    realtimeTranscript: {
        color: '#A78BFA',
        fontSize: 16,
        fontStyle: 'italic',
        marginTop: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    // Transcript
    transcriptCard: {
        backgroundColor: '#1A1A2E',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    transcriptLabel: {
        color: '#6B7280',
        fontSize: 12,
        marginBottom: 4,
    },
    transcriptText: {
        color: '#FFF',
        fontSize: 16,
        fontStyle: 'italic',
    },
    // Processing
    processingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    processingText: {
        color: '#9CA3AF',
        marginTop: 12,
        fontSize: 14,
    },
    // Result Card
    resultCard: {
        backgroundColor: '#1A1A2E',
        padding: 20,
        borderRadius: 16,
        gap: 16,
    },
    resultTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resultLabel: {
        color: '#6B7280',
        fontSize: 14,
    },
    resultAmount: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    typeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    categoryBadge: {
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
        fontWeight: '500',
    },
    resultActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    retryButton: {
        backgroundColor: '#374151',
    },
    retryButtonText: {
        color: '#9CA3AF',
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#10B981',
        flex: 2,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    // Error
    errorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E220',
        padding: 16,
        borderRadius: 12,
        gap: 12,
        marginTop: 16,
    },
    errorText: {
        color: '#EF4444',
        flex: 1,
    },
    // Mic
    micContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingBottom: 40,
        backgroundColor: '#0F0F23',
    },
    micButtonWrapper: {
        marginBottom: 12,
    },
    micButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
    },
    micGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micHint: {
        color: '#6B7280',
        fontSize: 14,
    },
});
