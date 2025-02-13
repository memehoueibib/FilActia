// frontend/components/ui/Stories.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  Alert
} from 'react-native';
import { Text } from './Themed';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '@/lib/fileUtils';
import { Video } from 'expo-av';
import { router } from 'expo-router';
 
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_DURATION = 5000;
 
type Story = {
  id: string;
  user_id: string;
  media_url: string;     // stocké directement
  media_type: 'image' | 'video';
  user: {
    username: string;
    avatar_url: string | null;
  };
  seen: boolean;
  expires_at: string;
};
 
export default function Stories() {
  const { session } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  
  // Animations
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const swipeAnimation = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout>();
 
  useEffect(() => {
    fetchStories();
    subscribeToNewStories();
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
    };
  }, []);
 
  useEffect(() => {
    if (modalVisible && activeStory) {
      startProgress();
    } else {
      progressAnimation.setValue(0);
      timerRef.current && clearTimeout(timerRef.current);
    }
  }, [modalVisible, activeStory]);
 
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
          swipeAnimation.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > SCREEN_WIDTH * 0.4) {
          // swipe
          const direction = gesture.dx > 0 ? -1 : 1;
          Animated.timing(swipeAnimation, {
            toValue: direction * SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            swipeAnimation.setValue(0);
            handleStoryChange(direction);
          });
        } else {
          // retour
          Animated.spring(swipeAnimation, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;
 
  async function fetchStories() {
    if (!session?.user) return;
    try {
      // Récupérer mes follow
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id);
 
      const userIds = followData?.map(f => f.following_id) || [];
      userIds.push(session.user.id);
 
      // Récupération des stories
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          user:profiles(*)
        `)
        .in('user_id', userIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
 
      if (error) throw error;
 
      // Vérifier ce qui est vu
      const { data: seen } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('user_id', session.user.id);
 
      const seenSet = new Set(seen?.map(s => s.story_id));
 
      const result = data.map(st => ({
        ...st,
        seen: seenSet.has(st.id),
      }));
      setStories(result);
 
    } catch (err) {
      console.error('Erreur loading stories:', err);
      Alert.alert('Erreur', "Impossible de charger les stories");
    }
  }
 
  function subscribeToNewStories() {
    const subscription = supabase
      .channel('stories')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, () => {
        fetchStories();
      })
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }
 
  function startProgress() {
    progressAnimation.setValue(0);
    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleStoryChange(1);
      }
    });
    timerRef.current = setTimeout(() => {
      handleStoryChange(1);
    }, STORY_DURATION);
  }
 
  async function handleStoryChange(direction: number) {
    if (!activeStory) return;
 
    // marquer vu si pas encore
    if (!activeStory.seen) {
      try {
        await supabase
          .from('story_views')
          .insert({ story_id: activeStory.id, user_id: session?.user.id });
      } catch {}
    }
 
    const idx = stories.findIndex(s => s.id === activeStory.id);
    const nextIdx = idx + direction;
 
    if (nextIdx < 0) {
      // plus rien à gauche
      setModalVisible(false);
    } else if (nextIdx >= stories.length) {
      // plus rien à droite
      setModalVisible(false);
    } else {
      setActiveStory(stories[nextIdx]);
    }
  }
 
  async function handleAddStory() {
    if (!session?.user) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 1,
      });
 
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const isVideo = file.type === 'video';
 
        // upload
        const uploadResult = await uploadFile(file.uri, 'stories', session.user.id);
        if (uploadResult.error) throw uploadResult.error;
 
        // créer la story
        const { data: newStory, error } = await supabase
          .from('stories')
          .insert({
            user_id: session.user.id,
            media_url: uploadResult.url,
            media_type: isVideo ? 'video' : 'image',
            expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
 
        // re-fetch
        fetchStories();
      }
 
    } catch (err) {
      console.error('Add story error:', err);
      Alert.alert('Erreur', "Impossible d'ajouter la story");
    }
  }
 
  function renderFullScreen() {
    if (!activeStory) return null;
 
    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <Animated.View style={[styles.swipeContainer, { transform: [{ translateX: swipeAnimation }] }]} {...panResponder.panHandlers}>
            
            {/* barre de progression */}
            <View style={styles.progressRow}>
              <View style={[styles.progressBar]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            </View>
 
            {/* en‐tête */}
            <View style={styles.header}>
              <View style={styles.userRow}>
                <Image
                  source={{ uri: activeStory.user.avatar_url || 'https://via.placeholder.com/50' }}
                  style={styles.headerAvatar}
                />
                <Text style={styles.headerName}>{activeStory.user.username}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <FontAwesome name="times" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
 
            {/* contenu */}
            {activeStory.media_type === 'video' ? (
              <Video
                source={{ uri: activeStory.media_url }}
                style={styles.media}
                resizeMode="contain"
                shouldPlay={!paused}
                isLooping={false}
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded && status.didJustFinish) {
                    handleStoryChange(1);
                  }
                }}
              />
            ) : (
              <Image
                source={{ uri: activeStory.media_url }}
                style={styles.media}
                resizeMode="contain"
              />
            )}
 
          </Animated.View>
        </View>
      </Modal>
    );
  }
 
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
        
        <TouchableOpacity style={styles.addStory} onPress={handleAddStory}>
          <View style={styles.addBtn}>
            <FontAwesome name="plus" size={24} color={Colors.light.tint} />
          </View>
          <Text style={styles.addLabel}>Votre story</Text>
        </TouchableOpacity>
 
        {stories.map((story) => (
          <TouchableOpacity
            key={story.id}
            style={styles.thumbContainer}
            onPress={() => {
              setActiveStory(story);
              setModalVisible(true);
            }}
          >
            <View style={[styles.thumbRing, story.seen && styles.seenRing]}>
              <Image
                source={{ uri: story.user.avatar_url || 'https://via.placeholder.com/40' }}
                style={styles.thumb}
              />
            </View>
            <Text style={styles.thumbName} numberOfLines={1}>
              {story.user.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
 
      {renderFullScreen()}
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: {
    height: 100,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  storiesScroll: {
    padding: 10,
  },
  addStory: {
    alignItems: 'center',
    marginRight: 12,
  },
  addBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderStyle: 'dashed',
    borderColor: Colors.light.tint,
    borderWidth: 2,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  thumbContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  thumbRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.tint,
    padding: 2,
  },
  seenRing: {
    backgroundColor: '#ccc',
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  thumbName: {
    marginTop: 4,
    fontSize: 12,
    maxWidth: 60,
    color: '#666',
    textAlign: 'center',
  },
 
  modalBg: {
    flex: 1,
    backgroundColor: '#000',
  },
  swipeContainer: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    padding: 10,
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
  },
  progressBar: {
    flex: 1,
    height: 2,
    marginHorizontal: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 20, left: 0, right: 0,
    zIndex: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    alignItems: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40, height: 40,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 5,
  },
  media: {
    flex: 1,
    marginTop: 40,
  },
});
 