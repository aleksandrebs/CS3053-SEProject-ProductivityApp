import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import TimerScreen from './src/screens/TimerScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import StreakScreen from './src/screens/StreakScreen';
import BottomTabBar from './src/components/BottomTabBar';

export default function App() {
  // which screen we're on: 'login', 'signup' or 'main' (logged in)
  const [screen, setScreen] = useState('login');

  // tab inside the logged-in area: leaderboard | timer | profile
  const [activeTab, setActiveTab] = useState('timer');

  // full-screen pages on top of the tabs (streak history, etc.)
  const [overlay, setOverlay] = useState(null);

  // login token from the backend, needed for routes like /streak
  const [token, setToken] = useState(null);

  async function handleLoginSuccess(accessToken) {
    setToken(accessToken);
    // TokenApi.js reads the token from here, so it has to be saved
    // before the timer screen opens and asks for the balance
    await SecureStore.setItemAsync('access_token', accessToken);
    setActiveTab('timer');
    setOverlay(null);
    setScreen('main');
  }

  if (screen === 'main') {
    // timer stays mounted (just hidden) so it keeps running on other tabs
    return (
      <View style={styles.main}>
        <View
          style={[
            styles.page,
            (activeTab !== 'timer' || overlay) && styles.hidden,
          ]}
        >
          <TimerScreen
            token={token}
            onOpenStreak={() => setOverlay('streak')}
          />
        </View>

        {overlay === 'streak' ? (
          <View style={styles.page}>
            <StreakScreen onBack={() => setOverlay(null)} />
          </View>
        ) : (
          <>
            {activeTab === 'leaderboard' && <LeaderboardScreen />}
            {activeTab === 'profile' && (
              <ProfileScreen onOpenStreak={() => setOverlay('streak')} />
            )}
            <BottomTabBar activeTab={activeTab} onChangeTab={setActiveTab} />
          </>
        )}

        <StatusBar
          style={overlay || activeTab !== 'timer' ? 'dark' : 'light'}
        />
      </View>
    );
  }

  if (screen === 'signup') {
    return (
      <>
        <SignUpScreen
          onSignUp={() => setScreen('login')}
          onBackToLogin={() => setScreen('login')}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onCreateAccount={() => setScreen('signup')}
      />
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});
