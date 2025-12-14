import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ActivityIndicator, View, Text, Alert } from 'react-native';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import LiveSessionScreen from './src/screens/LiveSessionScreen';
import SplashScreen from './src/screens/SplashScreen';
import UpdateModal from './src/components/UpdateModal';
import PlaceScreen from './src/screens/PlaceScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import IncomingCallModal from './src/components/IncomingCallModal';
import BottomTabBar, { TabType } from './src/components/BottomTabBar';
import OnboardingScreen from './src/screens/OnboardingScreen';
import {
  User, ExamResult, LiveMode, Topic, TargetAudience,
  BADGES, LEVEL_THRESHOLDS
} from './src/types';
import { getCurrentUser, logout as apiLogout, updateProfile, saveExamResult } from './src/utils/api';
import { getLatestChangelog } from './src/utils/changelog';
import { COLORS } from './src/utils/theme';
import { useAppUpdates } from './src/hooks/useAppUpdates';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import { getSystemSettings } from './src/utils/api';

type ViewType = 'AUTH' | 'HOME' | 'HISTORY' | 'PROFILE' | 'SESSION' | 'PLACE' | 'ONBOARDING';

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

// Configure Notifications to show alert when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const Stack = createStackNavigator<RootStackParamList>();

function AppContent({ navigationRef }: { navigationRef: any }) {
  const { isUpdateAvailable, isDownloading, downloadAndApply, dismissUpdate } = useAppUpdates();

  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewType>('AUTH');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  // Incoming call state
  const [incomingCall, setIncomingCall] = useState<{
    visible: boolean;
    callerId: string;
    callerName?: string;
    callerAvatar?: string;
    channelName?: string;
    isVideo: boolean;
  }>({ visible: false, callerId: '', isVideo: false });
  const [maintenanceMode, setMaintenanceMode] = useState<{ enabled: boolean; message?: string }>({
    enabled: false,
  });


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

        // Handle incoming call - show beautiful modal
        socket.on('incomingCall', (data: any) => {
          console.log('📞 Incoming call from:', data.callerId);
          setIncomingCall({
            visible: true,
            callerId: data.callerId,
            callerName: data.callerName,
            callerAvatar: data.callerAvatar,
            channelName: data.channelName,
            isVideo: data.isVideo,
          });
        });

        // Handle caller hanging up before accept
        socket.on('callEnded', (data: any) => {
          console.log('Call ended by caller:', data);
          setIncomingCall((prev) => {
            if (prev.visible && prev.callerId === data.callerId) {
              return { ...prev, visible: false };
            }
            return prev;
          });
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
        socket.off('callEnded');
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
        setView(apiUser.avatar ? 'HOME' : 'ONBOARDING');
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkMaintenance = async () => {
      const settings = await getSystemSettings();
      if (settings.maintenance) {
        setMaintenanceMode({ enabled: true, message: settings.maintenanceMessage });
      }
    };
    checkMaintenance();
  }, []);

  // Handle accepting incoming call
  const handleAcceptCall = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('callAccepted', {
        callerId: incomingCall.callerId,
        receiverId: user?.id,
        channelName: incomingCall.channelName,
      });
    }

    setIncomingCall({ ...incomingCall, visible: false });

    if (navigationRef.isReady()) {
      navigationRef.navigate('Call', {
        partnerId: incomingCall.callerId,
        userName: incomingCall.callerName,
        avatar: incomingCall.callerAvatar,
        isVideo: incomingCall.isVideo,
        isIncoming: true,
        channelName: incomingCall.channelName,
      });
    }
  };

  // Handle rejecting incoming call
  const handleRejectCall = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('callRejected', {
        callerId: incomingCall.callerId,
        receiverId: user?.id,
      });
    }
    setIncomingCall({ ...incomingCall, visible: false });
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
    setView(fullUser.avatar ? 'HOME' : 'ONBOARDING');
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setUser(updatedUser);

    try {
      await updateProfile(updatedUser.name, updatedUser.avatar, updatedUser.voice, updatedUser.coverImage);
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

    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#667eea' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (maintenanceMode.enabled) {
    return <MaintenanceScreen message={maintenanceMode.message} />;
  }

  // Render different screens based on current view
  const renderScreen = () => {
    if (!user) {
      return <AuthScreen onLogin={handleLogin} />;
    }

    switch (view) {
      case 'ONBOARDING':
        return (
          <OnboardingScreen
            user={user}
            onComplete={handleUpdateUser}
            onSkip={() => setView('HOME')}
          />
        );

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

      case 'PLACE':
        return <PlaceScreen user={user} onGoHome={() => setView('HOME')} />;

      case 'HOME':
      default:
        return (
          <HomeScreen
            user={user}
            onLogout={handleLogout}
            onOpenProfile={() => setView('PROFILE')}
            onStartSession={handleStartSession}
            onViewTasks={() => setView('HISTORY')}
          />
        );
    }
  };

  // Map view to tab
  const getActiveTab = (): TabType => {
    if (view === 'HOME') return 'HOME';
    if (view === 'HISTORY') return 'HISTORY';
    if (view === 'PROFILE') return 'PROFILE';
    if (view === 'PLACE') return 'PLACE';
    return 'HOME';
  };

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    if (tab === 'CHAT_TAB') {
      if (navigationRef.isReady()) {
        navigationRef.navigate('ChatList');
      }
      return;
    }

    if (tab === 'PLACE') {
      setView('PLACE');
      return;
    }

    if (tab === 'PROFILE') { // Map Store -> Profile for now
      setView('PROFILE');
      return;
    }

    setView(tab as ViewType);
  };

  // Check if should show tab bar (hide for PLACE, ONBOARDING - they have their own UI)
  const shouldShowTabBar = user && view !== 'AUTH' && view !== 'SESSION' && view !== 'PLACE' && view !== 'ONBOARDING';

  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

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

        <Stack.Screen name="Settings">
          {(props) => <SettingsScreen {...props} onLogout={handleLogout} />}
        </Stack.Screen>

        <Stack.Screen
          name="PostDetail"
          component={PostDetailScreen}
          options={{
            headerShown: false,
            // Enable slide animation from right
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              };
            },
          }}
        />
      </Stack.Navigator>

      <UpdateModal
        visible={isUpdateAvailable}
        isDownloading={isDownloading}
        onUpdate={downloadAndApply}
        onClose={dismissUpdate}
      />

      <IncomingCallModal
        visible={incomingCall.visible}
        callerName={incomingCall.callerName}
        callerAvatar={incomingCall.callerAvatar}
        isVideo={incomingCall.isVideo}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    </>
  );
}

export default function App() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  return (
    <ThemeProvider>
      <NavigationContainer ref={navigationRef}>
        <AppContent navigationRef={navigationRef} />
      </NavigationContainer>
    </ThemeProvider>
  );
}
