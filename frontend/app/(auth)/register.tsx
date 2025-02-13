//app/(auth)/register.tsx


import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Text, View } from '../../components/ui/Themed';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Champs supplémentaires (facultatifs) :
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');

  const [loading, setLoading] = useState(false);

  // On récupère la fonction signUp depuis le AuthContext
  const { signUp } = useAuth();

  const handleRegister = async () => {
    try {
      setLoading(true);

      // 1) Créer l’utilisateur dans auth.users via le contexte
      const { error: signUpError } = await signUp(email, password);
      if (signUpError) {
        throw signUpError;
      }

      // 2) Récupérer la session (pour avoir user.id)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      const userId = sessionData.session?.user.id;
      if (!userId) {
        throw new Error('No user session found');
      }

      // 3) (Facultatif) Mettre à jour la ligne que le trigger vient de créer dans `profiles`.
      //    Le trigger a inséré 'id' + 'email' + des champs vides.
      //    Ici, on complète first_name, last_name, etc.
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          username,
          full_name: `${firstName} ${lastName}`,
          email,
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // 4) Rediriger vers l'onglet Feed
      router.replace('/(tabs)/feed');

    } catch (error) {
      console.error('Error registering:', error);
      alert('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        style={styles.input}
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
      />

      <TextInput
        style={styles.input}
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
      />

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

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
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Account...' : 'Register'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

// ----------------------
// Styles
// ----------------------
const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  title: {
    fontSize: 24, fontWeight: 'bold', marginBottom: 20,
  },
  input: {
    width: '100%', height: 40, borderWidth: 1, borderColor: '#ddd',
    borderRadius: 5, padding: 10, marginBottom: 10,
  },
  button: {
    width: '100%', backgroundColor: '#2196F3', padding: 15,
    borderRadius: 5, alignItems: 'center', marginTop: 10,
  },
  buttonText: { color: 'white', fontWeight: 'bold' },
  link: { color: '#2196F3', marginTop: 15 },
});
