// frontend/components/ui/NewConversation.tsx
// Composant pour démarrer une nouvelle conversation

import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { Text } from './Themed';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import MessagingService from '@/services/MessagingService';
import { router } from 'expo-router';
import { debounce } from 'lodash';
import { Profile } from '@/types';

export default function NewConversation() {
  // États
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const { session } = useAuth();
  const messagingService = MessagingService.getInstance();

  // Effet pour la recherche avec debounce
  useEffect(() => {
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery);
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  // Recherche des utilisateurs
  const searchUsers = async (query: string) => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', session.user.id)
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erreur lors de la recherche des utilisateurs:', error);
      Alert.alert('Erreur', 'Impossible de rechercher des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  // Debounce de la recherche
  const debouncedSearch = debounce(searchUsers, 300);

  // Démarrer une nouvelle conversation
  const startConversation = async (user: Profile) => {
    if (!session?.user) return;

    try {
      setSelectedUser(user);
      const conversationId = await messagingService.getOrCreateConversation(
        session.user.id,
        user.id
      );
      router.push(`/messages/${conversationId}`);
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error);
      Alert.alert('Erreur', 'Impossible de démarrer la conversation');
      setSelectedUser(null);
    }
  };

  // Rendu d'un utilisateur
  const renderUser = ({ item }: { item: Profile }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => startConversation(item)}
      disabled={selectedUser !== null}
    >
      <Image
        source={{ 
          uri: item.avatar_url || 'https://via.placeholder.com/50'
        }}
        style={styles.avatar}
      />

      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        {item.full_name && (
          <Text style={styles.fullName}>{item.full_name}</Text>
        )}
      </View>

      {selectedUser?.id === item.id && (
        <ActivityIndicator 
          size="small" 
          color={Colors.light.tint} 
          style={styles.loader}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
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
          placeholder="Rechercher un utilisateur..."
          placeholderTextColor="#999"
          autoFocus
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

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.light.tint} />
            ) : searchQuery ? (
              <>
                <FontAwesome
                  name="user-times"
                  size={48}
                  color={Colors.light.icon}
                />
                <Text style={styles.emptyText}>
                  Aucun utilisateur trouvé
                </Text>
              </>
            ) : (
              <Text style={styles.emptyText}>
                Recherchez un utilisateur pour démarrer une conversation
              </Text>
            )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    margin: 10,
    borderRadius: 20,
    paddingHorizontal: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
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
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  fullName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loader: {
    marginLeft: 10,
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