import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  { key: 'leaderboard', label: 'Board', icon: 'trophy-outline', iconActive: 'trophy' },
  { key: 'timer', label: 'Timer', icon: 'timer-outline', iconActive: 'timer' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

export default function BottomTabBar({ activeTab, onChangeTab }) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.shell}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 60 : 85}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.tint} />
        <View style={styles.edge} />

        <View style={styles.row}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={styles.tab}
                onPress={() => onChangeTab(tab.key)}
              >
                <View style={[styles.pill, active && styles.pillOn]}>
                  <Ionicons
                    name={active ? tab.iconActive : tab.icon}
                    size={20}
                    color={active ? '#111' : '#11111188'}
                  />
                  <Text style={[styles.label, active && styles.labelOn]}>{tab.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingBottom: Platform.OS === 'ios' ? 26 : 16,
  },
  shell: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  edge: {
    position: 'absolute',
    top: 0.5,
    left: 18,
    right: 18,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  pillOn: {
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#11111188',
  },
  labelOn: {
    color: '#111',
  },
});
