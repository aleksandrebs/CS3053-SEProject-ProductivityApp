import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  getLeaderboard,
  getFriendRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getMe,
} from './TokenApi';

function formatMinutes(mins) {
  const m = mins || 0;
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

function RankRow({ item, highlight }) {
  const label = item.username ? `@${item.username}` : item.name;
  return (
    <View style={[styles.row, highlight && styles.rowMe]}>
      <Text style={styles.rank}>#{item.rank ?? '—'}</Text>
      <View style={styles.rowMain}>
        <Text style={styles.rowName} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {formatMinutes(item.total_study_time)} studied · {item.token_balance} tokens ·{' '}
          {item.current_streak} day streak
        </Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const [tab, setTab] = useState('all'); // all | friends | add
  const [items, setItems] = useState([]);
  const [me, setMe] = useState(null);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadBoard = useCallback(async (scope) => {
    const data = await getLeaderboard(scope);
    setItems(data.items || []);
  }, []);

  const loadRequests = useCallback(async () => {
    const data = await getFriendRequests();
    setIncoming(data.incoming || []);
  }, []);

  const load = useCallback(async () => {
    setMessage('');
    try {
      const profile = await getMe();
      setMe(profile);
      if (tab === 'add') {
        await loadRequests();
      } else {
        await loadBoard(tab === 'friends' ? 'friends' : 'all');
      }
    } catch (e) {
      setMessage(e.message || 'Could not load leaderboard.');
    }
  }, [tab, loadBoard, loadRequests]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    if (tab === 'add' && query.trim()) {
      await runSearch(query);
    }
    setRefreshing(false);
  }

  async function runSearch(text) {
    const q = text.trim();
    setQuery(text);
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await searchUsers(q);
      setSearchResults(data.items || []);
    } catch (e) {
      setMessage(e.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  async function onAdd(userId) {
    setMessage('');
    try {
      await sendFriendRequest(userId);
      setMessage('Friend request sent.');
      await runSearch(query);
      await loadRequests();
    } catch (e) {
      setMessage(e.message || 'Could not send request.');
    }
  }

  async function onAccept(friendshipId) {
    try {
      await acceptFriendRequest(friendshipId);
      setMessage('Friend added.');
      await loadRequests();
    } catch (e) {
      setMessage(e.message || 'Could not accept.');
    }
  }

  async function onReject(friendshipId) {
    try {
      await rejectFriendRequest(friendshipId);
      await loadRequests();
    } catch (e) {
      setMessage(e.message || 'Could not reject.');
    }
  }

  function friendActionLabel(friendship) {
    if (!friendship) return 'Add';
    if (friendship.status === 'accepted') return 'Friends';
    if (friendship.status === 'pending' && friendship.direction === 'outgoing') return 'Pending';
    if (friendship.status === 'pending' && friendship.direction === 'incoming') return 'Accept';
    return 'Add';
  }

  const listHeader = (
    <View>
      <Text style={styles.heading}>Leaderboard</Text>
      <Text style={styles.subheading}>Study time, tokens, and streaks</Text>

      <View style={styles.tabs}>
        {[
          { key: 'all', label: 'Everyone' },
          { key: 'friends', label: 'Friends' },
          { key: 'add', label: 'Add friends' },
        ].map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabOn]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );

  if (loading && items.length === 0 && tab !== 'add') {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#c1121f" />
      </View>
    );
  }

  if (tab === 'add') {
    return (
      <View style={styles.container}>
        <FlatList
          data={searchResults}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c1121f" />
          }
          ListHeaderComponent={
            <View>
              {listHeader}
              <TextInput
                style={styles.search}
                placeholder="Search name or username"
                placeholderTextColor="#8a8a86"
                value={query}
                onChangeText={runSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searching ? <ActivityIndicator color="#c1121f" style={{ marginVertical: 12 }} /> : null}

              {incoming.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Requests for you</Text>
                  {incoming.map((req) => (
                    <View key={req.friendship_id} style={styles.requestCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName}>
                          {req.user.username ? `@${req.user.username}` : req.user.name}
                        </Text>
                        <Text style={styles.rowMeta}>
                          {formatMinutes(req.user.total_study_time)} · {req.user.token_balance} tokens
                        </Text>
                      </View>
                      <Pressable style={styles.smallBtn} onPress={() => onAccept(req.friendship_id)}>
                        <Text style={styles.smallBtnText}>Accept</Text>
                      </Pressable>
                      <Pressable
                        style={styles.ghostSmall}
                        onPress={() => onReject(req.friendship_id)}
                      >
                        <Text style={styles.ghostSmallText}>No</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Search results</Text>
            </View>
          }
          ListEmptyComponent={
            !searching && query.trim() ? (
              <Text style={styles.empty}>No users found.</Text>
            ) : (
              <Text style={styles.empty}>Type a name to find classmates.</Text>
            )
          }
          renderItem={({ item }) => {
            const label = friendActionLabel(item.friendship);
            const disabled = label === 'Friends' || label === 'Pending';
            return (
              <View style={styles.requestCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>
                    {item.username ? `@${item.username}` : item.name}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {formatMinutes(item.total_study_time)} · {item.token_balance} tokens ·{' '}
                    {item.current_streak} streak
                  </Text>
                </View>
                {label === 'Accept' ? (
                  <Pressable
                    style={styles.smallBtn}
                    onPress={() => onAccept(item.friendship.friendship_id)}
                  >
                    <Text style={styles.smallBtnText}>Accept</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.smallBtn, disabled && styles.smallBtnDisabled]}
                    disabled={disabled}
                    onPress={() => onAdd(item.id)}
                  >
                    <Text style={styles.smallBtnText}>{label}</Text>
                  </Pressable>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.list}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c1121f" />
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<Text style={styles.empty}>No one on the board yet.</Text>}
        renderItem={({ item }) => (
          <RankRow item={item} highlight={me && item.id === me.id} />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f4',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1c1a',
    letterSpacing: -0.4,
  },
  subheading: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 15,
    color: '#6f6f6a',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ecece8',
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabOn: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6f6f6a',
  },
  tabTextOn: {
    color: '#1c1c1a',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e2',
  },
  rowMe: {
    borderColor: '#c1121f',
    borderWidth: 1.5,
  },
  rank: {
    width: 40,
    fontSize: 15,
    fontWeight: '700',
    color: '#8a8a86',
  },
  rowMain: {
    flex: 1,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1c1a',
  },
  rowMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6f6f6a',
  },
  search: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e2',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1c1c1a',
    marginBottom: 12,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#8a8a86',
    marginBottom: 10,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e2',
  },
  smallBtn: {
    backgroundColor: '#1c1c1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  smallBtnDisabled: {
    backgroundColor: '#bbb',
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  ghostSmall: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ghostSmallText: {
    color: '#6f6f6a',
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: '#8a8a86',
    marginTop: 24,
    fontSize: 15,
  },
  message: {
    textAlign: 'center',
    color: '#6f6f6a',
    marginBottom: 10,
    fontSize: 14,
  },
});
