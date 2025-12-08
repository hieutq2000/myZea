import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, GEMINI_API_KEY } from '../utils/theme';
import { speakWithGoogleTTS, stopTTS } from '../utils/googleTTS';
import { periodicFaceCheck } from '../utils/faceVerification';
import FaceVerificationScreen from './FaceVerificationScreen';
import {
    User, LiveStatus, LiveMode, Topic, TOPIC_LABELS,
    AiVoice, TargetAudience, SessionLogEntry, ExamResult
} from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAMERA_SIZE = SCREEN_WIDTH * 0.35;

interface LiveSessionScreenProps {
    user: User;
    mode: LiveMode;
    topic: Topic;
    audience: TargetAudience;
    onEnd: (result?: ExamResult) => void;
}

export default function LiveSessionScreen({
    user, mode, topic, audience, onEnd
}: LiveSessionScreenProps) {
    const [status, setStatus] = useState<LiveStatus>(LiveStatus.IDLE);
    const [error, setError] = useState<string | null>(null);
    const [aiTranscript, setAiTranscript] = useState<string>('');
    const [sessionLog, setSessionLog] = useState<SessionLogEntry[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    // Anti-cheat states
    const [faceDetected, setFaceDetected] = useState(false);
    const [faceVerified, setFaceVerified] = useState(false);
    const [showFaceVerification, setShowFaceVerification] = useState(false);
    const [verificationMessage, setVerificationMessage] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [warningCount, setWarningCount] = useState(0);
    const [showViolationWarning, setShowViolationWarning] = useState(false);
    const [currentScore, setCurrentScore] = useState<'ĐẠT' | 'CHƯA ĐẠT' | null>(null);
    const [cheatingDetails, setCheatingDetails] = useState<string | null>(null);
    const [showIntro, setShowIntro] = useState(false);

    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const borderAnim = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef<ScrollView>(null);
    const sessionStartTime = useRef<number>(Date.now());

    const isExamMode = mode === LiveMode.EXAM || mode === LiveMode.CUSTOM;

    // Animate camera border when face is detected/lost
    useEffect(() => {
        Animated.timing(borderAnim, {
            toValue: faceDetected ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [faceDetected]);

    // Pulse animation for AI avatar
    useEffect(() => {
        if (isAiSpeaking) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isAiSpeaking]);

    // Auto scroll
    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [sessionLog]);

    // TTS function (moved up to avoid "used before declaration" error)
    const speakText = useCallback((text: string) => {
        setIsAiSpeaking(true);

        // Use Google Cloud TTS for high-quality neural voice
        speakWithGoogleTTS(
            text,
            audience === TargetAudience.KIDS ? 'vi-VN-Wavenet-C' : 'vi-VN-Neural2-A',
            () => setIsAiSpeaking(true),
            () => setIsAiSpeaking(false),
            () => setIsAiSpeaking(false)
        );
    }, [audience]);

    // Note: Face verification is now handled by FaceVerificationScreen
    // before the session starts, so we removed the old inline verification code

    // Periodic face check during exam (every 30 seconds)
    useEffect(() => {
        if (!isExamMode || status !== LiveStatus.CONNECTED || !faceVerified) return;

        const checkInterval = setInterval(async () => {
            if (!cameraRef.current || !user.avatar) return;

            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.3,
                });

                if (!photo?.base64) return;

                const result = await periodicFaceCheck(
                    `data:image/jpeg;base64,${photo.base64}`,
                    user.avatar
                );

                if (!result.isSamePerson) {
                    setShowViolationWarning(true);
                    setWarningCount(prev => {
                        const newCount = prev + 1;
                        if (newCount >= 3) {
                            handleCheatingDetected('Phát hiện người khác thi thay');
                        }
                        return newCount;
                    });
                    speakText('Cảnh báo! Phát hiện người khác. Vui lòng giữ đúng người thi trong khung hình.');
                    setTimeout(() => setShowViolationWarning(false), 3000);
                }

                if (result.suspiciousActivity) {
                    setShowViolationWarning(true);
                    setWarningCount(prev => prev + 1);
                    speakText(`Cảnh báo! ${result.message}`);
                    setTimeout(() => setShowViolationWarning(false), 3000);
                }
            } catch (error) {
                console.error('Periodic check error:', error);
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(checkInterval);
    }, [isExamMode, status, faceVerified, user.avatar, speakText]);

    const handleCheatingDetected = (reason: string) => {
        setCheatingDetails(reason);
        setWarningCount(3); // Max warnings
        handleViolation(reason);
    };

    const handleViolation = (reason?: string) => {
        stopTTS();
        setCurrentScore('CHƯA ĐẠT');

        const result: ExamResult = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            score: 'CHƯA ĐẠT',
            duration: formatDuration(Date.now() - sessionStartTime.current),
            transcript: sessionLog,
            topic: TOPIC_LABELS[topic],
        };

        const violationReason = reason || cheatingDetails || 'Không giữ khuôn mặt trong khung hình';

        Alert.alert(
            '❌ VI PHẠM QUY CHẾ THI',
            `Bạn đã bị phát hiện vi phạm quy chế thi.\n\nLý do: ${violationReason}\n\nKết quả: CHƯA ĐẠT.`,
            [{ text: 'Đóng', onPress: () => onEnd(result) }]
        );
    };

    const formatDuration = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes} phút ${secs} giây`;
    };

    const addToLog = useCallback((speaker: 'AI' | 'USER', text: string) => {
        if (!text.trim()) return;
        setSessionLog(prev => [...prev, { speaker, text, timestamp: Date.now() }]);
    }, []);

    const startSession = useCallback(async () => {
        try {
            setStatus(LiveStatus.CONNECTING);
            setError(null);
            sessionStartTime.current = Date.now();

            const { granted: camGranted } = await requestCameraPermission();
            const { granted: audioGranted } = await Audio.requestPermissionsAsync();

            if (!camGranted || !audioGranted) {
                throw new Error('Cần quyền camera và microphone để tiếp tục');
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            setStatus(LiveStatus.CONNECTED);

            if (isExamMode) {
                speakText("Đang quét an ninh. Vui lòng nhìn thẳng vào camera...");
            } else {
                speakText("Xin chào! Đang kết nối với gia sư AI. Vui lòng đợi trong giây lát...");
            }

            // Wait for face detection before starting
            setTimeout(async () => {
                try {
                    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                    const systemPrompt = generateSystemPrompt(mode, topic, audience);
                    const result = await model.generateContent(systemPrompt + '\n\nHãy bắt đầu buổi học với lời chào ngắn gọn và câu hỏi đầu tiên.');

                    const aiResponse = result.response.text();
                    setAiTranscript(aiResponse);
                    addToLog('AI', aiResponse);
                    speakText(aiResponse);
                    setCurrentQuestion(1);
                } catch (innerError) {
                    console.error('Error in startSession timeout:', innerError);
                    setError((innerError as Error).message || 'Không thể kết nối với AI');
                    setStatus(LiveStatus.ERROR);
                }
            }, isExamMode ? 3000 : 1000);

        } catch (e) {
            console.error(e);
            setError((e as Error).message);
            setStatus(LiveStatus.ERROR);
        }
    }, [mode, topic, audience, speakText, addToLog, isExamMode]);

    // Toggle recording on/off
    const toggleRecording = async () => {
        if (isRecording) {
            // Stop recording
            if (!recording) return;
            try {
                setIsRecording(false);
                await recording.stopAndUnloadAsync();
                setRecording(null);

                // Placeholder - send audio to STT service in production
                const userResponse = 'Đây là câu trả lời của học sinh...';
                addToLog('USER', userResponse);
                await generateAIResponse(userResponse);
            } catch (err) {
                console.error('Failed to stop recording', err);
            }
        } else {
            // Start recording
            try {
                if (isAiSpeaking) {
                    stopTTS();
                    setIsAiSpeaking(false);
                }

                const { recording: newRecording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(newRecording);
                setIsRecording(true);
            } catch (err) {
                console.error('Failed to start recording', err);
                Alert.alert('Lỗi', 'Không thể bắt đầu ghi âm');
            }
        }
    };

    const generateAIResponse = async (userInput: string) => {
        try {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            const context = sessionLog.map(log => `${log.speaker}: ${log.text}`).join('\n');
            const prompt = `${generateSystemPrompt(mode, topic, audience)}\n\nLịch sử hội thoại:\n${context}\n\nUSER: ${userInput}\n\nHãy phản hồi phù hợp.`;

            const result = await model.generateContent(prompt);
            const aiResponse = result.response.text();

            setAiTranscript(aiResponse);
            addToLog('AI', aiResponse);
            speakText(aiResponse);

            const upperText = aiResponse.toUpperCase();
            if (upperText.includes('CÂU HỎI 2') || upperText.includes('CÂU 2')) {
                setCurrentQuestion(2);
            } else if (upperText.includes('CÂU HỎI 3') || upperText.includes('CÂU 3')) {
                setCurrentQuestion(3);
            }

            if (upperText.includes('KẾT QUẢ:') || upperText.includes('TỔNG KẾT')) {
                const score = upperText.includes('ĐẠT') && !upperText.includes('CHƯA ĐẠT') ? 'ĐẠT' : 'CHƯA ĐẠT';
                setCurrentScore(score);
                handleEndSession(score);
            }
        } catch (err) {
            console.error('AI Response error:', err);
            setError('Lỗi khi nhận phản hồi từ AI');
        }
    };

    const handleEndSession = (score?: 'ĐẠT' | 'CHƯA ĐẠT') => {
        stopTTS();

        if (isExamMode) {
            const result: ExamResult = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                score: score || currentScore || 'CHƯA ĐẠT',
                duration: formatDuration(Date.now() - sessionStartTime.current),
                transcript: sessionLog,
                topic: TOPIC_LABELS[topic],
            };
            onEnd(result);
        } else {
            onEnd();
        }
    };

    const handleNextQuestion = async () => {
        if (currentQuestion < 3) {
            await generateAIResponse('Tiếp tục sang câu hỏi tiếp theo');
        } else {
            await generateAIResponse('Kết thúc bài thi và đưa ra tổng kết');
        }
    };

    useEffect(() => {
        // For exam mode, show intro first
        if (isExamMode) {
            setShowIntro(true);
        } else {
            // Practice mode - start directly
            startSession();
        }

        return () => {
            stopTTS();
            if (recording) {
                recording.stopAndUnloadAsync();
            }
        };
    }, []);

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLORS.error, COLORS.success],
    });

    const renderTranscript = () => (
        <ScrollView
            ref={scrollRef}
            style={styles.transcriptContainer}
            showsVerticalScrollIndicator={false}
        >
            {sessionLog.map((log, index) => (
                <View
                    key={index}
                    style={[
                        styles.messageBubble,
                        log.speaker === 'AI' ? styles.aiBubble : styles.userBubble
                    ]}
                >
                    <Text style={[
                        styles.messageSpeaker,
                        log.speaker === 'USER' && { color: COLORS.white }
                    ]}>
                        {log.speaker === 'AI' ? '🤖 Gia Sư AI' : '👤 Bạn'}
                    </Text>
                    <Text style={[
                        styles.messageText,
                        log.speaker === 'USER' && { color: COLORS.white }
                    ]}>
                        {log.text}
                    </Text>
                </View>
            ))}
        </ScrollView>
    );

    const renderIntro = () => (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { backgroundColor: '#0056D2', borderBottomWidth: 0, paddingVertical: SPACING.md }]}>
                <TouchableOpacity style={{ width: 40 }} onPress={() => onEnd()}>
                    <Ionicons name="chevron-back" size={28} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.white, flex: 1, textAlign: 'center', marginRight: 40 }}>
                    AI dò bài
                </Text>
            </View>

            <ScrollView style={{ flex: 1, backgroundColor: COLORS.white }} contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}>
                {/* Info Items */}
                <View style={{ marginBottom: SPACING.xl }}>
                    {[
                        { icon: 'list', label: 'Số lượng', value: '3 câu hỏi' },
                        { icon: 'hourglass-outline', label: 'Thời lượng mỗi câu', value: '180 giây' },
                        { icon: 'document-text-outline', label: 'Tiêu chí đánh giá', value: 'Chuyên môn' },
                        { icon: 'trophy-outline', label: 'Cách lấy điểm', value: 'Lấy điểm cao nhất' }
                    ].map((item, index) => (
                        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: 20,
                                borderWidth: 1, borderColor: '#0056D2',
                                alignItems: 'center', justifyContent: 'center',
                                marginRight: SPACING.md
                            }}>
                                <Ionicons name={item.icon as any} size={20} color="#0056D2" />
                            </View>
                            <View>
                                <Text style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 2 }}>{item.label}</Text>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0056D2' }}>{item.value}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Notes */}
                <View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md }}>
                        Lưu ý trước khi bắt đầu
                    </Text>
                    {[
                        "Đảm bảo camera và micro hoạt động tốt.",
                        "Ngồi ở nơi yên tĩnh, đủ ánh sáng, kết nối Internet ổn định.",
                        "Trong suốt bài kiểm tra, không rời khỏi màn hình, luôn giữ khuôn mặt chính diện để hệ thống xác thực.",
                        "Nếu bạn chọn \"Bỏ qua\", hệ thống sẽ chuyển sang câu hỏi tiếp theo và câu đó không được tính điểm. Nếu nhân viên thoát bài thi, hệ thống sẽ ghi nhận kết quả bài thi là Không đạt.",
                        "Nhân viên được phép thi nhiều lần trong ngày. Hệ thống sẽ lưu lại kết quả của mọi lần thi.",
                        "Sau khi hoàn thành, kết quả sẽ hiển thị Đạt / Không đạt"
                    ].map((note, index) => (
                        <View key={index} style={{ flexDirection: 'row', marginBottom: SPACING.sm }}>
                            <Text style={{ fontSize: 18, color: COLORS.text, marginRight: SPACING.sm, lineHeight: 24 }}>•</Text>
                            <Text style={{ flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 22 }}>
                                {note}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            <View style={{ padding: SPACING.md, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: '#0056D2',
                        paddingVertical: 16,
                        borderRadius: BORDER_RADIUS.lg,
                        alignItems: 'center'
                    }}
                    onPress={() => {
                        setShowIntro(false);
                        setShowFaceVerification(true);
                    }}
                >
                    <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: 'bold' }}>Bắt đầu kiểm tra</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );

    // Show Intro Screen
    if (showIntro && isExamMode) {
        return renderIntro();
    }

    // Show Face Verification Screen for Exam Mode
    if (showFaceVerification && isExamMode) {
        return (
            <FaceVerificationScreen
                avatarBase64={user.avatar || ''}
                onVerified={() => {
                    setShowFaceVerification(false);
                    setFaceVerified(true);
                    startSession();
                }}
                onCancel={() => onEnd()}
            />
        );
    }

    if (status === LiveStatus.CONNECTING) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>
                    {isExamMode ? 'Đang chuẩn bị phòng thi...' : 'Đang kết nối với gia sư AI...'}
                </Text>
                {isExamMode && (
                    <Text style={styles.loadingSubtext}>
                        Vui lòng giữ khuôn mặt trong khung hình
                    </Text>
                )}
            </SafeAreaView>
        );
    }

    if (status === LiveStatus.ERROR) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={startSession}>
                    <Text style={styles.retryText}>Thử Lại</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backBtn} onPress={() => onEnd()}>
                    <Text style={styles.backText}>Quay Lại</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Violation Warning Overlay */}
            {showViolationWarning && (
                <View style={styles.warningOverlay}>
                    <View style={styles.warningBox}>
                        <Text style={styles.warningIcon}>⚠️</Text>
                        <Text style={styles.warningTitle}>CẢNH BÁO!</Text>
                        <Text style={styles.warningText}>
                            Vui lòng giữ khuôn mặt trong khung hình
                        </Text>
                        <Text style={styles.warningCount}>
                            Cảnh báo: {warningCount}/3
                        </Text>
                    </View>
                </View>
            )}

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.topicBadge}>
                    <Text style={styles.topicText}>{TOPIC_LABELS[topic]}</Text>
                </View>

                {isExamMode && (
                    <>
                        <View style={styles.questionBadge}>
                            <Text style={styles.questionText}>Câu {currentQuestion}/3</Text>
                        </View>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: faceDetected ? COLORS.success : COLORS.warning }
                        ]}>
                            <Text style={styles.statusText}>
                                {faceDetected ? '✓ OK' : '⏳ Đang quét...'}
                            </Text>
                        </View>
                    </>
                )}

                <TouchableOpacity
                    style={styles.endBtn}
                    onPress={() => {
                        Alert.alert(
                            'Kết thúc',
                            isExamMode ? 'Bạn có chắc muốn kết thúc bài thi?' : 'Kết thúc buổi học?',
                            [
                                { text: 'Hủy', style: 'cancel' },
                                { text: 'Đồng ý', onPress: () => handleEndSession() }
                            ]
                        );
                    }}
                >
                    <Text style={styles.endText}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
                {/* Camera Section with Anti-cheat Frame */}
                <View style={styles.cameraWrapper}>
                    <Animated.View style={[
                        styles.cameraFrame,
                        { borderColor },
                        isExamMode && styles.examCameraFrame
                    ]}>
                        <CameraView
                            ref={cameraRef}
                            style={styles.camera}
                            facing="front"
                        />

                        {/* Face Guide Overlay */}
                        {isExamMode && (
                            <View style={styles.faceGuide}>
                                <View style={styles.faceGuideCircle} />
                            </View>
                        )}

                        {/* Face Status Indicator */}
                        <View style={[
                            styles.faceIndicator,
                            { backgroundColor: faceDetected ? COLORS.success : COLORS.error }
                        ]}>
                            <Text style={styles.faceIndicatorText}>
                                {faceDetected ? '👤' : '❓'}
                            </Text>
                        </View>
                    </Animated.View>

                    {/* AI Avatar */}
                    <View style={styles.aiAvatarWrapper}>
                        <Animated.View style={[
                            styles.aiAvatar,
                            { transform: [{ scale: pulseAnim }] }
                        ]}>
                            <Text style={styles.aiAvatarEmoji}>
                                {isAiSpeaking ? '🗣️' : '🤖'}
                            </Text>
                        </Animated.View>
                        {isAiSpeaking && (
                            <Text style={styles.speakingLabel}>Đang nói...</Text>
                        )}
                    </View>
                </View>

                {/* Warning Count for Exam Mode */}
                {isExamMode && warningCount > 0 && (
                    <View style={styles.warningBanner}>
                        <Text style={styles.warningBannerText}>
                            ⚠️ Số lần vi phạm: {warningCount}/3
                        </Text>
                    </View>
                )}

                {/* Transcript */}
                {renderTranscript()}
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                {isExamMode && currentQuestion > 0 && (
                    <TouchableOpacity
                        style={styles.nextBtn}
                        onPress={handleNextQuestion}
                    >
                        <Text style={styles.nextText}>
                            {currentQuestion < 3 ? 'Câu Tiếp →' : 'Kết Thúc'}
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.micBtn, isRecording && styles.micBtnActive]}
                    onPress={toggleRecording}
                >
                    <Text style={styles.micIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
                    <Text style={styles.micText}>
                        {isRecording ? 'Dừng' : 'Nói'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

function generateSystemPrompt(mode: LiveMode, topic: Topic, audience: TargetAudience): string {
    const topicLabel = TOPIC_LABELS[topic];

    if (audience === TargetAudience.KIDS) {
        return `
      SYSTEM: CHẾ ĐỘ DÀNH CHO TRẺ EM
      ROLE: Gia sư thân thiện, vui vẻ
      TOPIC: ${topicLabel}
      STYLE: Dùng ngôn ngữ đơn giản, emoji, khuyến khích trẻ
    `;
    }

    if (mode === LiveMode.EXAM) {
        return `
      SYSTEM: CHẾ ĐỘ THI
      ROLE: Giám khảo chuyên nghiệp về ${topicLabel}
      INSTRUCTIONS:
      - Hỏi 3 câu hỏi về ${topicLabel}
      - Đánh giá câu trả lời
      - Sau 3 câu, đưa ra KẾT QUẢ: ĐẠT hoặc CHƯA ĐẠT
    `;
    }

    return `
    SYSTEM: CHẾ ĐỘ ÔN TẬP
    ROLE: Gia sư thân thiện về ${topicLabel}
    INSTRUCTIONS:
    - Hỏi câu hỏi và giải thích khi cần
    - Động viên học sinh
    - Giúp học sinh hiểu sâu
  `;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: SPACING.md,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
    },
    loadingSubtext: {
        marginTop: SPACING.xs,
        fontSize: 14,
        color: COLORS.textLight,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
        padding: SPACING.xl,
    },
    errorIcon: {
        fontSize: 64,
        marginBottom: SPACING.md,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.error,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    retryBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
    },
    retryText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    backBtn: {
        paddingVertical: SPACING.md,
    },
    backText: {
        color: COLORS.textLight,
        fontSize: 16,
    },
    warningOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    warningBox: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        borderWidth: 4,
        borderColor: COLORS.error,
    },
    warningIcon: {
        fontSize: 64,
        marginBottom: SPACING.sm,
    },
    warningTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.error,
        marginBottom: SPACING.sm,
    },
    warningText: {
        fontSize: 16,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    warningCount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.error,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: SPACING.sm,
    },
    topicBadge: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
    },
    topicText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 12,
    },
    questionBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
    },
    questionText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
    },
    statusText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 10,
    },
    endBtn: {
        marginLeft: 'auto',
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    endText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    mainContent: {
        flex: 1,
    },
    cameraWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: SPACING.md,
        gap: SPACING.md,
    },
    cameraFrame: {
        width: CAMERA_SIZE,
        height: CAMERA_SIZE,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    examCameraFrame: {
        borderWidth: 6,
    },
    camera: {
        flex: 1,
    },
    faceGuide: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    faceGuideCircle: {
        width: '70%',
        height: '70%',
        borderRadius: 100,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        borderStyle: 'dashed',
    },
    faceIndicator: {
        position: 'absolute',
        top: SPACING.xs,
        right: SPACING.xs,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    faceIndicatorText: {
        fontSize: 14,
    },
    aiAvatarWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    aiAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.lg,
    },
    aiAvatarEmoji: {
        fontSize: 40,
    },
    speakingLabel: {
        marginTop: SPACING.xs,
        fontSize: 12,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    warningBanner: {
        backgroundColor: COLORS.error + '20',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        marginHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.error,
    },
    warningBannerText: {
        color: COLORS.error,
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
    },
    transcriptContainer: {
        flex: 1,
        padding: SPACING.md,
    },
    messageBubble: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.sm,
        maxWidth: '85%',
    },
    aiBubble: {
        backgroundColor: COLORS.white,
        alignSelf: 'flex-start',
        ...SHADOWS.sm,
    },
    userBubble: {
        backgroundColor: COLORS.primary,
        alignSelf: 'flex-end',
    },
    messageSpeaker: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
        color: COLORS.textLight,
    },
    messageText: {
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 22,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.lg,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: SPACING.md,
    },
    nextBtn: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
    },
    nextText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    micBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.full,
        ...SHADOWS.md,
    },
    micBtnActive: {
        backgroundColor: COLORS.error,
    },
    micIcon: {
        fontSize: 24,
        marginRight: SPACING.sm,
    },
    micText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
