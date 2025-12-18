import { useState, useEffect, type FC } from 'react';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import { initSocket, getSocket, disconnectSocket } from '../services/socket';
import api from '../services/api';
import { FaCog } from 'react-icons/fa';
import { BsChatTextFill, BsPeopleFill, BsCheckSquareFill } from 'react-icons/bs';
import { AiFillCloud } from "react-icons/ai";
import { MdCircle, MdBookmark, MdPalette, MdLanguage, MdSettings, MdLogout } from 'react-icons/md';

import '../styles/Chat.css';

const Chat: FC = () => {
    const [user, setUser] = useState<any>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [activePartner, setActivePartner] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState('chat');
    const [showUserMenu, setShowUserMenu] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (storedUser && token) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            initSocket(token);

            const socket = getSocket();

            // Listen for incoming messages from others
            socket.on('receiveMessage', (message: any) => {
                console.log('📩 Received message:', message);

                // If message belongs to active chat, add it
                if (activePartner && (message.senderId === activePartner.id || message.receiverId === activePartner.id)) {
                    setMessages(prev => [...prev, {
                        id: message._id || message.id,
                        senderId: message.user?._id || message.senderId,
                        content: message.text || message.content,
                        createdAt: message.createdAt
                    }]);
                }

                // Reload conversations to update last message
                loadConversations();
            });

            socket.on('messageSent', (message: any) => {
                console.log('✅ Message sent confirmed:', message);
                loadConversations();
            });

            loadConversations();
        }

        return () => {
            disconnectSocket();
        };
    }, [activePartner]);

    const loadConversations = async () => {
        try {
            const res = await api.get('/chat/conversations');
            console.log('📋 Loaded conversations:', res.data);
            setConversations(res.data);
        } catch (error) {
            console.error("❌ Failed to load conversations", error);
        }
    };

    const loadMessages = async (partnerId: string) => {
        try {
            const res = await api.get(`/chat/messages/${partnerId}`);
            console.log('💬 Loaded messages:', res.data);
            setMessages(res.data);
        } catch (error) {
            console.error("❌ Failed to load messages", error);
            setMessages([]);
        }
    };

    const handleSelectConversation = (id: string, partner: any) => {
        setActiveConvId(id);
        setActivePartner(partner);
        loadMessages(partner.id);
    };

    const handleSendMessage = (text: string) => {
        if (!activePartner || !user) return;

        const socket = getSocket();
        const msgData = {
            senderId: user.id,
            receiverId: activePartner.id,
            content: text,
            message: text,
            type: 'text'
        };

        console.log('📤 Sending message:', msgData);
        socket.emit('sendMessage', msgData);

        // Optimistic UI update
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            senderId: user.id,
            content: text,
            createdAt: new Date().toISOString()
        }]);
    };

    const handleLogout = () => {
        if (confirm('Bạn có chắc muốn đăng xuất?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            disconnectSocket();
            window.location.href = '/login';
        }
    };

    const handleSavedMessages = () => {
        alert('Chức năng "Tin nhắn đã lưu" đang được phát triển');
        setShowUserMenu(false);
    };

    const handleTheme = () => {
        alert('Chức năng "Giao diện" đang được phát triển\n(Sáng/Tối)');
        setShowUserMenu(false);
    };

    const handleLanguage = () => {
        alert('Chức năng "Ngôn ngữ" đang được phát triển\n(Tiếng Việt/English)');
        setShowUserMenu(false);
    };

    const handleSettings = () => {
        alert('Chức năng "Cài đặt" đang được phát triển');
        setShowUserMenu(false);
    };

    if (!user) return <div className="loading">Cannot load user...</div>;

    const userAvatar = user.avatar?.startsWith('http')
        ? user.avatar
        : user.avatar
            ? `https://api.data5g.site${user.avatar}`
            : "https://ui-avatars.com/api/?name=User&background=random";

    return (
        <div className="chat-layout">
            {/* 1. Slim Navigation Rail */}
            <div className="main-nav">
                <div className="nav-top">
                    <div className="nav-avatar-wrapper" onClick={() => setShowUserMenu(!showUserMenu)}>
                        <img src={userAvatar} alt="Me" className="nav-avatar" />

                        {/* User Menu Popup */}
                        {showUserMenu && (
                            <div className="user-menu-popup">
                                <div className="user-menu-header">
                                    <img src={userAvatar} alt="Avatar" className="menu-avatar" />
                                    <div className="menu-user-info">
                                        <div className="menu-user-name">{user.name}</div>
                                        <div className="menu-user-email">{user.email}</div>
                                    </div>
                                </div>

                                <div className="user-menu-divider"></div>

                                <div className="user-menu-items">
                                    <div className="user-menu-item" onClick={() => alert('Chức năng đang phát triển')}>
                                        <MdCircle className="menu-icon" style={{ color: '#6b778c' }} />
                                        <span>Đóng trạng thái</span>
                                        <span className="menu-arrow">›</span>
                                    </div>
                                    <div className="user-menu-item active">
                                        <MdCircle className="menu-icon" style={{ color: '#4caf50' }} />
                                        <span>Trạng thái hoạt động</span>
                                        <span className="menu-badge">Đang bật</span>
                                    </div>
                                    <div className="user-menu-item" onClick={handleSavedMessages}>
                                        <MdBookmark className="menu-icon" />
                                        <span>Tin nhắn đã lưu</span>
                                    </div>

                                    <div className="user-menu-divider"></div>

                                    <div className="user-menu-item" onClick={handleTheme}>
                                        <MdPalette className="menu-icon" />
                                        <span>Giao diện</span>
                                        <span className="menu-arrow">›</span>
                                    </div>
                                    <div className="user-menu-item" onClick={handleLanguage}>
                                        <MdLanguage className="menu-icon" />
                                        <span>Ngôn ngữ</span>
                                        <span className="menu-arrow">›</span>
                                    </div>
                                    <div className="user-menu-item" onClick={handleSettings}>
                                        <MdSettings className="menu-icon" />
                                        <span>Cài đặt</span>
                                    </div>

                                    <div className="user-menu-divider"></div>

                                    <div className="user-menu-item danger" onClick={handleLogout}>
                                        <MdLogout className="menu-icon" />
                                        <span>Đăng xuất</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`nav-item ${viewMode === 'chat' ? 'active' : ''}`} onClick={() => setViewMode('chat')}>
                        <BsChatTextFill />
                    </div>
                    <div className={`nav-item ${viewMode === 'contacts' ? 'active' : ''}`} onClick={() => setViewMode('contacts')}>
                        <BsPeopleFill />
                    </div>
                    <div className={`nav-item ${viewMode === 'todo' ? 'active' : ''}`} onClick={() => setViewMode('todo')}>
                        <BsCheckSquareFill />
                    </div>
                </div>
                <div className="nav-bottom">
                    <div className="nav-item">
                        <AiFillCloud />
                    </div>
                    <div className="nav-item">
                        <FaCog />
                    </div>
                </div>
            </div>

            {/* Click overlay to close menu */}
            {showUserMenu && <div className="menu-overlay" onClick={() => setShowUserMenu(false)}></div>}

            {/* 2. Sidebar List */}
            <ChatSidebar
                conversations={conversations}
                activeConversationId={activeConvId}
                onSelectConversation={handleSelectConversation}
                currentUser={user}
            />

            {/* 3. Main Window */}
            <ChatWindow
                partner={activePartner}
                messages={messages}
                currentUserId={user.id}
                currentUser={user}
                onSendMessage={handleSendMessage}
            />
        </div>
    );
};

export default Chat;
