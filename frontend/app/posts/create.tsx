// app/posts/create.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  View as RNView,
  Platform,
  Alert,
} from 'react-native';
import { View, Text } from '@/components/ui/Themed';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import { uploadFile } from '@/lib/fileUtils';
import { router } from 'expo-router';

export default function CreatePost() {
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePickFile() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder à la galerie');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setFileUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Erreur', "Impossible de sélectionner l'image");
    }
  }

  async function handleCreatePost() {
    if (!session?.user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour publier');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Erreur', 'Veuillez ajouter du contenu à votre publication');
      return;
    }

    setLoading(true);

    try {
      let file_url = null;

      if (fileUri) {
        const uploadResult = await uploadFile(fileUri, 'posts', session.user.id);
        if (uploadResult.error) throw uploadResult.error;
        file_url = uploadResult.url;
      }

      const { error } = await supabase.from('posts').insert({
        user_id: session.user.id,
        content: content.trim(),
        file_url,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Afficher un message de succès
      Alert.alert(
        'Succès',
        'Votre publication a été créée avec succès !',
        [
          {
            text: 'OK',
            onPress: () => {
              // Retourner au feed et le rafraîchir
              router.push('/(tabs)/feed');
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Erreur', 'Impossible de créer la publication');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <RNView style={styles.header}>
        <Image
          source={{
            uri: session?.user?.user_metadata?.avatar_url || 'https://via.placeholder.com/100'
          }}
          style={styles.avatar}
        />
        <TextInput
          style={styles.input}
          placeholder="Que voulez-vous partager ?"
          placeholderTextColor={Colors.light.icon}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={3}
          maxLength={500}
        />
      </RNView>

      {fileUri && (
        <RNView style={styles.imageContainer}>
          <Image 
            source={{ uri: fileUri }} 
            style={styles.preview}
            key={fileUri} // Clé unique basée sur l'URI
          />
          <TouchableOpacity
            style={styles.removeImage}
            onPress={() => setFileUri(null)}
          >
            <FontAwesome name="times-circle" size={24} color={Colors.light.background} />
          </TouchableOpacity>
        </RNView>
      )}

      <RNView style={styles.footer}>
        <TouchableOpacity
          style={styles.mediaButton}
          onPress={handlePickFile}
          disabled={loading}
        >
          <FontAwesome name="image" size={20} color={Colors.light.icon} />
          <Text style={styles.mediaButtonText}>Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.postButton, loading && styles.buttonDisabled]}
          onPress={handleCreatePost}
          disabled={loading || !content.trim()}
        >
          <Text style={styles.postButtonText}>
            {loading ? 'Publication...' : 'Publier'}
          </Text>
        </TouchableOpacity>
      </RNView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'flex-start',
    padding: 15,
  },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 12 
  },
  input: {
    flex: 1,
    minHeight: 80,
    fontSize: 16,
    color: Colors.light.text,
    textAlignVertical: 'top',
  },
  imageContainer: { 
    margin: 15,
    borderRadius: 8, 
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
  },
  preview: { 
    width: '100%', 
    height: 300, 
    borderRadius: 8 
  },
  removeImage: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
  },
  mediaButtonText: { 
    marginLeft: 8, 
    color: Colors.light.icon, 
    fontSize: 14 
  },
  postButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  buttonDisabled: { 
    opacity: 0.6 
  },
  postButtonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 14 
  },
});