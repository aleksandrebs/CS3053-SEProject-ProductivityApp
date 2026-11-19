import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { getStudyStats, getStudyHistory } from './TokenApi';

// 95 -> "1m 35s", 1500 -> "25m", 4800 -> "1h 20m"
function formatDuration(secs) {
  const s = Math.max(0, Math.round(secs || 0));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const rest = s % 60;
  return rest > 0 && m < 10 ? `${m}m ${rest}s` : `${m}m`;
}

function formatWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function dayLetter(isoDay) {
  // noon so the date doesn't move to another day in any time zone
  const d = new Date(isoDay + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
}

export default function StatsScreen() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError('');
    try {
      const [s, h] = await Promise.all([getStudyStats(), getStudyHistory(50)]);
      setStats(s);
      setHistory(h.items || []);
    } catch (e) {
      setError(e.message || 'Could not load your stats.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function refresh() {
    setRefreshing(true);
    load();
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#c1121f" />
      </View>
    );
  }

  const days = stats?.last_7_days || [];
  const maxDay = Math.max(1, ...days.map((d) => d.seconds));

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <Text style={styles.heading}>Stats</Text>
        <Text style={styles.title}>Your study time</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* today + week + all time */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Today</Text>
          <Text style={styles.heroValue}>{formatDuration(stats?.today_seconds)}</Text>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroSmallLabel}>This week</Text>
              <Text style={styles.heroSmallValue}>{formatDuration(stats?.week_seconds)}</Text>
            </View>
            <View>
              <Text style={styles.heroSmallLabel}>All time</Text>
              <Text style={styles.heroSmallValue}>{formatDuration(stats?.total_seconds)}</Text>
            </View>
            <View>
              <Text style={styles.heroSmallLabel}>Streak</Text>
              <Text style={styles.heroSmallValue}>🔥 {stats?.current_streak ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* small stat cards */}
        <View style={styles.grid}>
          <StatCard label="Sessions done" value={stats?.sessions_completed ?? 0} />
          <StatCard label="Completion rate" value={`${stats?.completion_rate ?? 0}%`} />
          <StatCard label="Average session" value={formatDuration(stats?.average_seconds)} />
          <StatCard label="Longest session" value={formatDuration(stats?.longest_seconds)} />
        </View>

        {/* last 7 days bar chart */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Last 7 days</Text>
          <View style={styles.chart}>
            {days.map((d, i) => {
              const isToday = i === days.length - 1;
              const height = d.seconds > 0 ? Math.max(6, (d.seconds / maxDay) * 110) : 3;
              return (
                <View key={d.day} style={styles.barCol}>
                  <Text style={styles.barValue}>
                    {d.seconds > 0 ? formatDuration(d.seconds) : ''}
                  </Text>
                  <View style={[styles.bar, { height }, isToday && styles.barToday]} />
                  <Text style={[styles.barDay, isToday && styles.barDayToday]}>
                    {dayLetter(d.day)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* past sessions */}
        <Text style={styles.section}>History</Text>
        {history.length === 0 ? (
          <Text style={styles.empty}>
            No sessions yet. Start a focus session on the timer and it will show up here.
          </Text>
        ) : (
          history.map((s) => {
            const done = s.status === 'completed';
            return (
              <View key={s.id} style={styles.item}>
                <View style={styles.itemTop}>
                  <Text style={styles.itemWhen}>{formatWhen(s.start_time)}</Text>
                  <Text style={styles.itemTime}>{formatDuration(s.seconds_studied)}</Text>
                </View>
                <View style={styles.itemBottom}>
                  <View style={[styles.pill, done ? styles.pillDone : styles.pillCancel]}>
                    <Text style={[styles.pillText, done ? styles.pillTextDone : styles.pillTextCancel]}>
                      {done ? 'Completed' : 'Cancelled'}
                    </Text>
                  </View>
                  <Text style={styles.itemMeta}>
                    planned {s.planned_duration} min · 🍅 +{s.tokens_earned}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f4' },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: 72, paddingHorizontal: 24, paddingBottom: 120 },
  heading: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#8a8a86',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1c1a',
    letterSpacing: -0.4,
    marginBottom: 20,
  },
  error: { color: '#c1121f', fontSize: 14, marginBottom: 12 },
  hero: { backgroundColor: '#1c1c1a', borderRadius: 18, padding: 20, marginBottom: 14 },
  heroLabel: { color: '#ffffff99', fontSize: 13, fontWeight: '500' },
  heroValue: { color: '#fff', fontSize: 40, fontWeight: '700', marginTop: 2, marginBottom: 16 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroSmallLabel: { color: '#ffffff80', fontSize: 12, fontWeight: '500', marginBottom: 2 },
  heroSmallValue: { color: '#fff', fontSize: 17, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 14,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e2',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1c1c1a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e2',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a8a86',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    marginTop: 4,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontSize: 9, color: '#8a8a86', marginBottom: 4 },
  bar: { width: 18, borderRadius: 6, backgroundColor: '#d9d9d4' },
  barToday: { backgroundColor: '#c1121f' },
  barDay: { marginTop: 6, fontSize: 12, color: '#8a8a86', fontWeight: '600' },
  barDayToday: { color: '#c1121f' },
  section: { fontSize: 18, fontWeight: '700', color: '#1c1c1a', marginBottom: 12 },
  empty: { color: '#6f6f6a', fontSize: 14, lineHeight: 20 },
  item: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e2',
  },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemWhen: { fontSize: 15, fontWeight: '600', color: '#1c1c1a' },
  itemTime: { fontSize: 17, fontWeight: '700', color: '#1c1c1a' },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillDone: { backgroundColor: '#e6f4ea' },
  pillCancel: { backgroundColor: '#efefec' },
  pillText: { fontSize: 12, fontWeight: '600' },
  pillTextDone: { color: '#1e7a3c' },
  pillTextCancel: { color: '#6f6f6a' },
  itemMeta: { fontSize: 13, color: '#8a8a86' },
});
