import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_URL } from '../api';

export default function LoginScreen({ onLoginSuccess, onCreateAccount }) {
  // Values typed into the two inputs.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Text shown under the button after it is pressed.
  const [message, setMessage] = useState('');

  // Sends the email and password to the backend, which checks them
  // against the database
  async function handleLogin() {
    if (email === '' || password === '') {
      setMessage('Please enter your email and password.');
      return;
    }

    try {
      const response = await fetch(API_URL + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      });
      const data = await response.json();

      if (!response.ok) {
        // the backend sends the error message in "detail"
        setMessage(data.detail);
        return;
      }

      onLoginSuccess(data.access_token);
    } catch (error) {
      setMessage('Could not connect to the server.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AUP Productivity</Text>
      <Text style={styles.subtitle}>Log into your account</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="you@aup.edu"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log In</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={onCreateAccount}>
        <Text style={styles.secondaryButtonText}>Create Account</Text>
      </Pressable>

      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1e3a8a',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#1e3a8a',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#1e3a8a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    marginTop: 16,
    textAlign: 'center',
    color: '#333',
  },
});
