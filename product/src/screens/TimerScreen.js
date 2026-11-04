import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { getBalance, earnTokens, getStreak, checkInStreak } from './TokenApi';

const DEFAULTS = { work: 25 * 60, break: 5 * 60 };
const MODES = ['work', 'break', 'custom'];
const LABELS = { work: 'Focus', break: 'Break', custom: 'Custom' };
const TOKEN_INTERVAL = 5 * 60;
const RETRY_MS = 10000;
const CUSTOM_MIN = 1;
const CUSTOM_MAX = 180;
const IS_WEB = Platform.OS === 'web';

if (!IS_WEB) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
}

export default function TimerScreen({ onOpenStreak }) {
    useKeepAwake();

    const [mode, setMode] = useState('work');
    const [endTime, setEndTime] = useState(null); // null = paused
    const [remaining, setRemaining] = useState(DEFAULTS.work); // seconds
    const [customMins, setCustomMins] = useState(10);
    const [tokens, setTokens] = useState(0);
    const [streak, setStreak] = useState(0); // days in a row
    const notifId = useRef(null);

    //all for the tokens (time and saving)
    const usedSecs = useRef(0); // total seconds the timer has been running (any mode)
    const lastTick = useRef(0); // timestamp of the previous tick while running
    const awarded = useRef(0); // tokens already counted from usedSecs
    const pending = useRef(0); // tokens earned but not saved to the server yet
    const saving = useRef(false);
    const lastTry = useRef(0);

    function durationFor(m, mins = customMins) {
        if (m === 'custom') return mins * 60;
        return DEFAULTS[m];
    }

    useEffect(() => {
        if (!IS_WEB) Notifications.requestPermissionsAsync();
    }, []);

    // loads the saved balance and streak from the user's account when the screen is open
    useEffect(() => {
        getBalance()
            .then((r) => setTokens(r.token_balance))
            .catch((e) => console.warn('Could not load balance', e));
        getStreak()
            .then((r) => setStreak(r.current_streak))
            .catch((e) => console.warn('Could not load streak', e));
    }, []);

    // Recompute remaining time from the end timestamp instead of decrementing
    useEffect(() => {
        if (!endTime) return;

        const tick = () => {
            const now = Date.now();
            const secs = Math.max(0, Math.round((endTime - now) / 1000));
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

    function notifTitle() {
        if (mode === 'work') return 'Focus done! Take a break.';
        if (mode === 'break') return 'Break over, back to work.';
        return "Time's up!";
    }

    async function start() {
        const end = Date.now() + remaining * 1000;
        lastTick.current = Date.now(); // so only time from now on counts towards tokens
        setEndTime(end);

        // starting the timer counts today for the streak
        checkInStreak()
            .then((r) => setStreak(r.current_streak))
            .catch((e) => console.warn('Could not update streak', e));

        // phone only — browsers don't support scheduled local notifications the same way
        if (!IS_WEB) {
            notifId.current = await Notifications.scheduleNotificationAsync({
                content: { title: notifTitle() },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: new Date(end),
                },
            });
        }
    }

    async function pause() {
        setEndTime(null);
        if (!IS_WEB && notifId.current) {
            await Notifications.cancelScheduledNotificationAsync(notifId.current);
            notifId.current = null;
        }
    }

    // stop the run and put the clock back to the full time for this mode
    async function reset() {
        await pause();
        setRemaining(durationFor(mode));
    }

    function switchMode(next) {
        pause();
        setMode(next);
        setRemaining(durationFor(next));
    }

    function changeCustomMins(delta) {
        if (endTime) return; // don't change length while running
        const next = Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, customMins + delta));
        setCustomMins(next);
        if (mode === 'custom') setRemaining(next * 60);
    }

    function finish() {
        setEndTime(null);
        notifId.current = null; // notification already fired
        if (!IS_WEB) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        if (mode === 'work') {
            switchMode('break');
        } else {
            switchMode('work');
        }
    }

    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    // show reset after the user has started (running or paused mid-session)
    const canReset = endTime !== null || remaining < durationFor(mode);

    return (
        <View style={[styles.container, mode === 'break' && styles.breakBg]}>
            {/* streak and token counters */}
            <View style={styles.badges}>
                <Pressable style={styles.badge} onPress={onOpenStreak}>
                    <Text style={styles.badgeText}>🔥 {streak}</Text>
                </Pressable>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>🍅 {tokens}</Text>
                </View>
            </View>

            <View style={styles.tabs}>
                {MODES.map((m) => (
                    <Pressable key={m} onPress={() => switchMode(m)}>
                        <Text style={[styles.tab, m === mode && styles.activeTab]}>
                            {LABELS[m]}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <Text style={styles.time}>
                {mm}:{ss}
            </Text>

            {mode === 'custom' && !endTime ? (
                <View style={styles.customRow}>
                    <Pressable style={styles.stepBtn} onPress={() => changeCustomMins(-1)}>
                        <Text style={styles.stepText}>−</Text>
                    </Pressable>
                    <Text style={styles.customLabel}>
                        {customMins} min
                    </Text>
                    <Pressable style={styles.stepBtn} onPress={() => changeCustomMins(1)}>
                        <Text style={styles.stepText}>+</Text>
                    </Pressable>
                </View>
            ) : null}

            <View style={styles.actions}>
                <Pressable style={styles.button} onPress={endTime ? pause : start}>
                    <Text style={styles.buttonText}>{endTime ? 'Pause' : 'Start'}</Text>
                </Pressable>
                {canReset ? (
                    <Pressable style={styles.resetButton} onPress={reset}>
                        <Text style={styles.resetButtonText}>Reset</Text>
                    </Pressable>
                ) : null}
            </View>
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
        paddingBottom: 88,
    },
    breakBg: { backgroundColor: '#6d6a4f' },
    badges: { position: 'absolute', top: 60, right: 24, flexDirection: 'row', gap: 8 },
    badge: {
        backgroundColor: '#ffffff33',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    badgeText: { color: '#fff', fontSize: 18, fontWeight: '600' },
    tabs: { flexDirection: 'row', gap: 20 },
    tab: { color: '#ffffffaa', fontSize: 18 },
    activeTab: { color: '#fff', fontWeight: '700' },
    time: { color: '#fff', fontSize: 96, fontWeight: '200', fontVariant: ['tabular-nums'] },
    customRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginTop: -12,
    },
    stepBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: '#ffffffaa',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '500',
        lineHeight: 28,
    },
    customLabel: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        minWidth: 72,
        textAlign: 'center',
    },
    actions: {
        alignItems: 'center',
        gap: 12,
    },
    button: {
        backgroundColor: '#fff',
        paddingHorizontal: 48,
        paddingVertical: 16,
        borderRadius: 999,
    },
    buttonText: { fontSize: 20, fontWeight: '600', color: '#333' },
    resetButton: {
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: '#ffffffaa',
    },
    resetButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
