import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { View, Text } from './Themed';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome } from '@expo/vector-icons';

export default function CreatePost({ onPostCreated }: { onPostCreated: () => void }) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      let imageUrl = null;
      
      if (image) {
        const file = await fetch(image);
        const blob = await file.blob();
        const fileName = `post-image-${Date.now()}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, blob);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrl;
      }

      const { error: postError } = await supabase
        .from('posts')
        .insert([
          {
            content,
            image_url: imageUrl,
          }
        ]);

      if (postError) throw postError;

      setContent('');
      setImage(null);
      onPostCreated();

    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        multiline
        placeholder="What's on your mind?"
        value={content}
        onChangeText={setContent}
      />
      
      {image && (
        <Image source={{ uri: image }} style={styles.preview} />
      )}
      
      <View style={styles.actions}>
        <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
          <FontAwesome name="image" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.postButton, !content.trim() && styles.disabledButton]} 
          onPress={handlePost}
          disabled={!content.trim() || loading}
        >
          <Text style={styles.postButtonText}>
            {loading ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  input: {
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  iconButton: {
    padding: 10,
  },
  postButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});