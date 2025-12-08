// ============ CHANGELOG DATA ============
// Thêm mục mới ở đầu mảng khi có bản cập nhật mới
// Backend sẽ serve dữ liệu này cho mobile app

const CHANGELOG = [
    {
        version: "3.0",
        date: "08/12/2024",
        title: "Tối ưu tính năng chats",
        changes: [
            "💬 Tối ưu cải tiến một số chức năng của chats",
            "🔧 Sửa lỗi keyboard animation trên iOS",
            "✅ Sửa lỗi conversation đã xóa không hiện lại",
        ]
    },
    {
        version: "2.9",
        date: "08/12/2024",
        title: "Tối ưu tính năng chats",
        changes: [
            "💬 Tối ưu cải tiến một số chức năng của chats",
            "🔧 Sửa lỗi keyboard animation trên iOS",
            "✅ Sửa lỗi conversation đã xóa không hiện lại",
        ]
    },
    {
        version: "2.8",
        date: "08/12/2024",
        title: "Tính năng Chat như Zalo",
        changes: [
            "💬 Danh sách tin nhắn với Dark Mode",
            "📌 Vuốt để Ghim/Tắt thông báo/Xóa",
            "🟢 Hiển thị trạng thái Online",
            "⌨️ Hiển thị 'Đang nhập...'",
            "🔔 Tabs: Tất cả / Chưa đọc / Tắt thông báo",
        ]
    },
    {
        version: "2.7",
        date: "08/12/2024",
        title: "Tối ưu AI & Trải nghiệm",
        changes: [
            "🤖 Chuyển sang AI Model ổn định (1.5 Flash)",
            "✨ Hiệu ứng nhập liệu (Focus) rõ ràng hơn",
            "📱 Hiển thị version check cho tài khoản",
            "🐛 Sửa lỗi AI không hoạt động ổn định",
        ]
    },
    {
        version: "2.6",
        date: "08/12/2024",
        title: "Cải tiến màn hình chào & Đăng nhập",
        changes: [
            "🎨 Thêm Splash Screen gradient đẹp mắt",
            "🔐 Cải tiến giao diện đăng nhập",
            "👆 Face ID icon mới sát nút đăng nhập",
            "🔗 Thêm link Quên mật khẩu",
            "📱 Hiển thị version ở góc màn hình",
        ]
    },
    {
        version: "2.5",
        date: "08/12/2024",
        title: "Cải tiến giao diện & AI",
        changes: [
            "✨ Chuyển kiểm tra cập nhật vào Hồ sơ",
            "🏆 Đẩy Huy hiệu lên trên, Cài đặt xuống dưới",
            "🔐 Fix lỗi xác thực khuôn mặt",
            "🤖 Cập nhật API key Gemini mới",
        ]
    },
    {
        version: "2.3",
        date: "07/12/2024",
        title: "Đăng nhập Face ID",
        changes: [
            "🔐 Đăng nhập với Face ID/Touch ID",
            "📱 Nút Face ID trên màn hình đăng nhập",
            "🛡️ Xác thực sinh trắc học an toàn",
        ]
    },
    {
        version: "2.0",
        date: "07/12/2024",
        title: "Màn hình xác thực khuôn mặt mới",
        changes: [
            "🔐 Màn hình xác thực khuôn mặt riêng biệt",
            "📷 Khung đặt mặt rõ ràng với animation",
            "✅ Hiển thị % độ khớp khuôn mặt",
            "🔄 Cho phép thử lại nếu thất bại",
        ]
    },
    {
        version: "1.0",
        date: "06/12/2024",
        title: "Phiên bản đầu tiên",
        changes: [
            "🚀 Ra mắt ứng dụng Vinalive AI Mobile",
            "📚 Hỗ trợ luyện tập và thi thử với AI",
            "👶 Chế độ Kids Mode cho trẻ em",
            "🎤 Nhận dạng giọng nói và phản hồi AI",
        ]
    },
];

module.exports = CHANGELOG;
