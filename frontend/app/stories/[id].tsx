// app/stories/[id].tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/Themed';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { StoryWithRelations } from '@/types';
import { FontAwesome } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
 
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 secondes par story
 
export default function StoryViewer() {
  const { id } = useLocalSearchParams();
  const [stories, setStories] = useState<StoryWithRelations[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
 
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<Video>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTouchTime = useRef<number>(0);
 
  const currentStory = stories[activeIndex];
 
  useEffect(() => {
    fetchStories();
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);
 
  useEffect(() => {
    if (currentStory) {
      progressAnim.setValue(0);
      startProgress();
      markStoryAsSeen();
    }
  }, [activeIndex, currentStory]);
 
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setPaused(true);
        startTouchTime.current = Date.now();
      },
      onPanResponderRelease: (_, gestureState) => {
        const touchDuration = Date.now() - startTouchTime.current;
        setPaused(false);
 
        // Tap rapide
        if (touchDuration < 200 && Math.abs(gestureState.dx) < 10) {
          // Clic sur la moitié gauche de l’écran
          if (gestureState.x0 < SCREEN_WIDTH / 2) {
            handlePrevious();
          } else {
            handleNext();
          }
        }
        // Swipe horizontal
        else if (Math.abs(gestureState.dx) > SCREEN_WIDTH * 0.2) {
          if (gestureState.dx > 0) {
            handlePrevious();
          } else {
            handleNext();
          }
        }
      },
    })
  ).current;
 
  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          profile:profiles(*),
          views:story_views(
            *,
            profile:profiles(*)
          )
        `)
        .eq('user_id', id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });
 
      if (error) throw error;
      setStories(data || []);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };
 
  const startProgress = () => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });
  };
 
  const markStoryAsSeen = async () => {
    if (!session?.user || !currentStory) return;
 
    try {
      const { error } = await supabase
        .from('story_views')
        .upsert({
          story_id: currentStory.id,
          user_id: session.user.id,
        });
 
      if (error) throw error;
    } catch (error) {
      console.error('Error marking story as seen:', error);
    }
  };
 
  const handlePrevious = () => {
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    } else {
      router.back(); // Retour si on est au tout début
    }
  };
 
  const handleNext = () => {
    if (activeIndex < stories.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else {
      router.back(); // Retour si on est à la fin
    }
  };
 
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
 
  if (!currentStory) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Story non trouvée</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => router.back()}
        >
          <Text style={styles.errorButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }
 
  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      {...panResponder.panHandlers}
    >
      {/* Barre de progression en haut */}
      <View style={styles.progressContainer}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progress,
                {
                  width:
                    index === activeIndex
                      ? progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        })
                      : index < activeIndex
                      ? '100%'
                      : '0%',
                },
              ]}
            />
          </View>
        ))}
      </View>
 
      {/* En-tête : avatar + pseudo + bouton fermer */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent']}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.userInfo}>
          <Image
            source={{
              uri:
                currentStory.profile?.avatar_url ||
                'https://via.placeholder.com/40',
            }}
            style={styles.avatar}
          />
          <View style={styles.userInfoText}>
            <Text style={styles.username}>{currentStory.profile?.username}</Text>
            <Text style={styles.timestamp}>
              {formatDistanceToNow(new Date(currentStory.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </Text>
          </View>
        </View>
 
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <FontAwesome name="times" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>
 
      {/* Contenu de la Story (image ou vidéo) */}
      {currentStory.media_type === 'video' ? (
        <Video
          ref={videoRef}
          source={{ uri: currentStory.media_url }}
          style={styles.media}
          resizeMode="contain"
          shouldPlay={!paused}
          isLooping={false}
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded && status.didJustFinish) {
              handleNext();
            }
          }}
        />
      ) : (
        <Image
          source={{ uri: currentStory.media_url }}
          style={styles.media}
          resizeMode="contain"
        />
      )}
 
      {/* Légende éventuelle */}
      {currentStory.caption && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={styles.captionContainer}
        >
          <Text style={styles.caption}>{currentStory.caption}</Text>
        </LinearGradient>
      )}
 
      {/* Nombre de vues (si on est le propriétaire de la story) */}
      {currentStory.user_id === session?.user?.id && (
        <TouchableOpacity
          style={styles.viewsContainer}
          onPress={() => {
            // Si vous avez un fichier pour ça : /stories/[id]/views.tsx
            // router.push(`/stories/${currentStory.id}/views`);
            // Sinon, commentez ou supprimez cette ligne pour éviter l'erreur
          }}
        >
          <FontAwesome name="eye" size={16} color="#fff" />
          <Text style={styles.viewsCount}>
            {currentStory.views?.length || 0}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
 
// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  errorButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    zIndex: 100,
  },
  progressBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    zIndex: 99,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userInfoText: {
    flex: 1,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  closeButton: {
    padding: 5,
  },
  media: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  caption: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  viewsContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  viewsCount: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
  },
});