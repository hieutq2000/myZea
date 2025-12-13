module.exports = {
    expo: {
        name: "myZyea",
        slug: "vinalive-ai-mobile",
        scheme: "zyea", // URL scheme for deep linking
        version: "1.0.3",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        newArchEnabled: true,
        splash: {
            image: "./assets/splash.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: "com.zyea.mobile",
            infoPlist: {
                NSCameraUsageDescription: "Ứng dụng cần quyền camera để xác thực danh tính và giám sát trong quá trình thi.",
                NSMicrophoneUsageDescription: "Ứng dụng cần quyền microphone để ghi âm câu trả lời của bạn.",
                NSPhotoLibraryUsageDescription: "Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh đại diện.",
                NSPhotoLibraryAddUsageDescription: "Ứng dụng cần quyền lưu ảnh vào thư viện của bạn."
            }
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#f97316"
            },
            package: "com.zyea.mobile",
            permissions: [
                "android.permission.CAMERA",
                "android.permission.RECORD_AUDIO",
                "android.permission.READ_EXTERNAL_STORAGE",
                "android.permission.WRITE_EXTERNAL_STORAGE",
                "android.permission.MODIFY_AUDIO_SETTINGS",
                "android.permission.POST_NOTIFICATIONS"
            ]
        },
        web: {
            favicon: "./assets/favicon.png"
        },
        plugins: [
            "expo-dev-client",
            "expo-notifications",
            [
                "expo-camera",
                {
                    cameraPermission: "Cho phép $(PRODUCT_NAME) sử dụng camera để xác thực và giám sát."
                }
            ],
            [
                "expo-av",
                {
                    microphonePermission: "Cho phép $(PRODUCT_NAME) ghi âm câu trả lời của bạn."
                }
            ],
            [
                "expo-image-picker",
                {
                    photosPermission: "Cho phép $(PRODUCT_NAME) truy cập thư viện ảnh để chọn ảnh đại diện."
                }
            ],
            [
                "@react-native-voice/voice",
                {
                    microphonePermission: "Cho phép $(PRODUCT_NAME) nhận dạng giọng nói của bạn.",
                    speechRecognitionPermission: "Cho phép $(PRODUCT_NAME) nhận dạng giọng nói của bạn."
                }
            ]
        ],
        updates: {
            url: "https://u.expo.dev/7244ecfc-4a54-4232-a0a3-e17d5039b55c",
            checkAutomatically: "NEVER",  // Don't auto-download, only update when user clicks button (Updated for v3.4 build)
            fallbackToCacheTimeout: 0,
            requestHeaders: {
                "expo-channel-name": "production"
            }
        },
        runtimeVersion: {
            policy: "appVersion"
        },
        extra: {
            eas: {
                projectId: "7244ecfc-4a54-4232-a0a3-e17d5039b55c"
            },
            geminiApiKey: process.env.GEMINI_API_KEY || ""
        }
    }
};
