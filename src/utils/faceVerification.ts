import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from './theme';
import { safeCallApi } from './aiHelper';

// Config cho retry và timeout
const MAX_RETRIES = 2;
const TIMEOUT_MS = 15000;

/**
 * Wrapper để thêm timeout cho promise
 */
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), ms)
    );
    return Promise.race([promise, timeout]);
};

/**
 * Verifies if the face in the camera matches the registered avatar
 * Using Gemini Vision AI for biometric verification
 */
export async function verifyFaceWithAvatar(
    cameraImageBase64: string,
    avatarImageBase64: string
): Promise<{
    isMatch: boolean;
    confidence: number;
    message: string;
    details?: string;
    skipped?: boolean;
}> {
    // Kiểm tra input
    if (!cameraImageBase64 || !avatarImageBase64) {
        console.log('[FaceVerify] Missing images, skipping verification');
        return {
            isMatch: true,
            confidence: 0,
            message: 'Bỏ qua xác thực (thiếu ảnh)',
            skipped: true,
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Prepare images for comparison
        const cameraImage = {
            inlineData: {
                data: cameraImageBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/jpeg',
            },
        };

        const avatarImage = {
            inlineData: {
                data: avatarImageBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/jpeg',
            },
        };

        const prompt = `
Bạn là hệ thống xác thực sinh trắc học. So sánh 2 ảnh và xác định có phải CÙNG NGƯỜI không.

Ảnh 1: Camera trực tiếp (thí sinh)
Ảnh 2: Ảnh đại diện đã đăng ký

PHÂN TÍCH:
1. Cấu trúc khuôn mặt
2. Đặc điểm mắt, mũi, miệng
3. Tỷ lệ khuôn mặt

TRẢ LỜI JSON DUY NHẤT:
{"isMatch": true/false, "confidence": 0-100, "message": "mô tả ngắn"}

Lưu ý: confidence >= 60 là match thành công. Nếu ảnh mờ hoặc khó nhận diện, cho confidence = 70 và isMatch = true.
`;

        const result = await safeCallApi(() =>
            withTimeout(model.generateContent([prompt, cameraImage, avatarImage]), TIMEOUT_MS)
        );

        const responseText = result.response.text();

        console.log('[FaceVerify] AI Response:', responseText.substring(0, 200));

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const confidence = parsed.confidence || 50;

            return {
                isMatch: parsed.isMatch === true || confidence >= 60,
                confidence: confidence,
                message: parsed.message || 'Xác thực hoàn tất',
                details: parsed.details,
            };
        }

        // Nếu không parse được JSON, cho qua với warning
        console.log('[FaceVerify] Could not parse JSON, allowing with warning');
        return {
            isMatch: true,
            confidence: 65,
            message: 'Xác thực hoàn tất (cảnh báo: không rõ ràng)',
        };

    } catch (error) {
        console.error(`[FaceVerify] Error:`, error);

        // Sau khi retry hết hoặc lỗi khác, cho qua nhưng đánh dấu lỗi
        return {
            isMatch: true,
            confidence: 50,
            message: 'Xác thực tạm thời không khả dụng',
            skipped: true,
        };
    }

    // Fallback
    return {
        isMatch: true,
        confidence: 50,
        message: 'Đã bỏ qua xác thực',
        skipped: true,
    };
}

/**
 * Periodic face check during exam
 * More lenient than initial verification
 */
export async function periodicFaceCheck(
    currentCameraBase64: string,
    registeredAvatarBase64: string
): Promise<{
    isSamePerson: boolean;
    suspiciousActivity: boolean;
    message: string;
}> {
    // Nếu thiếu ảnh, bỏ qua check
    if (!currentCameraBase64 || !registeredAvatarBase64) {
        return {
            isSamePerson: true,
            suspiciousActivity: false,
            message: 'Bỏ qua kiểm tra',
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const currentImage = {
            inlineData: {
                data: currentCameraBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/jpeg',
            },
        };

        const avatarImage = {
            inlineData: {
                data: registeredAvatarBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/jpeg',
            },
        };

        const prompt = `
Kiểm tra nhanh: Ảnh camera có cùng người với ảnh đại diện không?
Phát hiện gian lận: nhiều người, nhờ người khác, sử dụng tài liệu?

TRẢ LỜI JSON DUY NHẤT:
{"isSamePerson": true/false, "suspiciousActivity": true/false, "message": "mô tả ngắn"}

Mặc định: nếu không chắc chắn, cho isSamePerson = true.
`;

        const result = await safeCallApi(() =>
            withTimeout(model.generateContent([prompt, currentImage, avatarImage]), 10000)
        );
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                isSamePerson: parsed.isSamePerson !== false,
                suspiciousActivity: parsed.suspiciousActivity === true,
                message: parsed.message || 'Kiểm tra hoàn tất',
            };
        }

        return {
            isSamePerson: true,
            suspiciousActivity: false,
            message: 'Kiểm tra hoàn tất',
        };
    } catch (error) {
        console.error('[PeriodicCheck] Error:', error);
        // Lỗi không nên block thí sinh
        return {
            isSamePerson: true,
            suspiciousActivity: false,
            message: 'Kiểm tra tạm thời không khả dụng',
        };
    }
}

/**
 * Check if camera shows a real person or fake image
 * More lenient - only flag obvious fakes
 */
export async function detectLiveness(
    cameraImageBase64: string
): Promise<{
    isLive: boolean;
    message: string;
}> {
    if (!cameraImageBase64) {
        return { isLive: true, message: 'Bỏ qua kiểm tra' };
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const image = {
            inlineData: {
                data: cameraImageBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/jpeg',
            },
        };

        const prompt = `
Ảnh này có phải người thật hay ảnh giả (ảnh chụp màn hình/ảnh in)?

TRẢ LỜI JSON DUY NHẤT:
{"isLive": true/false, "message": "mô tả ngắn"}

Mặc định: nếu không chắc, cho isLive = true
`;

        const result = await safeCallApi(() =>
            withTimeout(model.generateContent([prompt, image]), 10000)
        );
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                isLive: parsed.isLive !== false,
                message: parsed.message || 'Kiểm tra hoàn tất',
            };
        }

        return { isLive: true, message: 'Kiểm tra hoàn tất' };
    } catch (error) {
        console.error('[Liveness] Error:', error);
        // Lỗi không nên block thí sinh
        return { isLive: true, message: 'Kiểm tra tạm thời không khả dụng' };
    }
}
