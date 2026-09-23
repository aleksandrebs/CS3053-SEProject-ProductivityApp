import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import TimerScreen from './src/screens/TimerScreen';

export default function App() {
    return (
        <>
            <TimerScreen />
            <StatusBar style="light" />
        </>
    );
}
