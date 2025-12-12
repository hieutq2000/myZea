# Kế hoạch tích hợp chức năng Nhắn tin từ Profile

Để kích hoạt nút nhắn tin trên Profile người dùng khác, chúng ta cần thực hiện các bước sau:

## 1. Cập nhật Type Navigation
File: `src/navigation/types.ts`
- Cần thay đổi tham số `conversationId` trong `ChatDetail` thành tùy chọn (optional).
- Lý do: Khi bắt đầu chat từ Profile, chúng ta chưa biết ID cuộc trò chuyện.

```typescript
ChatDetail: {
    conversationId?: string; // Thêm dấu ?
    partnerId: string;
    userName?: string;
    avatar?: string;
};
```

## 2. Cập nhật PlaceScreen.tsx
- Sử dụng `navigation` để chuyển hướng khi nhấn `onMessage`.

```typescript
onMessage={() => {
    // Ẩn modal profile (nếu cần)
    setShowProfileScreen(false);
    
    // Điều hướng
    navigation.navigate('ChatDetail', {
        partnerId: viewingProfileUser.id,
        userName: viewingProfileUser.name,
        avatar: viewingProfileUser.avatar,
        // conversationId sẽ được xử lý tự động bởi backend hoặc logic check trong ChatScreen
    });
}}
```

## 3. Cập nhật ChatLogic (Nếu cần)
- Đảm bảo `ChatDetailScreen` tự động kiểm tra cuộc trò chuyện tồn tại dựa trên `partnerId` nếu `conversationId` không được truyền vào.

Hiện tại chưa có thay đổi nào được áp dụng vào code chính theo yêu cầu của bạn.
