/**
 * VoiceInputScreen - Màn hình nhập giao dịch bằng giọng nói
 * 
 * Features:
 * - Nhận dạng giọng nói
 * - AI phân tích và trích xuất thông tin giao dịch
 * - Xác nhận trước khi lưu
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { addTransaction, getWallets } from '../../utils/finance/storage';
import { findCategoryFromText, getCategoryById, ALL_CATEGORIES } from '../../utils/finance/categories';
import { VoiceParseResult, TransactionType } from '../../types/finance';

// Format số tiền
const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

// Parse số tiền từ text
const parseAmount = (text: string): number => {
    const lowerText = text.toLowerCase();

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
        // Lấy số lớn nhất (có khả năng là số tiền)
        const numbers = numMatch.map(n => parseFloat(n.replace(/[.,]/g, '')));
        return Math.max(...numbers);
    }

    return 0;
};

// Parse local - không cần AI
const parseVoiceLocal = (text: string): VoiceParseResult | null => {
    const lowerText = text.toLowerCase();

    // Xác định loại giao dịch
    const incomeKeywords = ['lương', 'thu', 'nhận', 'bán', 'thưởng', 'được cho', 'lì xì', 'tiền mừng'];
    const isIncome = incomeKeywords.some(kw => lowerText.includes(kw));
    const type: TransactionType = isIncome ? 'income' : 'expense';

    // Parse số tiền
    const amount = parseAmount(text);
    if (amount <= 0) return null;

    // Tìm danh mục
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

export default function VoiceInputScreen() {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();

    // State
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [parseResult, setParseResult] = useState<VoiceParseResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Animation
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isListening) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isListening]);

    // Simulate voice recognition (thay bằng expo-speech hoặc @react-native-voice sau)
    const startListening = async () => {
        setIsListening(true);
        setTranscript('');
        setParseResult(null);
        setError(null);

        // Simulate listening for 3 seconds
        setTimeout(() => {
            // Demo text
            const demoTexts = [
                'Hôm nay tôi mua 1 ổ bánh mì 30K',
                'Đổ xăng 100 nghìn',
                'Ăn trưa với đồng nghiệp 150K',
                'Nhận lương tháng 12 là 15 triệu',
                'Mua cafe 35K',
                'Tiền điện tháng này 500 nghìn',
            ];
            const randomText = demoTexts[Math.floor(Math.random() * demoTexts.length)];
            setTranscript(randomText);
            setIsListening(false);

            // Parse
            processVoice(randomText);
        }, 2000);
    };

    const stopListening = () => {
        setIsListening(false);
    };

    const processVoice = async (text: string) => {
        setIsProcessing(true);

        try {
            // Parse local (không cần AI)
            const result = parseVoiceLocal(text);

            if (result) {
                setParseResult(result);
            } else {
                setError('Không thể nhận dạng số tiền. Vui lòng thử lại.');
            }
        } catch (err) {
            console.error('Parse error:', err);
            setError('Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsProcessing(false);
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

            Alert.alert('Thành công', 'Đã lưu giao dịch!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (err) {
            console.error('Save error:', err);
            Alert.alert('Lỗi', 'Không thể lưu giao dịch.');
        }
    };

    const handleRetry = () => {
        setTranscript('');
        setParseResult(null);
        setError(null);
    };

    const category = parseResult ? getCategoryById(parseResult.categoryId) : null;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                        <Text style={styles.headerTitle}>Nhập bằng giọng nói</Text>
                        <View style={{ width: 28 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <View style={styles.content}>
                {/* Instructions */}
                {!transcript && !isListening && (
                    <View style={styles.instructions}>
                        <Text style={[styles.instructionTitle, { color: colors.text }]}>
                            Nói để nhập giao dịch
                        </Text>
                        <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                            Ví dụ: "Hôm nay tôi mua 1 ổ bánh mì 30K"
                        </Text>
                        <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                            Hoặc: "Nhận lương tháng 12 là 15 triệu"
                        </Text>
                    </View>
                )}

                {/* Transcript */}
                {transcript && (
                    <View style={[styles.transcriptCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.transcriptLabel, { color: colors.textSecondary }]}>
                            Bạn nói:
                        </Text>
                        <Text style={[styles.transcriptText, { color: colors.text }]}>
                            "{transcript}"
                        </Text>
                    </View>
                )}

                {/* Processing */}
                {isProcessing && (
                    <View style={styles.processingContainer}>
                        <ActivityIndicator size="large" color="#8B5CF6" />
                        <Text style={[styles.processingText, { color: colors.textSecondary }]}>
                            Đang phân tích...
                        </Text>
                    </View>
                )}

                {/* Parse Result */}
                {parseResult && !isProcessing && (
                    <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.resultTitle, { color: colors.text }]}>
                            Thông tin giao dịch
                        </Text>

                        <View style={styles.resultRow}>
                            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Loại:</Text>
                            <View style={[
                                styles.typeBadge,
                                { backgroundColor: parseResult.type === 'expense' ? '#FEE2E2' : '#D1FAE5' }
                            ]}>
                                <Text style={{
                                    color: parseResult.type === 'expense' ? '#EF4444' : '#10B981',
                                    fontWeight: '600',
                                }}>
                                    {parseResult.type === 'expense' ? 'Chi tiêu' : 'Thu nhập'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.resultRow}>
                            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Số tiền:</Text>
                            <Text style={[styles.resultAmount, {
                                color: parseResult.type === 'expense' ? '#EF4444' : '#10B981'
                            }]}>
                                {parseResult.type === 'expense' ? '-' : '+'}{formatMoney(parseResult.amount)}
                            </Text>
                        </View>

                        <View style={styles.resultRow}>
                            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Danh mục:</Text>
                            <View style={styles.categoryBadge}>
                                {category && (
                                    <>
                                        <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                                        <Text style={[styles.categoryText, { color: colors.text }]}>
                                            {category.name}
                                        </Text>
                                    </>
                                )}
                            </View>
                        </View>

                        <View style={styles.resultActions}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#E5E7EB' }]}
                                onPress={handleRetry}
                            >
                                <Ionicons name="refresh" size={20} color="#374151" />
                                <Text style={styles.actionButtonText}>Thử lại</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#8B5CF6', flex: 2 }]}
                                onPress={handleSave}
                            >
                                <Ionicons name="checkmark" size={20} color="#FFF" />
                                <Text style={[styles.actionButtonText, { color: '#FFF' }]}>Lưu giao dịch</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Error */}
                {error && (
                    <View style={[styles.errorCard, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="warning" size={24} color="#EF4444" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}
            </View>

            {/* Mic Button */}
            <View style={styles.micContainer}>
                <TouchableOpacity
                    style={styles.micButtonWrapper}
                    onPress={isListening ? stopListening : startListening}
                    activeOpacity={0.8}
                >
                    <Animated.View style={[
                        styles.micButton,
                        { transform: [{ scale: pulseAnim }] }
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
                <Text style={[styles.micHint, { color: colors.textSecondary }]}>
                    {isListening ? 'Đang nghe... Bấm để dừng' : 'Bấm để nói'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    instructions: {
        alignItems: 'center',
        marginBottom: 24,
    },
    instructionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    instructionText: {
        fontSize: 14,
        marginBottom: 4,
    },
    transcriptCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    transcriptLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    transcriptText: {
        fontSize: 16,
        fontStyle: 'italic',
    },
    processingContainer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    processingText: {
        marginTop: 12,
        fontSize: 14,
    },
    resultCard: {
        padding: 20,
        borderRadius: 16,
        gap: 16,
    },
    resultTitle: {
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
    actionButtonText: {
        fontWeight: '600',
        color: '#374151',
    },
    errorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    errorText: {
        color: '#EF4444',
        flex: 1,
    },
    micContainer: {
        alignItems: 'center',
        paddingBottom: 40,
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
        fontSize: 14,
    },
});
