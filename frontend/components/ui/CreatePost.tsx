// frontend/components/ui/CreatePost.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  View as RNView,
  Platform,
} from 'react-native';
import { View, Text } from './Themed';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import { uploadFile } from '@/lib/fileUtils';

type Props = {
  onPostCreated?: () => void; // callback
};

export default function CreatePost({ onPostCreated }: Props) {
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePickFile() {
    try {
      // Demander la permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission required to pick an image!');
        return;
      }

      // Ouvrir la galerie
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // <-- Correction
        allowsEditing: true,
        quality: 1,
      });

      // S'il y a une image sélectionnée
      if (!result.canceled && result.assets[0]?.uri) {
        setFileUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking file:', error);
    }
  }

  async function handleCreatePost() {
    if (!session?.user || !content.trim()) {
      alert('Please enter some content');
      return;
    }

    setLoading(true);

    try {
      let file_url = null;

      // Upload si on a choisi un fichier
      if (fileUri) {
        const uploadResult = await uploadFile(fileUri, 'posts', session.user.id);
        if (uploadResult.error) throw uploadResult.error;
        file_url = uploadResult.url;
      }

      // Insérer le post dans la DB
      const { error } = await supabase.from('posts').insert({
        user_id: session.user.id,
        content: content.trim(),
        file_url,
      });
      if (error) throw error;

      // Reset
      setContent('');
      setFileUri(null);
      onPostCreated?.();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <RNView style={styles.header}>
        <Image
          source={{
            uri:
              session?.user?.user_metadata?.avatar_url ||
              'https://via.placeholder.com/100',
          }}
          style={styles.avatar}
        />
        <TextInput
          style={styles.input}
          placeholder="Share something..."
          placeholderTextColor={Colors.light.icon}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={3}
        />
      </RNView>

      {fileUri && (
        <RNView style={styles.imageContainer}>
          <Image source={{ uri: fileUri }} style={styles.preview} />
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
            {loading ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </RNView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 15,
    margin: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  input: {
    flex: 1,
    minHeight: 80,
    fontSize: 16,
    color: Colors.light.text,
    textAlignVertical: 'top',
  },
  imageContainer: { marginTop: 12, borderRadius: 8, overflow: 'hidden' },
  preview: { width: '100%', height: 200, borderRadius: 8 },
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
  },
  mediaButtonText: { marginLeft: 8, color: Colors.light.icon, fontSize: 14 },
  postButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  postButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});