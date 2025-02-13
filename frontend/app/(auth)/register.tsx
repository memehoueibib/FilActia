import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
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
      console.error('Erreur d\'inscription:', error);
      alert('Échec de l\'inscription. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Section logo et titre */}
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/images/logo-sombre.png')} style={styles.logo} />
        <Text style={styles.title}>Créer un compte</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Prénom"
        value={firstName}
        onChangeText={setFirstName}
      />

      <TextInput
        style={styles.input}
        placeholder="Nom"
        value={lastName}
        onChangeText={setLastName}
      />

      <TextInput
        style={styles.input}
        placeholder="Nom d'utilisateur"
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
        placeholder="Mot de passe"
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
          {loading ? 'Création du compte...' : 'S\'inscrire'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.link}>Vous avez déjà un compte ? Se connecter</Text>
      </TouchableOpacity>
    </View>
  );
}

// ----------------------
// Styles
// ----------------------
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
