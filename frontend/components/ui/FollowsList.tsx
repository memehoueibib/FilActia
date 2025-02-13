// frontend/components/ui/FollowsList.tsx
// Composant pour afficher les abonnés et abonnements avec gestion en temps réel

import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput
} from 'react-native';
import { Text } from './Themed';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import FollowButton from './FollowButton';

type FollowsListProps = {
  userId: string;
  type: 'followers' | 'following';
};

type User = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_following?: boolean;
  follows_you?: boolean;
};

export default function FollowsList({ userId, type }: FollowsListProps) {
  // États
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  const { session } = useAuth();

  // Effets
  useEffect(() => {
    fetchUsers();
  }, [userId, type]);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  // Filtre les utilisateurs selon la recherche
  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => 
      user.username.toLowerCase().includes(query) ||
      user.full_name.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  };

  // Récupère la liste des utilisateurs
  const fetchUsers = async () => {
    if (!session?.user) return;

    try {
      let query;
      
      if (type === 'followers') {
        // Récupérer les abonnés
        query = supabase
          .from('follows')
          .select(`
            follower:profiles!follows_follower_id_fkey(
              id,
              username,
              full_name,
              avatar_url,
              bio
            )
          `)
          .eq('following_id', userId);
      } else {
        // Récupérer les abonnements
        query = supabase
          .from('follows')
          .select(`
            following:profiles!follows_following_id_fkey(
              id,
              username,
              full_name,
              avatar_url,
              bio
            )
          `)
          .eq('follower_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Formater les données
      const formattedUsers = await Promise.all(
        data.map(async (item) => {
          const user = type === 'followers' ? item.follower : item.following;
          
          // Vérifier si l'utilisateur connecté suit cette personne
          const { data: followData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', session.user.id)
            .eq('following_id', user.id)
            .single();

          // Vérifier si cette personne suit l'utilisateur connecté
          const { data: followsYouData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', session.user.id)
            .single();

          return {
            ...user,
            is_following: !!followData,
            follows_you: !!followsYouData
          };
        })
      );

      setUsers(formattedUsers);
      setFilteredUsers(formattedUsers);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Gérer le rafraîchissement
  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  // Rendu d'un utilisateur
  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userContainer}>
      <TouchableOpacity 
        style={styles.userInfo}
        onPress={() => router.push(`/profile/${item.id}`)}
      >
        <Image
          source={{ 
            uri: item.avatar_url || 'https://via.placeholder.com/50'
          }}
          style={styles.avatar}
        />

        <View style={styles.userDetails}>
          <View style={styles.nameContainer}>
            <Text style={styles.name} numberOfLines={1}>
              {item.full_name}
            </Text>
            {item.follows_you && (
              <Text style={styles.followsYou}>Te suit</Text>
            )}
          </View>
          
          <Text style={styles.username}>@{item.username}</Text>
          {item.bio && (
            <Text style={styles.bio} numberOfLines={2}>
              {item.bio}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {item.id !== session?.user?.id && (
        <FollowButton
          profileId={item.id}
          initialIsFollowing={item.is_following}
          onFollowChange={(isFollowing) => {
            setUsers(prev => 
              prev.map(user => 
                user.id === item.id 
                  ? { ...user, is_following: isFollowing }
                  : user
              )
            );
          }}
          size="small"
        />
      )}
    </View>
  );

  // Rendu de la section de recherche
  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <FontAwesome 
        name="search" 
        size={16} 
        color="#999"
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={`Rechercher parmi les ${type === 'followers' ? 'abonnés' : 'abonnements'}...`}
        placeholderTextColor="#999"
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => setSearchQuery('')}
        >
          <FontAwesome name="times-circle" size={16} color="#999" />
        </TouchableOpacity>
      )}
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
    <View style={styles.container}>
      {renderSearchBar()}

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.light.tint}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome 
              name="users" 
              size={48} 
              color={Colors.light.icon}
            />
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Aucun utilisateur trouvé'
                : type === 'followers'
                  ? 'Aucun abonné pour le moment'
                  : 'Aucun abonnement pour le moment'}
            </Text>
          </View>
        }
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    margin: 10,
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#000',
  },
  clearButton: {
    padding: 5,
  },
  listContent: {
    flexGrow: 1,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  followsYou: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
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
    paddingHorizontal: 20,
  },
});