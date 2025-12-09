import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, Alert } from 'react-native';
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

import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './src/navigation/types';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import NewChatScreen from './src/screens/NewChatScreen';
import CallScreen from './src/screens/CallScreen';
import { initSocket, disconnectSocket, getSocket } from './src/utils/socket';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, schedulePushNotification } from './src/utils/notifications';

const Stack = createStackNavigator<RootStackParamList>();

function AppContent({ navigationRef }: { navigationRef: any }) {
  const { isUpdateAvailable, isDownloading, downloadAndApply, dismissUpdate } = useAppUpdates();

  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewType>('AUTH');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  const [pushToken, setPushToken] = useState<string | null>(null);

  // Setup Notifications (silently - no alerts)
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setPushToken(token);
        console.log('✅ Push Token obtained');
      } else {
        console.log('⚠️ No push token - notifications disabled');
      }
    }).catch(err => {
      // Silently ignore push token errors (Apple Developer account required)
      console.log('⚠️ Push token error (ignored):', err.message);
    });

    // Handle user tapping on notification
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('🔔 Notification Tapped:', data);

      if (data && data.conversationId && data.partnerId) {
        // Delay slightly to allow app to wake up/mount navigation
        setTimeout(() => {
          if (navigationRef.isReady()) {
            navigationRef.navigate('ChatDetail', {
              conversationId: data.conversationId,
              partnerId: data.partnerId,
              userName: response.notification.request.content.title || 'Người dùng',
            });
          } else {
            console.log('⚠️ Navigation not ready');
          }
        }, 500);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Update backend with push token when user logs in
  useEffect(() => {
    if (user && pushToken) {
      const { updatePushToken } = require('./src/utils/api');
      updatePushToken(pushToken)
        .then(() => console.log('✅ Push token sent to server'))
        .catch((err: any) => console.log('⚠️ Failed to update push token:', err.message));
    }
  }, [user, pushToken]);

  // Socket management
  useEffect(() => {
    let socketListener: any = null;

    if (user?.id) {
      initSocket(user.id);
      const socket = getSocket();

      if (socket) {
        socketListener = async (message: any) => {
          // Show nice iOS notification banner if message is from someone else
          if (message.user && message.user._id !== user.id) {
            await schedulePushNotification(
              message.user.name || 'Tin nhắn mới',
              message.text || 'Đã gửi một tin nhắn',
              {
                conversationId: message.conversationId,
                partnerId: message.user._id,
                userName: message.user.name,
                avatar: message.user.avatar
              }
            );
          }
        };

        socket.on('receiveMessage', socketListener);

        // Handle incoming call
        socket.on('incomingCall', (data: any) => {
          console.log('📞 Incoming call from:', data.callerId);

          Alert.alert(
            `📞 Cuộc gọi ${data.isVideo ? 'video' : 'thoại'} đến`,
            'Bạn có muốn trả lời?',
            [
              {
                text: 'Từ chối',
                style: 'cancel',
                onPress: () => {
                  socket.emit('callRejected', {
                    callerId: data.callerId,
                    receiverId: user?.id,
                  });
                }
              },
              {
                text: 'Trả lời',
                onPress: () => {
                  socket.emit('callAccepted', {
                    callerId: data.callerId,
                    receiverId: user?.id,
                    channelName: data.channelName,
                  });

                  if (navigationRef.isReady()) {
                    navigationRef.navigate('Call', {
                      partnerId: data.callerId,
                      isVideo: data.isVideo,
                      isIncoming: true,
                      channelName: data.channelName,
                    });
                  }
                }
              }
            ],
            { cancelable: false }
          );
        });
      }
    } else {
      disconnectSocket();
    }

    return () => {
      const socket = getSocket();
      if (socket && socketListener) {
        socket.off('receiveMessage', socketListener);
        socket.off('incomingCall');
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

        {/* Call Screen */}
        <Stack.Screen
          name="Call"
          component={CallScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
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
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  return (
    <NavigationContainer ref={navigationRef}>
      <AppContent navigationRef={navigationRef} />
    </NavigationContainer>
  );
}
