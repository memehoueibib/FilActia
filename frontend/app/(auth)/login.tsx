import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { Text, View } from '../../components/ui/Themed';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import React from 'react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signIn(email, password);
      router.replace('/(tabs)/feed');
    } catch (error) {
      console.error('Erreur de connexion:', error);
      alert('Échec de la connexion. Veuillez vérifier vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Section logo et titre */}
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/images/logo-sombre.png')} style={styles.logo} />
        <Text style={styles.title}>Se connecter</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Chargement...' : 'Se connecter'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/register')}>
        <Text style={styles.link}>Vous n'avez pas de compte ? S'inscrire</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#f9F9F9',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 26, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 20,
  },
  input: {
    width: '100%', 
    height: 45, 
    borderWidth: 1, 
    borderColor: '#ccc',
    borderRadius: 8, 
    padding: 10, 
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  button: {
    width: '100%', 
    backgroundColor: '#4CAF50', 
    padding: 16,
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 12,
  },
  buttonText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  link: { 
    color: '#2196F3', 
    marginTop: 18, 
    fontSize: 14 
  },
});
