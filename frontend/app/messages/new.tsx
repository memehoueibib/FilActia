// app/messages/new.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Keyboard,
  Animated,
} from 'react-native';
import { Text } from '@/components/ui/Themed';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import { Profile } from '@/types';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NewConversationScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const scaleAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Gère la hauteur du clavier sur iOS/Android
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  // Recherche de profils
  const searchUsers = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', session.user.id)
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .order('username', { ascending: true })
        .limit(20);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Erreur', 'Impossible de rechercher les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  // Créer / rejoindre une conversation directe
  const startConversation = async (user: Profile) => {
    if (!session?.user) return;

    try {
      // Vérifie si une conv. directe existe déjà
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'direct')
        .eq('is_group', false)
        .or(`participant1_id.eq.${session.user.id},participant2_id.eq.${user.id}`)
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${session.user.id}`)
        .single();

      if (existingConv) {
        // Redirige vers cette conversation
        router.push(`/messages/${existingConv.id}`);
        return;
      }

      // Sinon, on crée une nouvelle conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          created_by: session.user.id,
          type: 'direct',
          is_group: false,
          participant1_id: session.user.id,
          participant2_id: user.id,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convError) throw convError;
      if (!newConv) throw new Error('Impossible de créer la conversation');

      // Puis on crée les participants
      const participants = [
        {
          conversation_id: newConv.id,
          profile_id: session.user.id,
          role: 'member',
          joined_at: new Date().toISOString(),
        },
        {
          conversation_id: newConv.id,
          profile_id: user.id,
          role: 'member',
          joined_at: new Date().toISOString(),
        },
      ];

      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (partError) throw partError;

      // Redirection vers la conv
      router.push(`/messages/${newConv.id}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert(
        'Erreur',
        "Impossible de créer la conversation. Veuillez réessayer."
      );
    }
  };

  // Gère la sélection / désélection d’un utilisateur
  const toggleUserSelection = useCallback((user: Profile) => {
    // Animation de zoom/dézoom
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      return isSelected
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user];
    });
  }, []);

  // Créer un groupe (si >=2 users sélectionnés)
  const createGroupChat = async () => {
    if (!session?.user || selectedUsers.length < 2) return;

    try {
      setCreatingGroup(true);

      // Insert conversation type "group"
      const { data: newGroup, error: groupError } = await supabase
        .from('conversations')
        .insert({
          created_by: session.user.id,
          type: 'group',
          is_group: true,
          group_admin_id: session.user.id,
          title: `Groupe (${selectedUsers.length + 1})`,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Insert les participants
      const participants = [
        {
          conversation_id: newGroup.id,
          profile_id: session.user.id,
          role: 'admin' as const,
        },
        ...selectedUsers.map(u => ({
          conversation_id: newGroup.id,
          profile_id: u.id,
          role: 'member' as const,
        })),
      ];

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      // Redirection
      router.push(`/messages/${newGroup.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Erreur', 'Impossible de créer le groupe');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Rendu d’un item user
  const renderUser = ({ item: user }: { item: Profile }) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);

    return (
      <Animated.View
        style={[
          styles.userItemContainer,
          {
            transform: [{ scale: isSelected ? scaleAnim : 1 }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.userItem, isSelected && styles.selectedUserItem]}
          onPress={() => {
            // S’il n’y a encore aucune sélection, on part direct en conversation
            if (selectedUsers.length === 0) {
              startConversation(user);
            } else {
              toggleUserSelection(user);
            }
          }}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: user.avatar_url || 'https://via.placeholder.com/50' }}
            style={styles.avatar}
          />

          <View style={styles.userInfo}>
            <Text style={styles.username} numberOfLines={1}>
              {user.username}
            </Text>
            {user.full_name && (
              <Text style={styles.fullName} numberOfLines={1}>
                {user.full_name}
              </Text>
            )}
          </View>

          {/* Si on crée un groupe, on affiche la case à cocher */}
          {selectedUsers.length > 0 && (
            <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
              {isSelected && (
                <FontAwesome name="check" size={12} color="#fff" />
              )}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Barre de recherche */}
      <BlurView intensity={100} tint="light" style={styles.searchBarContainer}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={16} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher un utilisateur..."
            placeholderTextColor="#999"
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <FontAwesome name="times-circle" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </BlurView>

      {/* Affichage des utilisateurs sélectionnés */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedUsersContainer}>
          <FlatList
            data={selectedUsers}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.selectedUserBadge}
                onPress={() => toggleUserSelection(item)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: item.avatar_url || 'https://via.placeholder.com/30' }}
                  style={styles.selectedUserAvatar}
                />
                <Text style={styles.selectedUsername} numberOfLines={1}>
                  {item.username}
                </Text>
                <FontAwesome name="times" size={12} color="#666" />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.selectedUsersList}
          />
        </View>
      )}

      {/* Résultat de la recherche */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>
            Recherche des utilisateurs...
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.usersList,
            { paddingBottom: keyboardHeight + (selectedUsers.length >= 2 ? 80 : 20) },
          ]}
          ListEmptyComponent={
            searchQuery ? (
              <View style={styles.emptyContainer}>
                <FontAwesome name="user-times" size={50} color="#999" />
                <Text style={styles.emptyText}>
                  Aucun utilisateur trouvé pour "{searchQuery}"
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Bouton de création d’un groupe */}
      {selectedUsers.length >= 2 && (
        <Animated.View style={[styles.createGroupButtonContainer, { bottom: keyboardHeight + 20 }]}>
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={createGroupChat}
            disabled={creatingGroup}
            activeOpacity={0.8}
          >
            {creatingGroup ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome name="users" size={20} color="#fff" />
                <Text style={styles.createGroupText}>
                  Créer un groupe ({selectedUsers.length})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBarContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    margin: 10,
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  usersList: {
    padding: 10,
  },
  userItemContainer: {
    marginBottom: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  selectedUserItem: {
    backgroundColor: '#f0f8ff',
    borderColor: Colors.light.tint,
    borderWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  fullName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: Colors.light.tint,
  },
  selectedUsersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  selectedUsersList: {
    padding: 10,
  },
  selectedUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedUserAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  selectedUsername: {
    fontSize: 14,
    marginRight: 8,
    color: '#333',
    maxWidth: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    maxWidth: '80%',
  },
  createGroupButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 15,
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
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
  createGroupText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});
