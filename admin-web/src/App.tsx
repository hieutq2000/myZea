import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, message } from 'antd';
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
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import Users from './pages/Users';
import ContentPage from './pages/Content';
import Settings from './pages/Settings';
import Stickers from './pages/Stickers';
import FeedbackPage from './pages/Feedback';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setIsAuthenticated(false);
    message.success('Đã đăng xuất');
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider trigger={null} collapsible collapsed={collapsed}>
          <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
            {!collapsed && 'VINALIVE ADMIN'}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={['1']}
            items={[
              {
                key: '1',
                icon: <DashboardOutlined />,
                label: <Link to="/">Tổng quan</Link>,
              },
              {
                key: '2',
                icon: <UserOutlined />,
                label: <Link to="/users">Người dùng</Link>,
              },
              {
                key: '3',
                icon: <VideoCameraOutlined />,
                label: <Link to="/content">Nội dung</Link>,
              },
              {
                key: 'sticker',
                icon: <SmileOutlined />,
                label: <Link to="/stickers">Stickers</Link>,
              },
              {
                key: 'feedback',
                icon: <CustomerServiceOutlined />,
                label: <Link to="/feedback">Phản hồi</Link>,
              },
              {
                key: '4',
                icon: <SettingOutlined />,
                label: <Link to="/settings">Cài đặt</Link>,
              },
              {
                key: '5',
                icon: <LogoutOutlined />,
                label: 'Đăng xuất',
                onClick: handleLogout,
                danger: true,
              },
            ]}
          />
        </Sider>
        <Layout>
          <Header style={{ padding: 0, background: colorBgContainer }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />
            <span style={{ fontSize: 18, fontWeight: 'bold' }}>Cổng quản trị Vinalive AI</span>
          </Header>
          <Content
            style={{
              margin: '24px 16px',
              padding: 24,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Routes>
              <Route path="/" element={
                <div>
                  <h2>Chào mừng trở lại! 👋</h2>
                  <p>Chọn một mục từ menu bên trái để bắt đầu quản lý.</p>
                </div>
              } />
              <Route path="/users" element={<Users />} />
              <Route path="/content" element={<ContentPage />} />
              <Route path="/stickers" element={<Stickers />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;
