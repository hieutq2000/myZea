// Changelog - Thông tin các bản cập nhật
// Thêm mục mới ở đầu mảng khi có bản cập nhật mới

export interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
    {
        version: "3.7",
        date: "09/12/2025",
        title: "CẬP NHẬT TỐI ƯU HIỆU NĂNG UI/UX",
        changes: [
            "Cải tiến hiệu năng và ổn định hệ thống",
            "Cải thiện UI/UX và nâng cao chất lượng trải nghiệm"
        ]
    },
    {
        version: "3.4",
        date: "09/12/2025",
        title: "TỐI ƯU HIỆU NĂNG",
        changes: [
            "⚡ Cải tiến hiệu năng và ổn định hệ thống",
            "✨ Cải tiến chức năng Chats giúp gửi/nhận tin nhắn mượt hơn",
            "🔔 Thêm chức năng hiển thị thông báo khi có tin nhắn mới",
            "📞 Thêm chức năng gọi Video / Call trực tiếp trong ứng dụng",
            "🎨 Cải thiện UI/UX tổng thể"
        ]
    },
    {
        version: "3.3",
        date: "09/12/2025",
        title: "TỐI ƯU HIỆU NĂNG ",
        changes: [
            "⚡ Cải tiến một số chức năng giao diện",
            " Cải thiện Tính năng chats",
            " Thêm chức năng hiển thị thông báo khi có tin nhắn mới",
            " Cải thiện UI/UX",

        ]
    },
    {
        version: "3.2",
        date: "08/12/2025",
        title: "TỐI ƯU HIỆU NĂNG GIAO DIỆN",
        changes: [
            "⚡ Cải tiến một số chức năng giao diện",
            "🧠 Cải thiện UI/UX",

        ]
    },
    {
        version: "3.1",
        date: "08/12/2024",
        title: "Tối ưu tính năng chats",
        changes: [
            "💬 Tối ưu cải tiến một số chức năng của chats",
            "🔧 Sửa lỗi keyboard animation trên iOS",
            "✅ Sửa lỗi conversation đã xóa không hiện lại",
            "✅ Tối uư UI/UX",
        ]
    },
    {
        version: "2.9",
        date: "08/12/2024",
        title: "Tối ưu tính năng chats",
        changes: [
            "💬 Tối ưu cải tiến một số chức năng của chats",

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
            "🔍 Tìm kiếm cuộc trò chuyện",
            "⏰ Format thời gian theo kiểu Zalo",
            "📝 Hiển thị 'Bạn:' cho tin nhắn của mình",
        ]
    },
    {
        version: "2.7",
        date: "08/12/2024",
        title: "Cập nhật chức năng chats - Tối ưu trải nghiệm",
        changes: [
            "💬 Danh sách tin nhắn với Dark Mode",
            "📌 Vuốt để Ghim/Tắt thông báo/Xóa",
            "🟢 Hiển thị trạng thái Online",
            "⌨️ Hiển thị 'Đang nhập...'",
            "🔔 Tabs: Tất cả / Chưa đọc / Tắt thông báo",
            "🔍 Tìm kiếm cuộc trò chuyện",
            "⏰ Format thời gian theo kiểu Zalo",
            "📝 Hiển thị 'Bạn:' cho tin nhắn của mình",
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
        version: "2.2",
        date: "07/12/2024",
        title: "Cải tiến trang Hồ sơ",
        changes: [
            "🗑️ Bỏ phần chọn giọng AI",
            "👤 Tên hiển thị chỉ xem (không sửa)",
            "🔐 Thêm toggle Đăng nhập Face ID",
            "🚪 Thêm nút Đăng xuất",
            "📷 Fix lỗi chọn ảnh từ thư viện",
        ]
    },
    {
        version: "2.1",
        date: "07/12/2024",
        title: "Màn hình xác thực khuôn mặt mới",
        changes: [
            "🔐 Màn hình xác thực khuôn mặt riêng biệt",
            "📷 Khung đặt mặt rõ ràng với animation",
            "✅ Hiển thị % độ khớp khuôn mặt",
            "🔄 Cải thiện UI/UX cho người dùng",
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
        version: "1.9",
        date: "07/12/2024",
        title: "Thêm thanh Tab điều hướng",
        changes: [
            "📱 Thêm Bottom Tab Bar hiện đại",
            "📊 Thêm màn hình Lịch sử bài thi",
            "🏠 Điều hướng dễ dàng giữa các trang",
        ]
    },
    {
        version: "1.8",
        date: "07/12/2024",
        title: "Cải tiến màn hình Đăng nhập",
        changes: [
            "👁️ Thêm nút xem/ẩn mật khẩu",
            "✅ Thêm tùy chọn 'Ghi nhớ mật khẩu'",
            "🗑️ Bỏ thông báo kết nối server",
        ]
    },
    {
        version: "1.7",
        date: "07/12/2024",
        title: "Thêm Changelog vào popup cập nhật",
        changes: [
            "📋 Hiển thị danh sách thay đổi trong popup",
            "🏷️ Badge phiên bản mới",
            "📜 Cuộn xem chi tiết nếu có nhiều thay đổi",
        ]
    },
    {
        version: "1.6",
        date: "07/12/2024",
        title: "Cải tiến trải nghiệm người dùng",
        changes: [
            "🎨 Thêm popup cập nhật tự động đẹp mắt",
            "🇻🇳 Việt hóa hoàn toàn ứng dụng",
            "🔔 Tự động kiểm tra cập nhật khi mở app",
        ]
    },
    {
        version: "1.5",
        date: "07/12/2024",
        title: "Hoàn thiện OTA Update",
        changes: [
            "✅ Kết nối thành công với EAS Update",
            "🔧 Sửa lỗi channel-name header",
            "📱 Thêm nút kiểm tra cập nhật thủ công",
        ]
    },
    {
        version: "1.0",
        date: "06/12/2024",
        title: "Phiên bản đầu tiên",
        changes: [
            "🚀 Ra mắt ứng dụng Zyea Mobile",
            "📚 Hỗ trợ luyện tập và thi thử với AI",
            "👶 Chế độ Kids Mode cho trẻ em",
            "🎤 Nhận dạng giọng nói và phản hồi AI",
        ]
    },
];

// Lấy changelog của phiên bản mới nhất
export const getLatestChangelog = (): ChangelogEntry | null => {
    return CHANGELOG.length > 0 ? CHANGELOG[0] : null;
};
