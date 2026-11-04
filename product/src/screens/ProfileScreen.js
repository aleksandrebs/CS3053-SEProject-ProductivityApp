import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { getMe, updateUsername } from './TokenApi';

export default function ProfileScreen({ onOpenStreak }) {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const me = await getMe();
      setUser(me);
      setUsername(me.username || '');
    } catch (e) {
      setMessage(e.message || 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  }

  async function saveUsername() {
    const next = username.trim();
    if (next === (user?.username || '')) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const updated = await updateUsername(next);
      setUser(updated);
      setUsername(updated.username || '');
      setEditing(false);
      setMessage('Username saved.');
    } catch (e) {
      setMessage(e.message || 'Could not save username.');
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setUsername(user?.username || '');
    setEditing(false);
    setMessage('');
  }

  const initials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  if (loading && !user) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#c1121f" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Profile</Text>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || '?'}</Text>
        </View>

        <Text style={styles.name}>{user?.name || '—'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Username</Text>
          {editing ? (
            <>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="username"
                maxLength={30}
              />
              <View style={styles.row}>
                <Pressable style={styles.ghostBtn} onPress={cancelEdit} disabled={saving}>
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.primaryBtn} onPress={saveUsername} disabled={saving}>
                  <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.rowBetween}>
              <Text style={styles.cardValue}>
                {user?.username ? `@${user.username}` : 'Not set'}
              </Text>
              <Pressable onPress={() => setEditing(true)} hitSlop={8}>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Pressable style={styles.streakCard} onPress={onOpenStreak}>
          <View>
            <Text style={styles.streakLabel}>Current streak</Text>
            <Text style={styles.streakValue}>{user?.current_streak ?? 0} days</Text>
          </View>
          <Text style={styles.streakChevron}>›</Text>
        </Pressable>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
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
  scroll: {
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  heading: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#8a8a86',
    marginBottom: 28,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1c1c1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1c1a',
    letterSpacing: -0.4,
  },
  email: {
    marginTop: 6,
    fontSize: 15,
    color: '#6f6f6a',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
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
  cardValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1c1c1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1c1c1a',
    backgroundColor: '#fafafa',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c1121f',
  },
  ghostBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ghostBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6f6f6a',
  },
  primaryBtn: {
    backgroundColor: '#1c1c1a',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  streakCard: {
    backgroundColor: '#1c1c1a',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakLabel: {
    color: '#ffffff99',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  streakValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  streakChevron: {
    color: '#ffffff66',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  message: {
    marginTop: 16,
    textAlign: 'center',
    color: '#6f6f6a',
    fontSize: 14,
  },
});
