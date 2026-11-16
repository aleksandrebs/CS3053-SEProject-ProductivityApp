import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getRewards, redeemReward, getRedemptions } from './TokenApi';
import PopupAlert from '../components/PopupAlert';

export default function RedeemScreen() {
  const [balance, setBalance] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });

  function showAlert(title, message) {
    setAlert({ visible: true, title, message });
  }

  const load = useCallback(async () => {
    const [catalog, past] = await Promise.all([getRewards(), getRedemptions()]);
    setBalance(catalog.token_balance ?? 0);
    setRewards(catalog.items || []);
    setHistory(past.items || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e) {
        if (!cancelled) showAlert('Could not load', e.message || 'Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      showAlert('Could not refresh', e.message || 'Try again.');
    } finally {
      setRefreshing(false);
    }
  }

  async function onRedeem(reward) {
    if (busyId) return;
    if (balance < reward.token_cost) {
      showAlert(
        'Not enough tokens',
        `You need ${reward.token_cost} tokens for ${reward.name}. You have ${balance}.`
      );
      return;
    }

    setBusyId(reward.id);
    try {
      const result = await redeemReward(reward.id);
      setBalance(result.token_balance);
      await load();
      const code = result.redemption?.code || '';
      showAlert(
        'Redeemed',
        `${reward.name} is yours.\n\nShow this code:\n${code}`
      );
    } catch (e) {
      showAlert('Redeem failed', e.message || 'Could not redeem.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#006FCF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rewards}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#006FCF" />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>Redeem</Text>
            <Text style={styles.subheading}>Campus café & Amex gift cards</Text>

            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Your tokens</Text>
              <Text style={styles.balanceValue}>{balance}</Text>
            </View>

            <Text style={styles.sectionTitle}>Available</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No rewards available.</Text>}
        renderItem={({ item }) => {
          const canBuy = balance >= item.token_cost;
          const busy = busyId === item.id;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.amexTag}>
                  <Text style={styles.amexTagText}>AMEX</Text>
                </View>
                <Text style={styles.cost}>{item.token_cost} tokens</Text>
              </View>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
              <Pressable
                style={[styles.buyBtn, !canBuy && styles.buyBtnOff]}
                onPress={() => onRedeem(item)}
                disabled={busy}
              >
                <Text style={styles.buyBtnText}>
                  {busy ? 'Redeeming…' : canBuy ? 'Redeem' : 'Need more tokens'}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListFooterComponent={
          history.length > 0 ? (
            <View style={styles.historyWrap}>
              <Text style={styles.sectionTitle}>Your codes</Text>
              {history.map((row) => (
                <View key={row.id} style={styles.historyCard}>
                  <Text style={styles.historyName}>{row.reward_name}</Text>
                  <Text style={styles.historyCode}>{row.code}</Text>
                  <Text style={styles.historyMeta}>{row.token_cost} tokens</Text>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      <PopupAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ visible: false, title: '', message: '' })}
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
  balanceCard: {
    backgroundColor: '#006FCF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
  },
  balanceLabel: {
    color: '#ffffffcc',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  balanceValue: {
    marginTop: 6,
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#8a8a86',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e2',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  amexTag: {
    backgroundColor: '#006FCF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  amexTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cost: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1c1c1a',
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1c1a',
  },
  cardDesc: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 14,
    color: '#6f6f6a',
    lineHeight: 20,
  },
  buyBtn: {
    backgroundColor: '#1c1c1a',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyBtnOff: {
    backgroundColor: '#c8c8c4',
  },
  buyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  historyWrap: {
    marginTop: 20,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e2',
  },
  historyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1c1c1a',
  },
  historyCode: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#006FCF',
    letterSpacing: 0.3,
  },
  historyMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#8a8a86',
  },
  empty: {
    textAlign: 'center',
    color: '#8a8a86',
    marginTop: 16,
    fontSize: 15,
  },
});
