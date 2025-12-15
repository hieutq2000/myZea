// ============ CHANGELOG DATA ============
// Thêm mục mới ở đầu mảng khi có bản cập nhật mới
// Backend sẽ serve dữ liệu này cho mobile app

const CHANGELOG = [
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
        title: "RA MẮT CHỨC NĂNG PLACE & GIAO DIỆN CHAT MỚI",
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
        version: "3.1",
        date: "08/12/2024",
        title: "Tối ưu tính năng AI",
        changes: [
            "💬 Vinalive AI liên tục cập nhật để cải tiến",
            "🔧 Sửa lỗi AI Không hoạt động ổn định",

        ]
    },
    {
        version: "3.0",
        date: "08/12/2024",
        title: "Tối ưu tính năng AI",
        changes: [
            "💬 Vinalive AI liên tục cập nhật để cải tiến",
            "🔧 Sửa lỗi AI Không hoạt động ổn định",
            "✅ Tối ưu hiệu năng AI",
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
