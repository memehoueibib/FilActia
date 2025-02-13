// app/(tabs)/profile.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Animated,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../components/ui/Themed';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Profile, Post } from '@/types';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import PostCard from '@/components/ui/PostCard';

const HEADER_MAX_HEIGHT = 320;
const HEADER_MIN_HEIGHT = 84;
const PROFILE_IMAGE_MAX_SIZE = 100;
const PROFILE_IMAGE_MIN_SIZE = 40;

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedTab, setSelectedTab] = useState<'posts' | 'photos' | 'favorites'>('posts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { width: WINDOW_WIDTH } = Dimensions.get('window');

  // Animations
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const profileImageSize = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [PROFILE_IMAGE_MAX_SIZE, PROFILE_IMAGE_MIN_SIZE],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const profileImageMarginTop = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [HEADER_MAX_HEIGHT - PROFILE_IMAGE_MAX_SIZE / 2, 24],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
      fetchPosts();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, followers:follows!follows_following_id_fkey(count), following:follows!follows_follower_id_fkey(count)')
        .eq('id', session?.user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profile:profiles(*),
          likes(count),
          comments(count)
        `)
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchPosts();
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const renderHeader = () => (
    <Animated.View style={[styles.header, { height: headerHeight }]}>
      <Animated.Image
        source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/200' }}
        style={[
          styles.backgroundImage,
          { opacity: headerOpacity }
        ]}
      />
      
      <Animated.View style={[styles.profileInfo, { opacity: headerOpacity }]}>
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push(`/profile/${profile?.id}/followers`)}
          >
            <Text style={styles.statNumber}>{profile?.followers[0]?.count || 0}</Text>
            <Text style={styles.statLabel}>Abonnés</Text>
          </TouchableOpacity>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Publications</Text>
          </View>

          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push(`/profile/${profile?.id}/following`)}
          >
            <Text style={styles.statNumber}>{profile?.following[0]?.count || 0}</Text>
            <Text style={styles.statLabel}>Abonnements</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.Image
        source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/100' }}
        style={[
          styles.profileImage,
          {
            width: profileImageSize,
            height: profileImageSize,
            borderRadius: profileImageSize,
            marginTop: profileImageMarginTop,
          },
        ]}
      />
    </Animated.View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'posts' && styles.activeTab]}
        onPress={() => setSelectedTab('posts')}
      >
        <FontAwesome
          name="th"
          size={24}
          color={selectedTab === 'posts' ? Colors.light.tint : Colors.light.icon}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'photos' && styles.activeTab]}
        onPress={() => setSelectedTab('photos')}
      >
        <FontAwesome
          name="image"
          size={24}
          color={selectedTab === 'photos' ? Colors.light.tint : Colors.light.icon}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'favorites' && styles.activeTab]}
        onPress={() => setSelectedTab('favorites')}
      >
        <FontAwesome
          name="bookmark"
          size={24}
          color={selectedTab === 'favorites' ? Colors.light.tint : Colors.light.icon}
        />
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      );
    }

    const filteredPosts = posts.filter(post => {
      if (selectedTab === 'photos') {
        return post.file_url && ['image', 'video'].includes(post.media_type || '');
      }
      return true;
    });

    return (
      <FlatList
        data={filteredPosts}
        renderItem={({ item }) => <PostCard post={item} onRefresh={fetchPosts} />}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome
              name={selectedTab === 'photos' ? 'image' : 'file-text-o'}
              size={48}
              color={Colors.light.icon}
            />
            <Text style={styles.emptyText}>
              {selectedTab === 'photos'
                ? 'Aucune photo ou vidéo'
                : 'Aucune publication'}
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.light.tint}
          />
        }
      >
        {renderHeader()}

        <View style={styles.profileDetails}>
          <Text style={styles.fullName}>{profile?.full_name}</Text>
          <Text style={styles.username}>@{profile?.username}</Text>
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          {profile?.website && (
            <TouchableOpacity>
              <Text style={styles.website}>{profile.website}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditProfile}
            >
              <FontAwesome name="edit" size={16} color="#fff" />
              <Text style={styles.editButtonText}>Modifier le profil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <FontAwesome name="sign-out" size={16} color="#666" />
              <Text style={styles.logoutButtonText}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderTabs()}
        {renderContent()}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MAX_HEIGHT,
    width: '100%',
  },
  profileImage: {
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileInfo: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    height: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 30,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
  },
  profileDetails: {
    padding: 20,
  },
  fullName: {
    fontSize: 24,
    fontWeight: '600',
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  bio: {
    fontSize: 16,
    marginTop: 12,
    lineHeight: 22,
  },
  website: {
    fontSize: 16,
    color: Colors.light.tint,
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  editButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: '#666',
    marginLeft: 8,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
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
    borderBottomColor: Colors.light.tint,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
});