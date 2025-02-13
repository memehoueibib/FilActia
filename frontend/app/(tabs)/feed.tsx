// app/(tabs)/feed.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Animated,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  TouchableOpacity,
  StyleSheet,
  Image
} from 'react-native';
import { Text } from '@/components/ui/Themed';
import PostCard from '@/components/ui/PostCard';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Stories from '@/components/ui/Stories';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastPostRef = useRef<string | null>(null);

  const POSTS_PER_PAGE = 10;

  const fetchPosts = async (loadMore = false) => {
    if (!hasMore && loadMore) return;
    
    try {
      setError(null);
      if (!loadMore) setLoading(true);
      if (loadMore) setLoadingMore(true);

      let query = supabase
        .from('posts')
        .select(`
          *,
          profile:profiles(*),
          likes(count),
          comments(count)
        `)
        .order('created_at', { ascending: false })
        .limit(POSTS_PER_PAGE);

      if (loadMore && lastPostRef.current) {
        query = query.lt('created_at', lastPostRef.current);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        if (data.length < POSTS_PER_PAGE) {
          setHasMore(false);
        }

        if (data.length > 0) {
          lastPostRef.current = data[data.length - 1].created_at;
        }

        setPosts(prev => loadMore ? [...prev, ...data] : data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Unable to load posts. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [])
  );
  const handleRefresh = () => {
    setRefreshing(true);
    lastPostRef.current = null;
    setHasMore(true);
    fetchPosts();
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(true);
    }
  };

  const renderHeader = useCallback(() => {
    return (
      <View style={styles.headerContainer}>
        <Stories />
        
        {/* Bouton de création de post */}
        <TouchableOpacity 
          style={styles.createPostButton}
          onPress={() => router.push('/posts/create')}
        >
          <View style={styles.createPostContent}>
            <Image
              source={{
                uri: session?.user?.user_metadata?.avatar_url || 'https://via.placeholder.com/40'
              }}
              style={styles.avatar}
            />
            <View style={styles.createPostInput}>
              <Text style={styles.createPostPlaceholder}>Que voulez-vous partager ?</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [session]);

  const renderPost = useCallback(({ item }: { item: Post }) => {
    return <PostCard post={item} onRefresh={handleRefresh} />;
  }, []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.light.tint}
            colors={[Colors.light.tint]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => (
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={Colors.light.tint} />
            </View>
          ) : null
        )}
        ListEmptyComponent={() => (
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.tint} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Aucune publication pour le moment.{'\n'}
                Suivez des personnes pour voir leurs publications ici !
              </Text>
            </View>
          )
        )}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 70,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  createPostButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  createPostContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  createPostInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    padding: 12,
  },
  createPostPlaceholder: {
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginBottom: 10,
    textAlign: 'center',
    color: '#ff4444',
  },
  retryButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingMore: {
    padding: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});