# Vinalive AI Mobile

Ứng dụng gia sư AI thông minh - Phiên bản React Native cho Expo Go.

## 🚀 Cài đặt và Chạy

### Yêu cầu
- Node.js >= 18
- Expo Go app trên điện thoại (Android/iOS)

### Các bước chạy

1. **Cài đặt dependencies:**
```bash
cd vinalive-ai-mobile
npm install
```

2. **Cấu hình API Key:**
Mở file `src/utils/theme.ts` và thay thế `YOUR_GEMINI_API_KEY_HERE` bằng API key thật:
```typescript
export const GEMINI_API_KEY = 'your-actual-api-key';
```

3. **Chạy ứng dụng:**
```bash
npx expo start
```

4. **Mở trên điện thoại:**
- Mở app Expo Go
- Quét mã QR hiển thị trên terminal

## 📱 Tính năng

- ✅ Đăng nhập/Đăng ký
- ✅ Chọn chế độ học (Luyện tập / Thi thử / Kids)
- ✅ Chọn môn học/chủ đề
- ✅ Camera xác thực khuôn mặt
- ✅ Ghi âm câu trả lời
- ✅ AI phản hồi bằng văn bản + giọng nói (TTS)
- ✅ Hồ sơ người dùng với avatar, XP, badges
- ✅ Lưu trữ offline với AsyncStorage

## ⚠️ Lưu ý về Expo Go

Một số tính năng có hạn chế khi chạy trên Expo Go:
- Audio recording có thể không hoạt động đầy đủ
- Cần build development client để có đầy đủ tính năng

## 🔧 Cấu trúc thư mục

```
src/
├── components/     # UI components tái sử dụng
├── screens/        # Màn hình chính
│   ├── AuthScreen.tsx
│   ├── HomeScreen.tsx
│   ├── ProfileScreen.tsx
│   └── LiveSessionScreen.tsx
├── hooks/          # Custom hooks
├── types/          # TypeScript types
└── utils/          # Utilities & theme
```

## 📝 Khác biệt so với phiên bản Web

| Tính năng | Web | Mobile |
|-----------|-----|--------|
| Gemini Live API | ✅ Real-time | ⚠️ REST API |
| Audio streaming | ✅ WebRTC | ⚠️ Expo AV |
| TTS | ✅ Gemini | ✅ Expo Speech |
| Camera | ✅ getUserMedia | ✅ Expo Camera |
