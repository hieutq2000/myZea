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
        version: "1.1.7",
        date: "27/12/2025",
        title: "CẬP NHẬT TRẠNG THÁI ĐÃ XEM",
        changes: [
            "👤 Chạm vào tên thành viên để xem Hồ sơ",
            "⚙️ Bấm nút 3 chấm để mở Menu quản lý",
            "📢 Gõ @all để thông báo cho toàn bộ nhóm",
            "🛠️ Tối ưu khu vực chạm cảm ứng",
        ]
    },
    {
        version: "1.0.8",
        date: "21/12/2024",
        title: "CẬP NHẬT GIAO DIỆN & TÍNH NĂNG",
        changes: [
            "📱 Tối ưu Header trên iOS (compact hơn)",
            "� Thêm tính năng Chỉnh sửa tin nhắn (giống Zalo)",
            "⌨️ Ô nhập liệu mở rộng khi văn bản dài (giống Telegram)",
            "✨ Fix lỗi không hiển thị Sticker khi mở Picker",
            "⚡ Tối ưu hiệu năng hiển thị và Safe Area"
        ]
    },
    {
        version: "1.0.7",
        date: "21/12/2024",
        title: "CẬP NHẬT CẦN THIẾT CHO NGƯỜI DÙNG",
        changes: [
            "Cải thiện UI/UX",
            "⚡Cải thiện, tối ưu hiệu năng cho người dùng"
        ]
    },
    {
        version: "1.0.6",
        date: "17/12/2024",
        title: "CẬP NHẬT CẦN THIẾT CHO NGƯỜI DÙNG",
        changes: [
            "Cải thiện phần chats , để người dùng trải nghiệm tốt hơn",
            "Cải thiện UI/UX",
            "⚡ Tối ưu hiệu năng cho người dùng"
        ]
    },
    {
        version: "1.0.5",
        date: "16/12/2024",
        title: "TÍNH NĂNG QUẢN LÝ CHI TIÊU & REACTIONS",
        changes: [
            "💰 Ra mắt tính năng Quản lý chi tiêu cá nhân",
            "📊 Theo dõi thu chi với biểu đồ trực quan",
            "👛 Hỗ trợ tối đa 3 ví tiền khác nhau",
            "🎙️ Sắp có: Nhập thu chi bằng giọng nói AI",
            "😍 Cải tiến Facebook Reactions với animation bay về nút",
            "🔧 Sửa lỗi hiển thị icon reactions (dùng Lottie)",
            "⚡ Tối ưu animation entrance nhanh hơn"
        ]
    },
    {
        version: "1.0.4",
        date: "14/12/2024",
        title: "FIX LỖI HIỂN THỊ HỒ SƠ & UPLOAD",
        changes: [
            "✅ Fix đồng bộ ảnh đại diện và ảnh bìa khi xem profile người khác",
            "🛠️ Sửa lỗi thư viện upload ảnh",
            "🔄 Cập nhật cấu hình Server mới",
            "⚡ Tối ưu hiệu năng load Profile"
        ]
    },

    {
        version: "1.0.2",
        date: "14/12/2024",
        title: "TỐI ƯU GIAO DIỆN CHAT & LIGHT THEME",
        changes: [
            "✨ Giao diện Chat mới: Sáng sủa, hiện đại (Light Theme)",
            "🎨 Header Chat Gradient xanh tươi mới",
            "📱 Tối ưu hiển thị tràn viền (Translucent Status Bar)",
            "🖼️ Hiển thị Avatar thực người dùng",
            "🛠️ Fix lỗi crash và menu tùy chọn tin nhắn",
            "📞 Cải thiện hiển thị tin nhắn cuộc gọi"
        ]
    },
    {
        version: "1.0.1",
        date: "12/12/2024",
        title: "LÀM MỚI GIAO DIỆN ĐĂNG NHẬP",
        changes: [
            "✨ Giao diện Đăng nhập dạng Bottom Sheet hiện đại",
            "🎨 Nền Gradient Cam chủ đạo ",
            "🔄 Slide tự động giới thiệu văn hóa doanh nghiệp",
            "📱 Tối ưu trải nghiệm người dùng myZyea Chat"
        ]
    },
    {
        version: "1.0.0",
        date: "11/12/2024",
        title: "RA MẮT GIAO DIỆN MỚI MYZYEA",
        changes: [
            "🎨 Thiết kế lại màn hình Welcome với gradient xanh tím",
            "🏷️ Logo myZyea mới (my cam + Zyea xanh)",
            "🌓 Hoàn thiện hệ thống Theme (Sáng/Tối/Theo hệ thống)",
            "🖼️ Fix lỗi đốm đen trên màn hình đăng nhập",
            "⚙️ Settings screen hỗ trợ Dark Mode đầy đủ",
            "🔧 Tối ưu ThemeContext với Appearance listener",
        ]
    },
    {
        version: "3.9",
        date: "09/12/2025",
        title: "TỐI ƯU GIAO DIỆN & TÍNH NĂNG PLACE",
        changes: [
            "✨ Giao diện Gradient đồng bộ (Place, Settings, Profile)",
            "🛠️ Fix lỗi đăng bài kèm ảnh trên Place",
            "⚙️ Cập nhật màn hình Cài đặt & Profile mới",
            "🚀 Tối ưu trải nghiệm chìm (Translucent Header)"
        ]
    },
    {
        version: "3.8",
        date: "09/12/2025",
        title: "TỐI ƯU CHỨC NĂNG PLACE",
        changes: [
            "📰 Ra mắt tính năng Place: Mạng xã hội nội bộ",
            "💬 Giao diện Chat mới : Đính kèm file, Sticker tiện lợi",
            "📱 Sửa lỗi hiển thị Splash Screen và tối ưu icon",
            "📞 Khắc phục lỗi xác thực cuộc gọi và tối ưu kết nối",
        ]
    },
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
