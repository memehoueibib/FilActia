// app/posts/edit/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  View as RNView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { View, Text } from '@/components/ui/Themed';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '@/lib/fileUtils';

export default function EditPostScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Vérifier que c'est bien le propriétaire du post
      if (data.user_id !== session?.user?.id) {
        Alert.alert('Erreur', 'Vous n\'avez pas l\'autorisation de modifier ce post');
        router.back();
        return;
      }

      setContent(data.content || '');
      if (data.file_url) {
        setFileUri(data.file_url);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      Alert.alert('Erreur', 'Impossible de charger la publication');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder à la galerie');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setFileUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', "Impossible de sélectionner l'image");
    }
  };

  const handleSave = async () => {
    if (!session?.user || !content.trim() || saving) return;

    setSaving(true);
    try {
      let file_url = fileUri;

      // Si une nouvelle image a été sélectionnée (l'URI ne commence pas par http)
      if (fileUri && !fileUri.startsWith('http')) {
        const uploadResult = await uploadFile(fileUri, 'posts', session.user.id);
        if (uploadResult.error) throw uploadResult.error;
        file_url = uploadResult.url;
      }

      const { error } = await supabase
        .from('posts')
        .update({
          content: content.trim(),
          file_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', session.user.id); // Sécurité supplémentaire

      if (error) throw error;

      Alert.alert('Succès', 'Publication mise à jour avec succès', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la publication');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={content}
        onChangeText={setContent}
        placeholder="Que voulez-vous partager ?"
        placeholderTextColor="#999"
        multiline
        maxLength={2000}
      />

      {fileUri && (
        <RNView style={styles.imageContainer}>
          <Image source={{ uri: fileUri }} style={styles.preview} />
          <TouchableOpacity
            style={styles.removeImage}
            onPress={() => setFileUri(null)}
          >
            <FontAwesome name="times-circle" size={24} color="#fff" />
          </TouchableOpacity>
        </RNView>
      )}

      <RNView style={styles.footer}>
        <TouchableOpacity
          style={styles.mediaButton}
          onPress={handlePickImage}
          disabled={saving}
        >
          <FontAwesome name="image" size={20} color={Colors.light.icon} />
          <Text style={styles.mediaButtonText}>Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!content.trim() || saving) && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!content.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </RNView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  imageContainer: {
    margin: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: 300,
    backgroundColor: '#f8f8f8',
  },
  removeImage: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  mediaButtonText: {
    marginLeft: 8,
    color: Colors.light.icon,
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});