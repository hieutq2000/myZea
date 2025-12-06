import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LiveSessionScreen from './src/screens/LiveSessionScreen';
import {
  User, ExamResult, LiveMode, Topic, TargetAudience,
  BADGES, LEVEL_THRESHOLDS
} from './src/types';
import { getCurrentUser, logout as apiLogout, updateProfile, saveExamResult } from './src/utils/api';
import { COLORS } from './src/utils/theme';

type ViewType = 'AUTH' | 'HOME' | 'PROFILE' | 'SESSION';

interface SessionConfig {
  mode: LiveMode;
  topic: Topic;
  audience: TargetAudience;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewType>('AUTH');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Check for existing session on app start
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      // First try to get user from API
      const apiUser = await getCurrentUser();
      if (apiUser) {
        setUser(apiUser);
        setView(apiUser.avatar ? 'HOME' : 'PROFILE');
        setIsOffline(false);
      } else {
        // Check for offline user
        const savedUser = await AsyncStorage.getItem('offline_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setView(parsedUser.avatar ? 'HOME' : 'PROFILE');
          setIsOffline(true);
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
      // Try offline mode
      const savedUser = await AsyncStorage.getItem('offline_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setView(parsedUser.avatar ? 'HOME' : 'PROFILE');
        setIsOffline(true);
      }
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

    // If offline, save to local storage
    if (loggedInUser.email === 'guest@local') {
      setIsOffline(true);
      await AsyncStorage.setItem('offline_user', JSON.stringify(fullUser));
    }

    setView(fullUser.avatar ? 'HOME' : 'PROFILE');
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setUser(updatedUser);

    if (isOffline) {
      await AsyncStorage.setItem('offline_user', JSON.stringify(updatedUser));
    } else {
      try {
        await updateProfile(updatedUser.name, updatedUser.avatar, updatedUser.voice);
      } catch (error) {
        console.error('Failed to sync profile:', error);
      }
    }

    setView('HOME');
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
      await AsyncStorage.removeItem('offline_user');
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    setIsOffline(false);
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

      // Save to server or local
      if (isOffline) {
        await AsyncStorage.setItem('offline_user', JSON.stringify(updatedUser));
      } else {
        try {
          await saveExamResult(
            result.score as 'ĐẠT' | 'CHƯA ĐẠT',
            result.duration,
            result.topic || '',
            result.transcript || []
          );
        } catch (error) {
          console.error('Failed to save result to server:', error);
          // Save locally as fallback
          await AsyncStorage.setItem('offline_user', JSON.stringify(updatedUser));
        }
      }
    }

    setSessionConfig(null);
    setView('HOME');
  };

  // Loading screen
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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

  return (
    <>
      <StatusBar style="dark" />
      {renderScreen()}
    </>
  );
}
