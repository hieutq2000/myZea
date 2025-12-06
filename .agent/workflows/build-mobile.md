---
description: Hướng dẫn chạy và build app Vinalive AI Mobile
---

# Workflow: Vinalive AI Mobile

## 1. Cài đặt dependencies
```bash
cd c:\xampp\htdocs\vinalive-ai-mobile
npm install
```

## 2. Cấu hình API Key
Mở file `src/utils/theme.ts` và thay thế:
```typescript
export const GEMINI_API_KEY = 'YOUR_ACTUAL_API_KEY';
```

## 3. Chạy development
```bash
npx expo start
```
- Mở Expo Go trên điện thoại
- Quét QR code

## 4. Build cho iOS (IPA)

### Cài EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Cấu hình EAS
```bash
eas build:configure
```

### Build IPA (development)
```bash
eas build --platform ios --profile development
```

### Build IPA (production - App Store)
```bash
eas build --platform ios --profile production
```

## 5. Build cho Android (APK)

### Build APK (development)
```bash
eas build --platform android --profile development
```

### Build APK (production)
```bash
eas build --platform android --profile production
```

## 6. Commit và Push lên GitHub

// turbo
```bash
git add .
git commit -m "Update: React Native mobile app"
git push origin main
```

## 7. Cấu trúc thư mục
```
vinalive-ai-mobile/
├── App.tsx                 # Main app
├── app.json               # Expo config
├── src/
│   ├── screens/           # Màn hình
│   │   ├── AuthScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── LiveSessionScreen.tsx
│   ├── types/             # TypeScript types
│   └── utils/             # Theme, constants
└── package.json
```

## 8. Các lệnh hữu ích

| Lệnh | Mô tả |
|------|-------|
| `npx expo start` | Chạy development |
| `npx expo start --tunnel` | Chạy qua tunnel (cho thiết bị khác mạng) |
| `eas build -p ios` | Build iOS |
| `eas build -p android` | Build Android |
| `eas submit -p ios` | Submit lên App Store |
| `eas submit -p android` | Submit lên Google Play |
