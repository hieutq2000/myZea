import type { FC } from 'react';
import { FaSearch } from 'react-icons/fa';
import { BsPencilSquare } from 'react-icons/bs';

interface User {
    id: string;
    name: string;
    avatar: string;
}

interface Conversation {
    id?: string;
    conversation_id?: string;
    partner?: User;
    partner_id?: string;
    name?: string;
    avatar?: string;
    lastMessage?: string;
    last_message?: string;
    updatedAt?: string;
    updated_at?: string;
}

interface ChatSidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string, partner: User) => void;
    currentUser: User;
}

// Helper to fix avatar URL
const getFullImageUrl = (url?: string) => {
    if (!url) return "https://ui-avatars.com/api/?name=User&background=random";
    if (url.startsWith('http')) return url;
    if (url.startsWith('data:')) return url; // Base64 images
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `https://api.data5g.site${cleanPath}`;
}

const ChatSidebar: FC<ChatSidebarProps> = ({
    conversations,
    activeConversationId,
    onSelectConversation
}) => {
    return (
        <div className="chat-sidebar">
            <div className="sidebar-header">
                <div className="sidebar-title">Chats</div>
                <div className="header-actions">
                    <button><BsPencilSquare /></button>
                </div>
            </div>

            <div className="search-container">
                <div className="search-input-wrapper">
                    <FaSearch className="search-icon-inside" />
                    <input type="text" placeholder="Tìm kiếm" />
                </div>
            </div>

            <div className="filter-tabs">
                <button className="filter-tab active">Tất cả</button>
                <button className="filter-tab">Chưa đọc</button>
                <button className="filter-tab">Tắt thông báo</button>
            </div>

            <div className="conversation-list">
                {Array.isArray(conversations) && conversations.map((conv, index) => {
                    console.log(`🔍 Conversation ${index}:`, conv);

                    // Extract data from either format
                    const convId = conv.id || conv.conversation_id;
                    const partnerId = conv.partner?.id || conv.partner_id;
                    const partnerName = conv.partner?.name || conv.name || "Unknown User";
                    const partnerAvatar = conv.partner?.avatar || conv.avatar;
                    const lastMsg = conv.lastMessage || conv.last_message || '...';
                    const time = conv.updatedAt || conv.updated_at || '';

                    if (!convId || !partnerName) {
                        console.warn(`⚠️ Skip ${index} - missing data`);
                        return null;
                    }

                    const avatarUrl = getFullImageUrl(partnerAvatar);
                    console.log(`✅ Render: ${partnerName}`);

                    return (
                        <div
                            key={convId}
                            className={`conversation-item ${activeConversationId === convId ? 'active' : ''}`}
                            onClick={() => onSelectConversation(convId, {
                                id: partnerId || convId,
                                name: partnerName,
                                avatar: partnerAvatar || ''
                            })}
                        >
                            <div className="avatar-wrapper">
                                <img src={avatarUrl} alt="Avatar" className="partner-avatar" />
                                <div className="status-dot"></div>
                            </div>

                            <div className="conv-info">
                                <div className="conv-top">
                                    <span className="conv-name">{partnerName}</span>
                                    <span className="conv-time">{time}</span>
                                </div>
                                <div className="conv-msg-preview">
                                    {lastMsg}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ChatSidebar;
