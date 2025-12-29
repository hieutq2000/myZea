import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, message, Avatar, Dropdown } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  VideoCameraOutlined,
  SettingOutlined,
  LogoutOutlined,
  SmileOutlined,
  CustomerServiceOutlined,
  AppleFilled,
  CloudSyncOutlined,
  DownOutlined,
  CloudUploadOutlined,
  SafetyCertificateOutlined,
  NotificationOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Users from './pages/Users';
import ContentPage from './pages/Content';
import Settings from './pages/Settings';
import Stickers from './pages/Stickers';
import FeedbackPage from './pages/Feedback';
import IpaManager from './pages/IpaManager';
import RepoManager from './pages/RepoManager';
import VersionManager from './pages/VersionManager';
import Certificates from './pages/Certificates';
import Dashboard from './pages/Dashboard';
import Notifications from './pages/Notifications';

const { Header, Sider, Content } = Layout;

// Menu wrapper component to handle selected keys
const MenuWrapper: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const location = useLocation();

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path === '/users') return 'users';
    if (path === '/content') return 'content';
    if (path === '/stickers') return 'stickers';
    if (path === '/feedback') return 'feedback';
    if (path === '/ipa-manager') return 'ipa-manager';
    if (path === '/repo-manager') return 'repo-manager';
    if (path === '/version-manager') return 'version-manager';
    if (path === '/certificates') return 'certificates';
    if (path === '/settings') return 'settings';
    return 'dashboard';
  };

  return (
    <Menu
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      style={{
        border: 'none',
        background: 'transparent',
      }}
      items={[
        {
          key: 'overview',
          type: 'group',
          label: !collapsed && <span style={{ color: '#8c8c8c', fontSize: 12, fontWeight: 500 }}>Overview</span>,
          children: [
            {
              key: 'dashboard',
              icon: <DashboardOutlined style={{ fontSize: 18 }} />,
              label: <Link to="/" style={{ fontWeight: 500 }}>Dashboard</Link>,
            },
          ]
        },
        {
          key: 'management',
          type: 'group',
          label: !collapsed && <span style={{ color: '#8c8c8c', fontSize: 12, fontWeight: 500 }}>Management</span>,
          children: [
            {
              key: 'users',
              icon: <UserOutlined style={{ fontSize: 18 }} />,
              label: <Link to="/users" style={{ fontWeight: 500 }}>Người dùng</Link>,
            },
            {
              key: 'content',
              icon: <VideoCameraOutlined style={{ fontSize: 18 }} />,
              label: <Link to="/content" style={{ fontWeight: 500 }}>Nội dung</Link>,
            },
            {
              key: 'stickers',
              icon: <SmileOutlined style={{ fontSize: 18 }} />,
              label: <Link to="/stickers" style={{ fontWeight: 500 }}>Stickers</Link>,
            },
            {
              key: 'feedback',
              icon: <CustomerServiceOutlined style={{ fontSize: 18 }} />,
              label: <Link to="/feedback" style={{ fontWeight: 500 }}>Phản hồi</Link>,
            },
            {
              key: 'notifications',
              icon: <NotificationOutlined style={{ fontSize: 18 }} />,
              label: <Link to="/notifications" style={{ fontWeight: 500 }}>Thông báo</Link>,
            },
          ]
        },
        {
          key: 'ios',
          type: 'group',
          label: !collapsed && <span style={{ color: '#8c8c8c', fontSize: 12, fontWeight: 500 }}>iOS Distribution</span>,
          children: [
            {
              key: 'ipa-manager',
              icon: <AppleFilled style={{ fontSize: 18 }} />,
              label: <Link to="/ipa-manager" style={{ fontWeight: 500 }}>IPA Files</Link>,
            },
            {
              key: 'repo-manager',
              icon: <CloudSyncOutlined style={{ fontSize: 18 }} />,
              label: <Link to="/repo-manager" style={{ fontWeight: 500 }}>AltStore Repo</Link>,
            },
            {
              key: 'version-manager',
              icon: <CloudUploadOutlined style={{ fontSize: 18 }} />,
              label: <Link to="/version-manager" style={{ fontWeight: 500 }}>Version Control</Link>,
            },
            {
              key: 'certificates',
              icon: <SafetyCertificateOutlined style={{ fontSize: 18 }} />,
              label: <Link to="/certificates" style={{ fontWeight: 500 }}>Certificates</Link>,
            },
          ]
        },
        {
          key: 'system',
          type: 'group',
          label: !collapsed && <span style={{ color: '#8c8c8c', fontSize: 12, fontWeight: 500 }}>System</span>,
          children: [
            {
              key: 'settings',
              icon: <SettingOutlined style={{ fontSize: 18 }} />,
              label: <Link to="/settings" style={{ fontWeight: 500 }}>Cài đặt</Link>,
            },
          ]
        },
      ]}
    />
  );
};

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<{ name?: string; email?: string } | null>(null);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');
    if (token) {
      setIsAuthenticated(true);
      if (user) {
        try {
          setAdminUser(JSON.parse(user));
        } catch (e) {
          console.error('Parse user error:', e);
        }
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setIsAuthenticated(false);
    setAdminUser(null);
    message.success('Đã đăng xuất');
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Hồ sơ',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      label: 'Cài đặt',
      icon: <SettingOutlined />,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Router>
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          style={{
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Logo */}
          <div style={{
            padding: '20px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AppleFilled style={{ color: 'white', fontSize: 20 }} />
            </div>
            {!collapsed && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>IPA Deploy</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>iOS App Distribution</div>
              </div>
            )}
          </div>

          {/* Menu */}
          <div style={{ padding: '16px 8px' }}>
            <MenuWrapper collapsed={collapsed} />
          </div>

          {/* User Info - cuộn cùng menu */}
          <div style={{
            padding: 16,
            marginTop: 'auto',
            borderTop: '1px solid #f0f0f0',
          }}>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="topLeft">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                padding: 8,
                borderRadius: 8,
                transition: 'background 0.2s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Avatar
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin"
                  size={36}
                  style={{ background: '#f0f0f0' }}
                />
                {!collapsed && (
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>
                        {adminUser?.name || 'Admin'}
                      </div>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                        {adminUser?.email || 'admin@gmail.com'}
                      </div>
                    </div>
                    <DownOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
                  </>
                )}
              </div>
            </Dropdown>
          </div>
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
          <Header style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: 16, width: 40, height: 40 }}
              />
            </div>
          </Header>

          <Content
            style={{
              margin: 24,
              padding: 24,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/content" element={<ContentPage />} />
              <Route path="/stickers" element={<Stickers />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/ipa-manager" element={<IpaManager />} />
              <Route path="/repo-manager" element={<RepoManager />} />
              <Route path="/version-manager" element={<VersionManager />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;

