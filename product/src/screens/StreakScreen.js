import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStreakHistory } from './TokenApi';

function formatDay(iso) {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function StreakScreen({ onBack }) {
  const [current, setCurrent] = useState(0);
  const [startedOn, setStartedOn] = useState(null);
  const [lastActive, setLastActive] = useState(null);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getStreakHistory()
      .then((r) => {
        setCurrent(r.current_streak || 0);
        setStartedOn(r.started_on || null);
        setLastActive(r.last_active_at || null);
        setDays(r.days || []);
      })
      .catch((e) => setError(e.message || 'Could not load streak.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#1c1c1a" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#c1121f" style={{ marginTop: 48 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <Text style={styles.heading}>Current streak</Text>
          <Text style={styles.big}>{current}</Text>
          <Text style={styles.sub}>
            {current === 1 ? 'day in a row' : 'days in a row'}
          </Text>

          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Started</Text>
              <Text style={styles.metaValue}>
                {current > 0 ? formatDay(startedOn) : 'No active streak'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Last check-in</Text>
              <Text style={styles.metaValue}>{formatWhen(lastActive)}</Text>
            </View>
          </View>

          <Text style={styles.section}>Check-in history</Text>
          <Text style={styles.hint}>
            Each day you start the timer is saved here.
          </Text>

          {days.length === 0 ? (
            <Text style={styles.empty}>
              No history yet. Start a focus session to begin.
            </Text>
          ) : (
            <FlatList
              data={days}
              keyExtractor={(item) => item.day}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const isStart =
                  startedOn && item.day === startedOn && current > 0;
                return (
                  <View style={[styles.row, index === 0 && styles.rowFirst]}>
                    <View style={styles.dot} />
                    <View style={styles.rowBody}>
                      <Text style={styles.dayText}>{formatDay(item.day)}</Text>
                      {isStart ? (
                        <Text style={styles.tag}>Streak started</Text>
                      ) : index === 0 ? (
                        <Text style={styles.tag}>Latest</Text>
                      ) : null}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f4',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 24,
  },
  topBar: {
    marginBottom: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e2',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1a',
    marginRight: 2,
  },
  heading: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#8a8a86',
    marginBottom: 4,
  },
  big: {
    fontSize: 72,
    fontWeight: '200',
    color: '#c1121f',
    letterSpacing: -2,
    lineHeight: 80,
  },
  sub: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1a',
    marginBottom: 20,
  },
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e2',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  metaLabel: {
    fontSize: 14,
    color: '#8a8a86',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    color: '#1c1c1a',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e6e6e2',
  },
  section: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#8a8a86',
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: '#8a8a86',
    marginBottom: 14,
  },
  list: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e2',
  },
  rowFirst: {
    borderColor: '#c1121f33',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c1121f',
    marginRight: 12,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c1c1a',
  },
  tag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#c1121f',
  },
  empty: {
    marginTop: 4,
    fontSize: 15,
    color: '#8a8a86',
  },
  error: {
    marginTop: 24,
    fontSize: 15,
    color: '#c1121f',
  },
});
