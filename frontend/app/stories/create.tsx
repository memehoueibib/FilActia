// app/stories/create.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '@/components/ui/Themed';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { router } from 'expo-router';
import { uploadFile } from '@/lib/fileUtils';
import { supabase } from '@/lib/supabase';
import { Video } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
 
const { width: SCREEN_WIDTH } = Dimensions.get('window');
 
type MediaType = 'image' | 'video' | null;
 
export default function CreateStoryScreen() {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
 
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera>(null);
  const videoRef = useRef<Video>(null);
 
  useEffect(() => {
    checkCameraPermissions();
  }, []);
 
  const checkCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(status === 'granted');
  };
 
  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 1,
      });
 
      if (!result.canceled && result.assets[0]) {
        setMediaUri(result.assets[0].uri);
        setMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
        setShowCamera(false);
      }
    } catch (error) {
      console.error('Error picking media:', error);
    }
  };
 
  const takePicture = async () => {
    if (!cameraRef.current) return;
 
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
      });
 
      setMediaUri(photo.uri);
      setMediaType('image');
      setShowCamera(false);
    } catch (error) {
      console.error('Error taking picture:', error);
    }
  };
 
  const handlePost = async () => {
    if (!session?.user || !mediaUri || !mediaType) return;
 
    try {
      setLoading(true);
 
      // Upload media file
      const uploadResult = await uploadFile(mediaUri, 'stories', session.user.id);
      if (uploadResult.error) throw uploadResult.error;
 
      // Calculate expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
 
      // Create story
      const { error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: session.user.id,
          media_url: uploadResult.url,
          media_type: mediaType,
          caption: caption.trim() || null,
          expires_at: expiresAt.toISOString(),
        });
 
      if (storyError) throw storyError;
 
      router.back();
    } catch (error) {
      console.error('Error creating story:', error);
    } finally {
      setLoading(false);
    }
  };
 
  if (showCamera && hasCameraPermission) {
    return (
      <View style={styles.container}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={Camera.Constants.Type.back}
        >
          <View style={[styles.cameraControls, { paddingTop: insets.top }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCamera(false)}
            >
              <FontAwesome name="times" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
 
          <View style={styles.cameraButtons}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </Camera>
      </View>
    );
  }
 
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView>
        {mediaUri ? (
          <View style={styles.previewContainer}>
            {mediaType === 'video' ? (
              <Video
                ref={videoRef}
                source={{ uri: mediaUri }}
                style={styles.preview}
                resizeMode="cover"
                shouldPlay
                isLooping
              />
            ) : (
              <Image
                source={{ uri: mediaUri }}
                style={styles.preview}
                resizeMode="cover"
              />
            )}
 
            <TouchableOpacity
              style={styles.removeMediaButton}
              onPress={() => {
                setMediaUri(null);
                setMediaType(null);
              }}
            >
              <FontAwesome name="times" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mediaButtons}>
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={pickMedia}
            >
              <FontAwesome name="image" size={32} color={Colors.light.tint} />
              <Text style={styles.mediaButtonText}>Choisir un média</Text>
            </TouchableOpacity>
 
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={() => setShowCamera(true)}
            >
              <FontAwesome name="camera" size={32} color={Colors.light.tint} />
              <Text style={styles.mediaButtonText}>Prendre une photo</Text>
            </TouchableOpacity>
          </View>
        )}
 
        {mediaUri && (
          <View style={styles.captionContainer}>
            <TextInput
              style={styles.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="Ajouter une légende..."
              placeholderTextColor="#999"
              multiline
              maxLength={200}
            />
          </View>
        )}
      </ScrollView>
 
      {mediaUri && (
        <TouchableOpacity
          style={[styles.postButton, loading && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome name="paper-plane" size={20} color="#fff" />
              <Text style={styles.postButtonText}>Publier la story</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  closeButton: {
    padding: 10,
  },
  cameraButtons: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  mediaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginTop: 40,
  },
  mediaButton: {
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.light.tint,
    borderRadius: 12,
    width: SCREEN_WIDTH * 0.4,
  },
  mediaButtonText: {
    marginTop: 10,
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '500',
  },
  previewContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 16/9,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionContainer: {
    padding: 20,
  },
  captionInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    margin: 20,
    padding: 15,
    borderRadius: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});