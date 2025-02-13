// frontend/components/ui/EnhancedSearch.tsx
// Composant de recherche avancée avec suggestions et filtres

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
  Animated,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Text } from './Themed';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { debounce } from 'lodash';

// Types
type SearchCategory = 'all' | 'users' | 'posts' | 'tags' | 'locations';

type SearchResult = {
  id: string;
  type: SearchCategory;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  count?: number;
};

type RecentSearch = {
  id: string;
  query: string;
  type: SearchCategory;
  timestamp: string;
};

export default function EnhancedSearch() {
  // États
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);

  // Animations
  const filtersHeight = useRef(new Animated.Value(0)).current;
  const searchBarWidth = useRef(new Animated.Value(1)).current;

  const { session } = useAuth();

  // Effets
  useEffect(() => {
    loadRecentSearches();
    fetchTrendingTags();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, activeCategory]);

  // Charger les recherches récentes
  const loadRecentSearches = async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from('recent_searches')
        .select('*')
        .eq('user_id', session.user.id)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentSearches(data);
    } catch (error) {
      console.error('Erreur lors du chargement des recherches récentes:', error);
    }
  };

  // Récupérer les tags tendance
  const fetchTrendingTags = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('tags')
        .not('tags', 'is', null)
        .limit(100);

      if (error) throw error;

      // Compter et trier les tags
      const tagCounts: { [key: string]: number } = {};
      data.forEach(post => {
        if (Array.isArray(post.tags)) {
          post.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag]) => tag);

      setTrendingTags(sortedTags);
    } catch (error) {
      console.error('Erreur lors de la récupération des tags tendance:', error);
    }
  };

  // Recherche avec debounce
  const debouncedSearch = debounce(async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    const results: SearchResult[] = [];

    try {
      if (activeCategory === 'all' || activeCategory === 'users') {
        // Recherche d'utilisateurs
        const { data: users } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(5);

        results.push(
          ...(users?.map(user => ({
            id: user.id,
            type: 'users' as SearchCategory,
            title: user.username,
            subtitle: user.full_name,
            imageUrl: user.avatar_url
          })) || [])
        );
      }

      if (activeCategory === 'all' || activeCategory === 'posts') {
        // Recherche de posts
        const { data: posts } = await supabase
          .from('posts')
          .select(`
            *,
            profile:profiles(username, avatar_url)
          `)
          .textSearch('content', query)
          .limit(5);

        results.push(
          ...(posts?.map(post => ({
            id: post.id,
            type: 'posts' as SearchCategory,
            title: post.content.slice(0, 100),
            subtitle: `Par @${post.profile.username}`,
            imageUrl: post.file_url
          })) || [])
        );
      }

      if (activeCategory === 'all' || activeCategory === 'tags') {
        // Recherche de tags
        const { data: tags } = await supabase
          .from('posts')
          .select('tags')
          .contains('tags', [query])
          .limit(5);

        const tagCounts: { [key: string]: number } = {};
        tags?.forEach(post => {
          post.tags.forEach((tag: string) => {
            if (tag.toLowerCase().includes(query.toLowerCase())) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
          });
        });

        results.push(
          ...Object.entries(tagCounts).map(([tag, count]) => ({
            id: tag,
            type: 'tags' as SearchCategory,
            title: `#${tag}`,
            count
          }))
        );
      }

      setSearchResults(results);

      // Sauvegarder la recherche
      if (query.length > 2 && session?.user) {
        await supabase
          .from('recent_searches')
          .insert({
            user_id: session.user.id,
            query,
            type: activeCategory,
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      Alert.alert('Erreur', 'Impossible d\'effectuer la recherche');
    } finally {
      setLoading(false);
    }
  }, 300);

  // Gérer le clic sur un résultat
  const handleResultPress = (result: SearchResult) => {
    switch (result.type) {
      case 'users':
        router.push(`/profile/${result.id}`);
        break;
      case 'posts':
        router.push(`/post/${result.id}`);
        break;
      case 'tags':
        router.push(`/tag/${result.title.slice(1)}`);
        break;
    }
  };

  // Supprimer une recherche récente
  const handleRemoveRecentSearch = async (searchId: string) => {
    try {
      await supabase
        .from('recent_searches')
        .delete()
        .eq('id', searchId);

      setRecentSearches(prev => 
        prev.filter(search => search.id !== searchId)
      );
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  // Animer les filtres
  const toggleFilters = () => {
    Animated.spring(filtersHeight, {
      toValue: showFilters ? 0 : 60,
      useNativeDriver: false,
    }).start();
    setShowFilters(!showFilters);
  };

  // Effacer la recherche
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Rendu d'un résultat de recherche
  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
    >
      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.resultImage}
        />
      )}

      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.resultSubtitle}>
            {item.subtitle}
          </Text>
        )}
        {item.count && (
          <Text style={styles.resultCount}>
            {item.count} publications
          </Text>
        )}
      </View>

      <FontAwesome 
        name="chevron-right" 
        size={16} 
        color="#999"
        style={styles.resultArrow} 
      />
    </TouchableOpacity>
  );

  // Rendu des filtres
  const renderFilters = () => (
    <Animated.View style={[styles.filtersContainer, { height: filtersHeight }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            activeCategory === 'all' && styles.activeFilterChip
          ]}
          onPress={() => setActiveCategory('all')}
        >
          <Text style={[
            styles.filterText,
            activeCategory === 'all' && styles.activeFilterText
          ]}>
            Tout
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            activeCategory === 'users' && styles.activeFilterChip
          ]}
          onPress={() => setActiveCategory('users')}
        >
          <FontAwesome 
            name="user" 
            size={14}
            color={activeCategory === 'users' ? '#fff' : '#666'}
          />
          <Text style={[
            styles.filterText,
            activeCategory === 'users' && styles.activeFilterText
          ]}>
            Utilisateurs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            activeCategory === 'posts' && styles.activeFilterChip
          ]}
          onPress={() => setActiveCategory('posts')}
        >
          <FontAwesome 
            name="file-text" 
            size={14}
            color={activeCategory === 'posts' ? '#fff' : '#666'}
          />
          <Text style={[
            styles.filterText,
            activeCategory === 'posts' && styles.activeFilterText
          ]}>
            Publications
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            activeCategory === 'tags' && styles.activeFilterChip
          ]}
          onPress={() => setActiveCategory('tags')}
        >
          <FontAwesome 
            name="hashtag" 
            size={14}
            color={activeCategory === 'tags' ? '#fff' : '#666'}
          />
          <Text style={[
            styles.filterText,
            activeCategory === 'tags' && styles.activeFilterText
          ]}>
            Tags
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  // Rendu des recherches récentes
  const renderRecentSearches = () => (
    <View style={styles.recentContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recherches récentes</Text>
        {recentSearches.length > 0 && (
          <TouchableOpacity
            onPress={async () => {
              try {
                await supabase
                  .from('recent_searches')
                  .delete()
                  .eq('user_id', session?.user?.id);
                setRecentSearches([]);
              } catch (error) {
                console.error('Erreur lors du nettoyage:', error);
              }
            }}
          >
            <Text style={styles.clearText}>Effacer tout</Text>
          </TouchableOpacity>
        )}
      </View>

      {recentSearches.map(search => (
        <TouchableOpacity
          key={search.id}
          style={styles.recentItem}
          onPress={() => {
            setSearchQuery(search.query);
            setActiveCategory(search.type);
          }}
        >
          <View style={styles.recentItemContent}>
            <FontAwesome name="history" size={16} color="#999" />
            <Text style={styles.recentQuery}>{search.query}</Text>
            <Text style={styles.recentType}>
              {search.type === 'all' ? 'Tout' : 
               search.type === 'users' ? 'Utilisateurs' :
               search.type === 'posts' ? 'Publications' : 'Tags'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleRemoveRecentSearch(search.id)}
            style={styles.removeButton}
          >
            <FontAwesome name="times" size={16} color="#999" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Rendu des tags tendance
  const renderTrendingTags = () => (
    <View style={styles.trendingContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tags tendance</Text>
      </View>
      <View style={styles.tagsList}>
        {trendingTags.map(tag => (
          <TouchableOpacity
            key={tag}
            style={styles.trendingTag}
            onPress={() => {
              setSearchQuery(tag);
              setActiveCategory('tags');
            }}
          >
            <Text style={styles.tagText}>#{tag}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchBarContainer}>
        <Animated.View style={[styles.searchBar, { flex: searchBarWidth }]}>
          <FontAwesome name="search" size={16} color="#999" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher..."
            placeholderTextColor="#999"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearSearch}
            >
              <FontAwesome name="times-circle" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </Animated.View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={toggleFilters}
        >
          <FontAwesome 
            name="sliders" 
            size={20} 
            color={showFilters ? Colors.light.tint : '#666'}
          />
        </TouchableOpacity>
      </View>

      {/* Filtres */}
      {renderFilters()}

      {/* Résultats ou contenu par défaut */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : searchQuery ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={item => `${item.type}-${item.id}`}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome name="search" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                Aucun résultat trouvé pour "{searchQuery}"
              </Text>
            </View>
          }
        />
      ) : (
        <ScrollView>
          {renderRecentSearches()}
          {renderTrendingTags()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000',
  },
  clearButton: {
    padding: 5,
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
  },
  filtersContainer: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filtersContent: {
    padding: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  activeFilterChip: {
    backgroundColor: Colors.light.tint,
  },
  filterText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  activeFilterText: {
    color: '#fff',
  },
  resultsList: {
    padding: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  resultCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  resultArrow: {
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  recentContainer: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearText: {
    color: Colors.light.tint,
    fontSize: 14,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  recentItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentQuery: {
    marginLeft: 10,
    fontSize: 16,
  },
  recentType: {
    marginLeft: 10,
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  removeButton: {
    padding: 5,
  },
  trendingContainer: {
    padding: 15,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trendingTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    margin: 4,
  },
  tagText: {
    color: Colors.light.tint,
    fontSize: 14,
  },
});