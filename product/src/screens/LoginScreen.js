import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
  // Values typed into the two inputs.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Text shown under the button after it is pressed.
  const [message, setMessage] = useState('');

  // TEMPORARY (Sprint 1): there is no backend yet, so this only checks that the
  // fields are filled and shows a message. In a later sprint this function will
  // send the email and password to our API, which will check them against the
  // database and tell us whether the login succeeded.
  function handleLogin() {
    if (email === '' || password === '') {
      setMessage('Please enter your email and password.');
      return;
    }

    setMessage('Login submitted');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AUP Productivity</Text>
      <Text style={styles.subtitle}>Log into your account</Text>

      <Text style={styles.label}>Email or Username</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="you@aup.edu"
        autoCapitalize="none"
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
  message: {
    marginTop: 16,
    textAlign: 'center',
    color: '#333',
  },
});
