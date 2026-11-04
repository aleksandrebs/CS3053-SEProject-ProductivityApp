import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { API_URL } from '../api';
import PopupAlert from '../components/PopupAlert';

function errorText(detail) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || String(d)).join('\n');
  return 'Something went wrong.';
}

export default function SignUpScreen({ onSignUp, onBackToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });
  const [busy, setBusy] = useState(false);

  function showError(title, message) {
    setAlert({ visible: true, title, message });
  }

  async function handleSignUp() {
    if (name === '' || email === '' || password === '' || confirmPassword === '') {
      showError('Missing details', 'Please fill in all the fields.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match', 'Check both password fields and try again.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(API_URL + '/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: password }),
      });
      const data = await response.json();

      if (!response.ok) {
        showError('Sign up failed', errorText(data.detail));
        return;
      }

      onSignUp();
    } catch (error) {
      showError('Connection error', 'Could not connect to the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Text style={styles.markText}>AUP</Text>
          </View>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            Join with your AUP email and start building a streak.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#a3a39e"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@aup.edu"
            placeholderTextColor="#a3a39e"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor="#a3a39e"
            secureTextEntry
          />

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Type your password again"
            placeholderTextColor="#a3a39e"
            secureTextEntry
          />

          <Pressable
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={busy}
          >
            <Text style={styles.buttonText}>{busy ? 'Creating…' : 'Sign Up'}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.linkBtn} onPress={onBackToLogin}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkStrong}>Log in</Text>
          </Text>
        </Pressable>
      </ScrollView>

      <PopupAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ visible: false, title: '', message: '' })}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6f6f4',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#c1121f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  markText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1c1c1a',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6f6f6a',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e6e2',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a8a86',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e6e6e2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1c1c1a',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1c1c1a',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkBtn: {
    marginTop: 22,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 15,
    color: '#6f6f6a',
  },
  linkStrong: {
    color: '#c1121f',
    fontWeight: '700',
  },
});
