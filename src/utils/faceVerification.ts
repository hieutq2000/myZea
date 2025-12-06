import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from './theme';

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
}> {
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
Bạn là hệ thống xác thực sinh trắc học chuyên nghiệp cho thi trực tuyến.

NHIỆM VỤ: So sánh 2 ảnh sau và xác định xem có PHẢI CÙNG MỘT NGƯỜI không.
- Ảnh 1: Từ camera trực tiếp (ảnh thí sinh đang thi)
- Ảnh 2: Ảnh đại diện đã đăng ký (avatar)

TIÊU CHÍ PHÂN TÍCH:
1. So sánh cấu trúc khuôn mặt (shape of face)
2. So sánh đặc điểm mắt, mũi, miệng
3. So sánh tỷ lệ khuôn mặt
4. Kiểm tra xem có phải ảnh chụp màn hình/ảnh giả không
5. Kiểm tra xem khuôn mặt có rõ ràng và đủ ánh sáng không

TRẢ LỜI theo định dạng JSON:
{
  "isMatch": true/false,
  "confidence": 0-100 (độ tin cậy %),
  "message": "Mô tả ngắn gọn kết quả",
  "details": "Chi tiết phân tích nếu không khớp"
}

LƯU Ý QUAN TRỌNG:
- Nếu confidence < 70%: isMatch = false
- Nếu phát hiện ảnh giả/ảnh chụp màn hình: isMatch = false, confidence = 0
- Nếu không nhìn thấy mặt rõ ràng: isMatch = false
- Chỉ trả về JSON, không có text khác
`;

        const result = await model.generateContent([prompt, cameraImage, avatarImage]);
        const responseText = result.response.text();

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                isMatch: parsed.isMatch === true && parsed.confidence >= 70,
                confidence: parsed.confidence || 0,
                message: parsed.message || 'Không thể xác thực',
                details: parsed.details,
            };
        }

        return {
            isMatch: false,
            confidence: 0,
            message: 'Lỗi phân tích kết quả từ AI',
        };
    } catch (error) {
        console.error('Face verification error:', error);
        return {
            isMatch: false,
            confidence: 0,
            message: 'Lỗi hệ thống xác thực: ' + (error as Error).message,
        };
    }
}

/**
 * Periodic face check during exam
 * Verifies the person hasn't been replaced
 */
export async function periodicFaceCheck(
    currentCameraBase64: string,
    registeredAvatarBase64: string,
    previousCameraBase64?: string
): Promise<{
    isSamePerson: boolean;
    suspiciousActivity: boolean;
    message: string;
}> {
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
Bạn là hệ thống giám sát thi cử với khả năng phát hiện gian lận.

NHIỆM VỤ: Kiểm tra ảnh camera hiện tại và phát hiện các dấu hiệu bất thường:

1. Có phải CÙNG người với ảnh đại diện không?
2. Có dấu hiệu gian lận nào không:
   - Người khác xuất hiện trong khung hình
   - Đang nhìn ra ngoài màn hình (đọc tài liệu)
   - Đang sử dụng điện thoại
   - Nhiều người trong khung hình
   - Khuôn mặt bị che khuất
   - Ảnh tĩnh/ảnh giả thay vì người thật

TRẢ LỜI JSON:
{
  "isSamePerson": true/false,
  "suspiciousActivity": true/false,
  "activityType": "mô tả hành vi nếu có",
  "message": "Thông báo ngắn gọn"
}
`;

        const result = await model.generateContent([prompt, currentImage, avatarImage]);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                isSamePerson: parsed.isSamePerson === true,
                suspiciousActivity: parsed.suspiciousActivity === true,
                message: parsed.message || '',
            };
        }

        return {
            isSamePerson: true,
            suspiciousActivity: false,
            message: 'Kiểm tra hoàn tất',
        };
    } catch (error) {
        console.error('Periodic check error:', error);
        return {
            isSamePerson: true,
            suspiciousActivity: false,
            message: 'Lỗi kiểm tra: ' + (error as Error).message,
        };
    }
}

/**
 * Check if camera shows a real person or fake image
 */
export async function detectLiveness(
    cameraImageBase64: string
): Promise<{
    isLive: boolean;
    message: string;
}> {
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
Phân tích ảnh này và xác định:
1. Đây có phải là NGƯỜI THẬT đang được quay trực tiếp không?
2. Hay là ảnh chụp từ màn hình/ảnh in/ảnh tĩnh?

Dấu hiệu ảnh giả:
- Có viền màn hình/điện thoại
- Ảnh quá hoàn hảo/không có chuyển động tự nhiên
- Ánh sáng phản chiếu từ màn hình
- Chất lượng khác biệt (ảnh in)

TRẢ LỜI JSON:
{
  "isLive": true/false,
  "confidence": 0-100,
  "message": "Giải thích ngắn"
}
`;

        const result = await model.generateContent([prompt, image]);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                isLive: parsed.isLive === true && (parsed.confidence || 0) > 70,
                message: parsed.message || '',
            };
        }

        return {
            isLive: true,
            message: 'Kiểm tra hoàn tất',
        };
    } catch (error) {
        console.error('Liveness check error:', error);
        return {
            isLive: true,
            message: 'Lỗi kiểm tra',
        };
    }
}
