import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import TimerScreen from './src/screens/TimerScreen';

export default function App() {
  // which screen we're on: 'login', 'signup' or 'timer'
  const [screen, setScreen] = useState('login');

  // login token from the backend, needed for routes like /streak
  const [token, setToken] = useState(null);

  function handleLoginSuccess(accessToken) {
    setToken(accessToken);
    setScreen('timer');
  }

  if (screen === 'timer') {
    return (
      <>
        <TimerScreen token={token} />
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
        onLoginSuccess={handleLoginSuccess}
        onCreateAccount={() => setScreen('signup')}
      />
      <StatusBar style="auto" />
    </>
  );
}
