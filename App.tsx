import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text } from 'react-native';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import LiveSessionScreen from './src/screens/LiveSessionScreen';
import SplashScreen from './src/screens/SplashScreen';
import UpdateModal from './src/components/UpdateModal';
import BottomTabBar, { TabType } from './src/components/BottomTabBar';
import {
  User, ExamResult, LiveMode, Topic, TargetAudience,
  BADGES, LEVEL_THRESHOLDS
} from './src/types';
import { getCurrentUser, logout as apiLogout, updateProfile, saveExamResult } from './src/utils/api';
import { getLatestChangelog } from './src/utils/changelog';
import { COLORS } from './src/utils/theme';
import { useAppUpdates } from './src/hooks/useAppUpdates';

type ViewType = 'AUTH' | 'HOME' | 'HISTORY' | 'PROFILE' | 'SESSION';

interface SessionConfig {
  mode: LiveMode;
  topic: Topic;
  audience: TargetAudience;
}

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './src/navigation/types';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import NewChatScreen from './src/screens/NewChatScreen';
import { initSocket, disconnectSocket, getSocket } from './src/utils/socket';
import { registerForPushNotificationsAsync, schedulePushNotification } from './src/utils/notifications';

const Stack = createStackNavigator<RootStackParamList>();

function AppContent() {
  const { isUpdateAvailable, isDownloading, downloadAndApply, dismissUpdate } = useAppUpdates();

  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewType>('AUTH');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Setup Notifications
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  // Socket management
  useEffect(() => {
    let socketListener: any = null;

    if (user?.id) {
      initSocket(user.id);
      const socket = getSocket();

      if (socket) {
        socketListener = async (message: any) => {
          // Trigger notification if message is from someone else
          if (message.user && message.user._id !== user.id) {
            await schedulePushNotification(
              message.user.name || 'Tin nhắn mới',
              message.text || 'Đã gửi một hình ảnh',
              { conversationId: message.conversationId, partnerId: message.user._id }
            );
          }
        };

        socket.on('receiveMessage', socketListener);
      }
    } else {
      disconnectSocket();
    }

    return () => {
      const socket = getSocket();
      if (socket && socketListener) {
        socket.off('receiveMessage', socketListener);
      }
    };
  }, [user?.id]);

  // Check for existing session on app start
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const apiUser = await getCurrentUser();
      if (apiUser) {
        setUser(apiUser);
        setView(apiUser.avatar ? 'HOME' : 'PROFILE');
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (loggedInUser: User) => {
    const fullUser: User = {
      ...loggedInUser,
      history: loggedInUser.history || [],
      xp: loggedInUser.xp || 0,
      level: loggedInUser.level || 1,
      badges: loggedInUser.badges || [],
      createdExams: loggedInUser.createdExams || [],
    };

    setUser(fullUser);
    setView(fullUser.avatar ? 'HOME' : 'PROFILE');
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setUser(updatedUser);

    try {
      await updateProfile(updatedUser.name, updatedUser.avatar, updatedUser.voice);
    } catch (error) {
      console.error('Failed to sync profile:', error);
    }

    setView('HOME');
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
      disconnectSocket(); // Disconnect socket on logout
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    setView('AUTH');
  };

  const handleStartSession = (mode: LiveMode, topic: Topic, audience: TargetAudience) => {
    setSessionConfig({ mode, topic, audience });
    setView('SESSION');
  };

  const handleEndSession = async (result?: ExamResult) => {
    if (result && user) {
      // Update user with new result
      const updatedHistory = [result, ...(user.history || [])];

      // Calculate XP
      let newXp = user.xp || 0;
      if (result.score === 'ĐẠT') newXp += 50;
      else newXp += 10;

      // Calculate Level
      let newLevel = user.level || 1;
      for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (newXp >= LEVEL_THRESHOLDS[i]) {
          newLevel = i + 1;
          break;
        }
      }

      // Check Badges
      const currentBadges = new Set(user.badges || []);
      const tempUserForCheck = { ...user, history: updatedHistory };

      BADGES.forEach(badge => {
        if (!currentBadges.has(badge.id) && badge.condition(tempUserForCheck)) {
          currentBadges.add(badge.id);
        }
      });

      const updatedUser: User = {
        ...user,
        history: updatedHistory,
        xp: newXp,
        level: newLevel,
        badges: Array.from(currentBadges),
      };

      setUser(updatedUser);

      // Save to server
      try {
        await saveExamResult(
          result.score as 'ĐẠT' | 'CHƯA ĐẠT',
          result.duration,
          result.topic || '',
          result.transcript || []
        );
      } catch (error) {
        console.error('Failed to save result to server:', error);
      }
    }

    setSessionConfig(null);
    setView('HOME');
  };

  // Custom Splash Screen with version info
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Loading screen while checking session (same color as splash for smooth transition)
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#667eea' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Render different screens based on current view
  const renderScreen = () => {
    if (!user) {
      return <AuthScreen onLogin={handleLogin} />;
    }

    switch (view) {
      case 'PROFILE':
        return (
          <ProfileScreen
            user={user}
            onUpdate={handleUpdateUser}
            onCancel={() => setView('HOME')}
            onLogout={handleLogout}
          />
        );

      case 'SESSION':
        if (!sessionConfig) {
          setView('HOME');
          return null;
        }
        return (
          <LiveSessionScreen
            user={user}
            mode={sessionConfig.mode}
            topic={sessionConfig.topic}
            audience={sessionConfig.audience}
            onEnd={handleEndSession}
          />
        );

      case 'HISTORY':
        return <HistoryScreen user={user} />;

      case 'HOME':
      default:
        return (
          <HomeScreen
            user={user}
            onLogout={handleLogout}
            onOpenProfile={() => setView('PROFILE')}
            onStartSession={handleStartSession}
          />
        );
    }
  };

  // Map view to tab
  const getActiveTab = (): TabType => {
    if (view === 'HOME') return 'HOME';
    if (view === 'HISTORY') return 'HISTORY';
    if (view === 'PROFILE') return 'PROFILE';
    return 'HOME';
  };

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setView(tab as ViewType);
  };

  // Check if should show tab bar
  const shouldShowTabBar = user && view !== 'AUTH' && view !== 'SESSION';

  return (
    <>
      <StatusBar style="dark" />

      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main">
          {() => (
            <View style={{ flex: 1 }}>
              {renderScreen()}
              {shouldShowTabBar && (
                <BottomTabBar
                  activeTab={getActiveTab()}
                  onTabChange={handleTabChange}
                />
              )}
              {/* Version check for logged in users */}
              {user && view !== 'SESSION' && (
                <View style={{ position: 'absolute', bottom: 90, right: 16, zIndex: -1, opacity: 0.5 }}>
                  <Text style={{ fontSize: 10, color: '#9CA3AF' }}>v{getLatestChangelog()?.version}</Text>
                </View>
              )}
            </View>
          )}
        </Stack.Screen>

        {/* Chat Screens */}
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
        <Stack.Screen name="NewChat" component={NewChatScreen} />
      </Stack.Navigator>

      <UpdateModal
        visible={isUpdateAvailable}
        isDownloading={isDownloading}
        onUpdate={downloadAndApply}
        onClose={dismissUpdate}
      />
    </>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <AppContent />
    </NavigationContainer>
  );
}
