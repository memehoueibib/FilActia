// frontend/components/ui/EnhancedProfile.tsx
// Composant de profil utilisateur amélioré avec édition et statistiques

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  Animated,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Text } from './Themed';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Profile, Post } from '@/types';
import PostCard from './PostCard';
import { uploadFile } from '@/lib/fileUtils';

// Types additionnels
interface UserStats {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  likesReceived: number;
}

interface ExtendedProfile extends Profile {
  followed_by_count?: number;
  following_count?: number;
  total_likes?: number;
}

type TabType = 'posts' | 'media' | 'likes';

interface EnhancedProfileProps {
  userId: string;
  isOwnProfile?: boolean;
  onProfileUpdate?: () => void;
}

export default function EnhancedProfile({
  userId,
  isOwnProfile = false,
  onProfileUpdate
}: EnhancedProfileProps) {
  // États
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<Profile>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<UserStats>({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    likesReceived: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [showImageOptions, setShowImageOptions] = useState(false);

  // Refs pour les animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = useRef(new Animated.Value(250)).current;

  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  // Effets
  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchUserStats();
      checkFollowStatus();
    }
  }, [userId]);

  // Animation du header
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 250],
    outputRange: [0, -150],
    extrapolate: 'clamp'
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  // Récupérer le profil
  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          followed_by:follows!follows_following_id_fkey(count),
          following:follows!follows_follower_id_fkey(count),
          total_likes:posts(sum(likes_count))
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile({
        ...data,
        followed_by_count: data.followed_by?.[0]?.count || 0,
        following_count: data.following?.[0]?.count || 0,
        total_likes: data.total_likes?.[0]?.sum || 0
      });

      if (isEditing) {
        setEditedProfile({
          username: data.username,
          full_name: data.full_name,
          bio: data.bio
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      Alert.alert('Erreur', 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les statistiques
  const fetchUserStats = async () => {
    try {
      const [posts, followers, following, likes] = await Promise.all([
        supabase
          .from('posts')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('following_id', userId),
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('follower_id', userId),
        supabase
          .from('likes')
          .select('id', { count: 'exact' })
          .eq('post_id', supabase.from('posts').select('id').eq('user_id', userId))
      ]);

      setStats({
        postsCount: posts.count || 0,
        followersCount: followers.count || 0,
        followingCount: following.count || 0,
        likesReceived: likes.count || 0
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  // Vérifier le statut du suivi
  const checkFollowStatus = async () => {
    if (!session?.user || userId === session.user.id) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', session.user.id)
        .eq('following_id', userId)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Erreur lors de la vérification du suivi:', error);
    }
  };

  // Gérer le suivi/désabonnement
  const handleFollowToggle = async () => {
    if (!session?.user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour suivre un utilisateur');
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', userId);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: session.user.id,
            following_id: userId
          });
      }

      setIsFollowing(!isFollowing);
      fetchUserStats();
    } catch (error) {
      console.error('Erreur lors du suivi/désabonnement:', error);
      Alert.alert('Erreur', 'Impossible de modifier le suivi');
    }
  };

  // Gérer le changement d'image de profil
  const handleImagePick = async () => {
    if (!session?.user) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        const uploadResult = await uploadFile(uri, 'avatars', session.user.id);
        
        if (uploadResult.error) throw uploadResult.error;
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: uploadResult.url })
          .eq('id', session.user.id);

        if (updateError) throw updateError;

        fetchProfile();
      }
    } catch (error) {
      console.error('Erreur lors du changement d\'image:', error);
      Alert.alert('Erreur', 'Impossible de changer l\'image de profil');
    }
  };

  // Sauvegarder les modifications du profil
  const handleSaveProfile = async () => {
    if (!session?.user || !editedProfile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editedProfile.username,
          full_name: editedProfile.full_name,
          bio: editedProfile.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (error) throw error;

      setIsEditing(false);
      fetchProfile();
      onProfileUpdate?.();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    }
  };

  // Charger les posts selon l'onglet actif
  const fetchPosts = async () => {
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profile:profiles(*),
          likes(count),
          comments(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (activeTab === 'media') {
        query = query.not('file_url', 'is', null);
      } else if (activeTab === 'likes') {
        query = supabase
          .from('likes')
          .select(`
            post:posts(
              *,
              profile:profiles(*),
              likes(count),
              comments(count)
            )
          `)
          .eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(activeTab === 'likes' ? data.map(item => item.post) : data);
    } catch (error) {
      console.error('Erreur lors du chargement des posts:', error);
      Alert.alert('Erreur', 'Impossible de charger les posts');
    }
  };

  // Rendu des statistiques
  const renderStats = () => (
    <View style={styles.statsContainer}>
      <TouchableOpacity 
        style={styles.statItem}
        onPress={() => router.push(`/profile/${userId}/followers`)}
      >
        <Text style={styles.statNumber}>{stats.followersCount}</Text>
        <Text style={styles.statLabel}>Abonnés</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.statItem}
        onPress={() => router.push(`/profile/${userId}/following`)}
      >
        <Text style={styles.statNumber}>{stats.followingCount}</Text>
        <Text style={styles.statLabel}>Abonnements</Text>
      </TouchableOpacity>

      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.postsCount}</Text>
        <Text style={styles.statLabel}>Publications</Text>
      </View>

      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.likesReceived}</Text>
        <Text style={styles.statLabel}>J'aime reçus</Text>
      </View>
    </View>
  );

  // Rendu des onglets
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
        onPress={() => setActiveTab('posts')}
      >
        <FontAwesome
          name="th-large"
          size={24}
          color={activeTab === 'posts' ? Colors.light.tint : '#999'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'media' && styles.activeTab]}
        onPress={() => setActiveTab('media')}
      >
        <FontAwesome
          name="picture-o"
          size={24}
          color={activeTab === 'media' ? Colors.light.tint : '#999'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'likes' && styles.activeTab]}
        onPress={() => setActiveTab('likes')}
      >
        <FontAwesome
          name="heart-o"
          size={24}
          color={activeTab === 'likes' ? Colors.light.tint : '#999'}
        />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              transform: [{ translateY: headerTranslateY }],
              opacity: headerOpacity
            }
          ]}
        >
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => isOwnProfile && setShowImageOptions(true)}
          >
            <Image
              source={{
                uri: profile?.avatar_url || 'https://via.placeholder.com/150'
              }}
              style={styles.avatar}
            />
            {isOwnProfile && (
              <View style={styles.editAvatarButton}>
                <FontAwesome name="camera" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editedProfile.username}
                onChangeText={text => 
                  setEditedProfile(prev => ({ ...prev, username: text }))
                }
                placeholder="Nom d'utilisateur"
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.editInput, styles.bioInput]}
                value={editedProfile.bio}
                onChangeText={text => 
                  setEditedProfile(prev => ({ ...prev, bio: text }))
                }
                placeholder="Bio"
                placeholderTextColor="#999"
                multiline
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.editButton, styles.saveButton]}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.editButtonText}>Sauvegarder</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={[styles.editButtonText, styles.cancelButtonText]}>
                    Annuler
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{profile?.full_name}</Text>
              <Text style={styles.username}>@{profile?.username}</Text>
              {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

              {isOwnProfile ? (
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => setIsEditing(true)}
                >
                  <FontAwesome name="edit" size={16} color="#fff" />
                  <Text style={styles.editProfileButtonText}>
                    Modifier le profil
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    isFollowing && styles.followingButton
                  ]}
                  onPress={handleFollowToggle}
                >
                  <Text style={[
                    styles.followButtonText,
                    isFollowing && styles.followingButtonText
                  ]}>
                    {isFollowing ? 'Abonné' : 'Suivre'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>

        {/* Statistiques */}
        {renderStats()}

        {/* Tabs et contenu */}
        {renderTabs()}
        <View style={styles.contentContainer}>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onRefresh={fetchPosts}
            />
          ))}
        </View>
      </Animated.ScrollView>

      {/* Modal pour les options de photo */}
      <Modal
        visible={showImageOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImageOptions(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleImagePick}
            >
              <FontAwesome name="photo" size={24} color={Colors.light.tint} />
              <Text style={styles.modalButtonText}>
                Choisir depuis la galerie
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonDanger]}
              onPress={async () => {
                try {
                  await supabase
                    .from('profiles')
                    .update({ avatar_url: null })
                    .eq('id', session?.user?.id);
                  
                  fetchProfile();
                  setShowImageOptions(false);
                } catch (error) {
                  console.error('Erreur lors de la suppression de l\'avatar:', error);
                  Alert.alert('Erreur', 'Impossible de supprimer l\'avatar');
                }
              }}
            >
              <FontAwesome name="trash" size={24} color="#ff4444" />
              <Text style={[styles.modalButtonText, styles.modalButtonTextDanger]}>
                Supprimer la photo
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.light.tint,
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: Colors.light.tint,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  bio: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editProfileButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  followButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  followButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  followingButtonText: {
    color: Colors.light.tint,
  },
  editContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
  },
  cancelButton: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderColor: Colors.light.tint,
  },
  contentContainer: {
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f8f8f8',
  },
  modalButtonDanger: {
    backgroundColor: '#fff0f0',
  },
  modalButtonText: {
    marginLeft: 15,
    fontSize: 16,
    color: Colors.light.tint,
  },
  modalButtonTextDanger: {
    color: '#ff4444',
  },
});
