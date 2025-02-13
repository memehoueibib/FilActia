// app/(tabs)/explore.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import { Text } from '../../components/ui/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Post, Profile } from '@/types';
import PostCard from '@/components/ui/PostCard';
import { useDebounce } from '@/hooks/useDebounce';
import { router } from 'expo-router';

type SearchResult = {
  type: 'user' | 'post' | 'hashtag';
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  data?: any;
};

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'latest' | 'photos' | 'users'>('trending');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [trendingHashtags, setTrendingHashtags] = useState<string[]>([]);

  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const debouncedSearch = useDebounce(searchQuery, 300);

  const scrollY = new Animated.Value(0);
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [120, 60],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    fetchTrendingHashtags();
  }, []);

  useEffect(() => {
    if (debouncedSearch) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [debouncedSearch]);

  const fetchTrendingHashtags = async () => {
    try {
      const { data, error } = await supabase.rpc('get_trending_hashtags', {
        p_hours: 24,
        p_limit: 10
      });

      if (error) throw error;
      setTrendingHashtags(data.map(item => item.hashtag));
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
    }
  };

  const performSearch = async () => {
    if (!debouncedSearch.trim()) return;
    setLoading(true);

    try {
      const [usersResponse, postsResponse] = await Promise.all([
        // Recherche d'utilisateurs
        supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${debouncedSearch}%,full_name.ilike.%${debouncedSearch}%`)
          .limit(5),

        // Recherche de posts
        supabase
          .from('posts')
          .select(`
            *,
            profile:profiles(*),
            likes(count),
            comments(count)
          `)
          .textSearch('content', debouncedSearch)
          .limit(5)
      ]);

      const searchResults: SearchResult[] = [];

      // Ajouter les résultats d'utilisateurs
      if (usersResponse.data) {
        searchResults.push(
          ...usersResponse.data.map(user => ({
            type: 'user' as const,
            id: user.id,
            title: user.username,
            subtitle: user.full_name,
            imageUrl: user.avatar_url,
            data: user,
          }))
        );
      }

      // Ajouter les résultats de posts
      if (postsResponse.data) {
        searchResults.push(
          ...postsResponse.data.map(post => ({
            type: 'post' as const,
            id: post.id,
            title: post.content?.slice(0, 100) || '',
            subtitle: `Par @${post.profile.username}`,
            imageUrl: post.file_url,
            data: post,
          }))
        );
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrendingHashtags().finally(() => setRefreshing(false));
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const handlePress = () => {
      if (item.type === 'user') {
        router.push(`/profile/${item.id}`);
      } else if (item.type === 'post') {
        router.push(`/posts/${item.id}`);
      }
    };

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.resultImage}
          />
        )}
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={styles.resultSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          )}
        </View>
        <FontAwesome name="chevron-right" size={16} color="#ccc" />
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <Animated.View style={[styles.header, { height: headerHeight }]}>
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <FontAwesome name="times-circle" size={16} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {['trending', 'latest', 'photos', 'users'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {renderHeader()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : (
        <FlatList
          data={searchQuery ? results : []}
          renderItem={renderSearchResult}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              {!searchQuery ? (
                <View style={styles.trendingContainer}>
                  <Text style={styles.trendingTitle}>Tendances du moment</Text>
                  <View style={styles.trendingTags}>
                    {trendingHashtags.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={styles.tagContainer}
                        onPress={() => setSearchQuery(tag)}
                      >
                        <Text style={styles.tagText}>#{tag}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.noResultsText}>
                  Aucun résultat trouvé pour "{searchQuery}"
                </Text>
              )}
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.light.tint}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  clearButton: {
    padding: 5,
  },
  tabsContainer: {
    flexGrow: 0,
  },
  tabsContent: {
    paddingRight: 15,
  },
  tab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  activeTab: {
    backgroundColor: Colors.light.tint,
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  listContent: {
    padding: 15,
    flexGrow: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 15,
    marginRight: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  trendingContainer: {
    width: '100%',
  },
  trendingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  trendingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  tagContainer: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 5,
  },
  tagText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '500',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});