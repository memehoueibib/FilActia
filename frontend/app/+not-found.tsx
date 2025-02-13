// app/+not-found.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link, useRouter } from 'expo-router';

export default function NotFound() {
  const router = useRouter();

  const handleGoBack = () => {
    if (router.canGoBack()) {
      // s’il y a bien un écran précédent
      router.back();
    } else {
      // sinon on redirige vers une route existante (ex: l’accueil)
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>404 - Page introuvable</Text>

      {/* Lien vers l'accueil */}
      <Link href="/" style={styles.link}>
        Revenir à l'accueil
      </Link>

      {/* Bouton retour adaptatif */}
      <Text onPress={handleGoBack} style={styles.link}>
        Retour en arrière
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, alignItems: 'center', justifyContent: 'center' 
  },
  title: { 
    fontSize: 24, marginBottom: 20 
  },
  link: { 
    fontSize: 18, color: 'blue', marginTop: 10 
  },
});
