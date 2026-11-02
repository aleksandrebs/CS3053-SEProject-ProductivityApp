import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';

const DURATIONS = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
const MODES = ['work', 'short', 'long'];
const LABELS = { work: 'Focus', short: 'Short', long: 'Long' };

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export default function TimerScreen() {
    useKeepAwake(); // keep the screen on while the timer screen is open

    const [mode, setMode] = useState('work');
    const [endTime, setEndTime] = useState(null); // null = paused
    const [remaining, setRemaining] = useState(DURATIONS.work); // seconds
    const [completed, setCompleted] = useState(0);
    const notifId = useRef(null);

    useEffect(() => {
        Notifications.requestPermissionsAsync();
    }, []);

    // Recompute remaining time from the end timestamp instead of decrementing
    useEffect(() => {
        if (!endTime) return;

        const tick = () => {
            const secs = Math.max(0, Math.round((endTime - Date.now()) / 1000));
            setRemaining(secs);
            if (secs === 0) finish();
        };

        tick();
        const id = setInterval(tick, 250);
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') tick();
        });

        return () => {
            clearInterval(id);
            sub.remove();
        };
    }, [endTime]);

    async function start() {
        const end = Date.now() + remaining * 1000;
        setEndTime(end);

        // Fires even if the app is in the background
        notifId.current = await Notifications.scheduleNotificationAsync({
            content: {
                title: mode === 'work' ? 'Focus done! Take a break.' : 'Break over, back to work.',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(end),
            },
        });
    }

    async function pause() {
        setEndTime(null);
        if (notifId.current) {
            await Notifications.cancelScheduledNotificationAsync(notifId.current);
            notifId.current = null;
        }
    }

    function switchMode(next) {
        pause();
        setMode(next);
        setRemaining(DURATIONS[next]);
    }

    function finish() {
        setEndTime(null);
        notifId.current = null; // notification already fired
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (mode === 'work') {
            const n = completed + 1;
            setCompleted(n);
            switchMode(n % 4 === 0 ? 'long' : 'short'); // long break every 4 pomodoros
        } else {
            switchMode('work');
        }
    }

    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');

    return (
        <View style={[styles.container, mode !== 'work' && styles.breakBg]}>
            <View style={styles.tabs}>
                {MODES.map((m) => (
                    <Pressable key={m} onPress={() => switchMode(m)}>
                        <Text style={[styles.tab, m === mode && styles.activeTab]}>{LABELS[m]}</Text>
                    </Pressable>
                ))}
            </View>

            <Text style={styles.time}>
                {mm}:{ss}
            </Text>

            <Pressable style={styles.button} onPress={endTime ? pause : start}>
                <Text style={styles.buttonText}>{endTime ? 'Pause' : 'Start'}</Text>
            </Pressable>

            <Text style={styles.count}>🍅 × {completed}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#c1121f',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
    },
    breakBg: { backgroundColor: '#6d6a4f' },
    tabs: { flexDirection: 'row', gap: 20 },
    tab: { color: '#ffffffaa', fontSize: 18 },
    activeTab: { color: '#fff', fontWeight: '700' },
    time: { color: '#fff', fontSize: 96, fontWeight: '200', fontVariant: ['tabular-nums'] },
    button: {
        backgroundColor: '#fff',
        paddingHorizontal: 48,
        paddingVertical: 16,
        borderRadius: 999,
    },
    buttonText: { fontSize: 20, fontWeight: '600', color: '#333' },
    count: { color: '#fff', fontSize: 18 },
});