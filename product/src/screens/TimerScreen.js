import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { getBalance, earnTokens} from "./TokenApi";

const DURATIONS = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
const MODES = ['work', 'short', 'long'];
const LABELS = { work: 'Focus', short: 'Short', long: 'Long' };
const TOKEN_INTERVAL = 5*60;
const RETRY_MS = 10000;

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
    const [tokens, setTokens] = useState(0);
    const notifId = useRef(null);

    //all for the tokens (time and saving)
    const usedSecs = useRef(0); // total seconds the timer has been running (any mode)
    const lastTick = useRef(0); // timestamp of the previous tick while running
    const awarded = useRef(0); // tokens already counted from usedSecs
    const pending = useRef(0); // tokens earned but not saved to the server yet
    const saving = useRef(false);
    const lastTry = useRef(0);

    useEffect(() => {
        Notifications.requestPermissionsAsync();
    }, []);

    // loads the saved balance from the user's account when the screen is open
    useEffect(() => {
        getBalance()
            .then((r) => setTokens(r.token_balance))
            .catch((e) => console.warn('Could not load balance', e));
    }, []);

    // Recompute remaining time from the end timestamp instead of decrementing
    useEffect(() => {
        if (!endTime) return;

        const tick = () => {
            const secs = Math.max(0, Math.round((endTime - Date.now()) / 1000));
            setRemaining(secs);
            usedSecs.current += (now - lastTick.current) / 1000;
            lastTick.current = now;
            collectTokens();
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
    // every 5 mins the user gets 1 token and is saved
    function collectTokens() {
        const earned = Math.floor(usedSecs.current / TOKEN_INTERVAL) - awarded.current;
        if (earned > 0) {
            awarded.current += earned;
            pending.current += earned;
            setTokens((t) => t + earned); // show it right away
        }
        saveTokens();
    }

    //send the pending tokens to the server (on the users account)
    async function saveTokens() {
        if (pending.current <= 0 || saving.current) return;
        if (Date.now() - lastTry.current < RETRY_MS) return;

        saving.current = true;
        lastTry.current = Date.now();
        const amount = Math.min(pending.current, 12);
        try {
            const r = await earnTokens(amount);
            pending.current -= amount;
            setTokens(r.token_balance + pending.current); // server balance + anything still unsaved
        } catch (e) {
            console.warn('Could not save tokens', e);
        } finally {
            saving.current = false;
        }
    }

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
            <View style={styles.tokenBadge}> {/*adding the token counterer */}
                <Text style={styles.tokenText}>🍅 {tokens}</Text>
            </View>

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
    tokenBadge: {       //adding the style for the token badge
        position: 'absolute',
        top: 60,
        right: 24,
        backgroundColor: '#ffffff33',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    tokenText: { color: '#fff', fontSize: 18, fontWeight: '600' },
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