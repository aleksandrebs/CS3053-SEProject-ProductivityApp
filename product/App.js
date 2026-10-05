import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import TimerScreen from './src/screens/TimerScreen';

export default function App() {
  // which screen we're on: 'login', 'signup' or 'timer'
  const [screen, setScreen] = useState('login');

  if (screen === 'timer') {
    return (
      <>
        <TimerScreen />
        <StatusBar style="light" />
      </>
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
        onLoginSuccess={() => setScreen('timer')}
        onCreateAccount={() => setScreen('signup')}
      />
      <StatusBar style="auto" />
    </>
  );
}
