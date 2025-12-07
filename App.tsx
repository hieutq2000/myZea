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
import { COLORS } from './src/utils/theme';
import { useAppUpdates } from './src/hooks/useAppUpdates';

type ViewType = 'AUTH' | 'HOME' | 'HISTORY' | 'PROFILE' | 'SESSION';

interface SessionConfig {
  mode: LiveMode;
  topic: Topic;
  audience: TargetAudience;
}

export default function App() {
  const { isUpdateAvailable, isDownloading, downloadAndApply, dismissUpdate } = useAppUpdates();

  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewType>('AUTH');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Check for existing session on app start
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      // Try to get user from API (requires server connection)
      const apiUser = await getCurrentUser();
      if (apiUser) {
        setUser(apiUser);
        setView(apiUser.avatar ? 'HOME' : 'PROFILE');
      }
    } catch (error) {
      console.error('Session check error:', error);
      // No offline fallback - user must login
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

      // Save to server (required)
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

  // Custom Splash Screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Loading screen
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 16, color: COLORS.textLight }}>Đang kết nối server...</Text>
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

  // Check if should show tab bar (only when logged in and not in session)
  const shouldShowTabBar = user && view !== 'AUTH' && view !== 'SESSION';

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {renderScreen()}
      {shouldShowTabBar && (
        <BottomTabBar
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
        />
      )}
      <UpdateModal
        visible={isUpdateAvailable}
        isDownloading={isDownloading}
        onUpdate={downloadAndApply}
        onClose={dismissUpdate}
      />
    </View>
  );
}
