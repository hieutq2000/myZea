import { useState, useEffect, useRef, type FormEvent, type FC } from 'react';
import { FaPaperPlane, FaPhoneAlt, FaVideo, FaEllipsisH, FaSmile, FaPaperclip, FaImage, FaMicrophone } from 'react-icons/fa';
import { BsPlusCircle } from 'react-icons/bs';

interface Message {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
}

interface User {
    id: string;
    name: string;
    avatar: string;
}

interface ChatWindowProps {
    partner: User | null;
    messages: Message[];
    currentUserId: string;
    currentUser: User;
    onSendMessage: (text: string) => void;
}

// Helper to fix avatar URL
const getFullImageUrl = (url?: string) => {
    if (!url) return "https://ui-avatars.com/api/?name=User&background=random";
    if (url.startsWith('http')) return url;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `https://api.data5g.site${cleanPath}`;
}

const ChatWindow: FC<ChatWindowProps> = ({ partner, messages, currentUserId, currentUser, onSendMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, partner]);

    const handleSend = (e: FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage);
            setNewMessage('');
        }
    };

    const myAvatar = getFullImageUrl(currentUser?.avatar);
    const myName = currentUser?.name || "Bạn";

    // --- Empty State ---
    if (!partner) {
        return (
            <div className="chat-window">
                <div className="welcome-screen">
                    <img src={myAvatar} alt="My Avatar" className="welcome-avatar" />
                    <h1>Chào mừng! {myName}</h1>
                    <p>myZyea Chat, cùng tạo nhịp thành công 😎 💼 🚀 🥳</p>

                    <div className="suggestion-cards">
                        <div className="s-card">
                            <div className="s-img">💬</div>
                            <h3>Trò chuyện dễ dàng</h3>
                            <p>Tìm kiếm và bắt đầu trò chuyện ngay cùng đồng nghiệp</p>
                        </div>
                        <div className="s-card">
                            <div className="s-img">👥</div>
                            <h3>Làm việc nhóm hiệu quả</h3>
                            <p>Bắt đầu cuộc trò chuyện với nhiều thành viên bằng cách tạo nhóm</p>
                            <button className="btn-create">Tạo ngay</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const partnerName = partner?.name || "Người dùng";
    const partnerAvatar = getFullImageUrl(partner?.avatar);

    return (
        <div className="chat-window">
            <div className="chat-header">
                <div className="header-left">
                    <img
                        src={partnerAvatar}
                        style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 8, objectFit: 'cover' }}
                        alt="Partner"
                    />
                    <div>
                        <span className="header-name" style={{ display: 'block', lineHeight: 1 }}>{partnerName}</span>
                        <span className="header-status" style={{ fontSize: 11, color: '#4caf50' }}>
                            <i className="fas fa-circle" style={{ fontSize: 8, marginRight: 4 }}></i>
                            Online
                        </span>
                    </div>
                </div>
                <div className="header-right">
                    <FaPhoneAlt className="header-icon" />
                    <FaVideo className="header-icon" />
                    <FaEllipsisH className="header-icon" />
                </div>
            </div>

            <div className="messages-container">
                {Array.isArray(messages) && messages.map((msg, index) => {
                    const isOwn = msg.senderId === currentUserId;
                    let timeStr = "";
                    try {
                        const date = new Date(msg.createdAt || Date.now());
                        timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } catch (e) { timeStr = ""; }

                    return (
                        <div key={index} className={`message-row ${isOwn ? 'own' : 'other'}`}>
                            <div className="message-bubble">
                                {msg.content}
                            </div>
                            {timeStr && (
                                <span className="msg-time">
                                    {isOwn && <span className="checkmark">✓✓</span>}
                                    {timeStr}
                                </span>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <form onSubmit={handleSend} className="input-wrapper">
                    <button type="button" className="tool-btn"><BsPlusCircle /></button>
                    <button type="button" className="tool-btn"><FaImage /></button>
                    <button type="button" className="tool-btn"><FaPaperclip /></button>

                    <input
                        type="text"
                        className="main-input"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Nhập tin nhắn..."
                    />

                    <button type="button" className="tool-btn"><FaSmile /></button>
                    {newMessage.trim() === '' ? (
                        <button type="button" className="tool-btn"><FaMicrophone /></button>
                    ) : (
                        <button type="submit" className="tool-btn" style={{ color: '#0068ff' }}><FaPaperPlane /></button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
