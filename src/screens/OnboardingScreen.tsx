import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
    Platform,
    Alert,
    Dimensions,
    Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from '../types';

const { width, height } = Dimensions.get('window');

// Facebook colors
const FACEBOOK_BLUE = '#1877F2';
const GRAY_TEXT = '#65676B';
const LIGHT_GRAY = '#F0F2F5';

interface OnboardingScreenProps {
    user: User;
    onComplete: (user: User) => void;
    onSkip: () => void;
}

export default function OnboardingScreen({ user, onComplete, onSkip }: OnboardingScreenProps) {
    const [step, setStep] = useState(1); // 1: Avatar, 2: Cover (optional)
    const [avatar, setAvatar] = useState<string | undefined>(undefined);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);

    // Animation
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    const animateTransition = (callback: () => void) => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -50,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            callback();
            slideAnim.setValue(50);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    };

    const handleTakePhoto = async () => {
        if (!cameraPermission?.granted) {
            const result = await requestCameraPermission();
            if (!result.granted) {
                Alert.alert('Quyền truy cập', 'Cần quyền camera để chụp ảnh đại diện');
                return;
            }
        }
        setShowCamera(true);
    };

    const capturePhoto = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.7,
                });
                if (photo?.base64) {
                    setAvatar(`data:image/jpeg;base64,${photo.base64}`);
                    setShowCamera(false);
                }
            } catch (error) {
                console.error('Error taking photo:', error);
                Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
            }
        }
    };

    const handlePickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.base64) {
                    setAvatar(`data:image/jpeg;base64,${asset.base64}`);
                } else if (asset.uri) {
                    setAvatar(asset.uri);
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
        }
    };

    const handleContinue = () => {
        if (avatar) {
            onComplete({ ...user, avatar });
        } else {
            // Show alert asking to add avatar
            Alert.alert(
                'Thêm ảnh đại diện',
                'Bạn có muốn tiếp tục mà không có ảnh đại diện?',
                [
                    { text: 'Thêm ảnh', style: 'cancel' },
                    { text: 'Bỏ qua', onPress: () => onSkip() },
                ]
            );
        }
    };

    const handleSkip = () => {
        onSkip();
    };

    // Camera Screen
    if (showCamera) {
        return (
            <SafeAreaView style={styles.cameraContainer}>
                <StatusBar barStyle="light-content" />
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing="front"
                >
                    {/* Oval mask overlay */}
                    <View style={styles.cameraOverlay}>
                        <View style={styles.cameraFrame} />
                    </View>

                    {/* Camera Controls */}
                    <View style={styles.cameraControls}>
                        <TouchableOpacity
                            style={styles.cameraCloseBtn}
                            onPress={() => setShowCamera(false)}
                        >
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.captureBtn}
                            onPress={capturePhoto}
                        >
                            <View style={styles.captureBtnOuter}>
                                <View style={styles.captureBtnInner} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cameraFlipBtn}>
                            <Ionicons name="camera-reverse" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </CameraView>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <SafeAreaView style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleSkip}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>

                    <View style={styles.progressDots}>
                        <View style={[styles.dot, step >= 1 && styles.dotActive]} />
                        <View style={[styles.dot, step >= 2 && styles.dotActive]} />
                    </View>

                    <TouchableOpacity style={styles.headerBtn} onPress={handleSkip}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Main Content */}
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateX: slideAnim }],
                    }
                ]}
            >
                {/* Title */}
                <Text style={styles.title}>Thêm ảnh đại diện</Text>

                {/* Subtitle with user name */}
                <Text style={styles.welcomeText}>
                    Xin chào, <Text style={styles.userName}>{user.name}</Text>! 👋
                </Text>

                {/* Avatar */}
                <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={handlePickImage}
                    activeOpacity={0.8}
                >
                    {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                        <LinearGradient
                            colors={['#E4E6EB', '#BCC0C4']}
                            style={styles.avatarPlaceholder}
                        >
                            <Ionicons name="person" size={60} color="#65676B" />
                        </LinearGradient>
                    )}

                    {/* Camera badge */}
                    <View style={styles.cameraBadge}>
                        <Ionicons name="camera" size={20} color="#fff" />
                    </View>
                </TouchableOpacity>

                {/* Description */}
                <Text style={styles.description}>
                    Thêm ảnh để bạn bè dễ nhận ra bạn hơn
                </Text>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handlePickImage}
                    >
                        <Ionicons name="images" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryButtonText}>Chọn từ thư viện</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleTakePhoto}
                    >
                        <Ionicons name="camera" size={20} color={FACEBOOK_BLUE} style={{ marginRight: 8 }} />
                        <Text style={styles.secondaryButtonText}>Chụp ảnh mới</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Bottom Actions */}
            <SafeAreaView style={styles.bottomActions}>
                {avatar ? (
                    <TouchableOpacity
                        style={styles.continueButton}
                        onPress={handleContinue}
                    >
                        <Text style={styles.continueButtonText}>Tiếp tục</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={handleSkip}
                    >
                        <Text style={styles.skipButtonText}>Bỏ qua</Text>
                    </TouchableOpacity>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },

    // Header
    header: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E4E6EB',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: LIGHT_GRAY,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressDots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E4E6EB',
    },
    dotActive: {
        backgroundColor: FACEBOOK_BLUE,
        width: 24,
    },

    // Content
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1C1E21',
        marginBottom: 8,
    },
    welcomeText: {
        fontSize: 16,
        color: GRAY_TEXT,
        marginBottom: 32,
    },
    userName: {
        fontWeight: '600',
        color: '#1C1E21',
    },

    // Avatar
    avatarContainer: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginBottom: 24,
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 75,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 75,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: FACEBOOK_BLUE,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },

    description: {
        fontSize: 15,
        color: GRAY_TEXT,
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 40,
    },

    // Action Buttons
    actionButtons: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: FACEBOOK_BLUE,
        paddingVertical: 14,
        borderRadius: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E7F3FF',
        paddingVertical: 14,
        borderRadius: 8,
    },
    secondaryButtonText: {
        color: FACEBOOK_BLUE,
        fontSize: 16,
        fontWeight: '600',
    },

    // Bottom Actions
    bottomActions: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: FACEBOOK_BLUE,
        paddingVertical: 14,
        borderRadius: 8,
        gap: 8,
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 14,
    },
    skipButtonText: {
        color: GRAY_TEXT,
        fontSize: 16,
        fontWeight: '500',
    },

    // Camera
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraFrame: {
        width: 250,
        height: 250,
        borderRadius: 125,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.5)',
        backgroundColor: 'transparent',
    },
    cameraControls: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 40,
    },
    cameraCloseBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureBtn: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureBtnOuter: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureBtnInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
    },
    cameraFlipBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
