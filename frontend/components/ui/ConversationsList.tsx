// frontend/components/ui/ConversationsList.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
  Alert,
  RefreshControl,
  Dimensions
} from 'react-native';
import { Text } from './Themed';
import { FontAwesome } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Conversation } from '@/services/MessagingService';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 50;

interface EnhancedConversation extends Conversation {
  isTyping?: boolean;
  pinned?: boolean;
}

export default function ConversationsList() {
  const [conversations, setConversations] = useState<EnhancedConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<EnhancedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<{[key: string]: boolean}>({});
  const [pinnedConversations, setPinnedConversations] = useState<string[]>([]);

  const searchBarHeight = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  // Animation pour le header
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [HEADER_HEIGHT, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (session?.user) {
      fetchConversations();
      subscribeToPresence();
      subscribeToTypingIndicators();
      subscribeToNewMessages();
      loadPinnedConversations();
    }
  }, [session]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const filtered = conversations.filter(conv => {
      const searchLower = searchQuery.toLowerCase();
      if (conv.type === 'group') {
        return conv.title?.toLowerCase().includes(searchLower);
      }
      return conv.participant?.username.toLowerCase().includes(searchLower);
    });
    
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  // Conversations triées avec les épinglées en premier
  const sortedConversations = useMemo(() => {
    const pinned = filteredConversations.filter(conv => pinnedConversations.includes(conv.id));
    const unpinned = filteredConversations.filter(conv => !pinnedConversations.includes(conv.id));
    return [...pinned, ...unpinned];
  }, [filteredConversations, pinnedConversations]);

  const fetchConversations = async () => {
    if (!session?.user) return;

    try {
      // Récupérer les IDs des conversations
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('profile_id', session.user.id);

      if (partError) throw partError;

      if (!participations?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participations.map(p => p.conversation_id);

      // Récupérer les détails des conversations
      const { data: conversationsData, error: convsError } = await supabase
        .from('conversations')
        .select(`
          id,
          type,
          created_by,
          title,
          avatar_url,
          last_message_at,
          is_group,
          group_admin_id,
          participants:conversation_participants(
            profile:profiles(
              id,
              username,
              avatar_url
            )
          ),
          last_message:messages(
            content,
            created_at,
            sender:profiles(username)
          )
        `)
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (convsError) throw convsError;

      // Récupérer les messages non lus pour chaque conversation
      const processedConversations = await Promise.all(
        conversationsData.map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', session.user.id);

          return {
            ...conv,
            unread_count: count || 0,
            pinned: pinnedConversations.includes(conv.id),
            isTyping: false
          };
        })
      );

      setConversations(processedConversations);
      setFilteredConversations(processedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      Alert.alert('Erreur', 'Impossible de charger les conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const subscribeToPresence = () => {
    const channel = supabase.channel('online');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online: {[key: string]: boolean} = {};
        
        Object.keys(state).forEach(userId => {
          online[userId] = true;
        });
        
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && session?.user) {
          await channel.track({
            user_id: session.user.id,
            online_at: new Date().toISOString()
          });
        }
      });

    return channel;
  };

  const subscribeToTypingIndicators = () => {
    const channel = supabase.channel('typing');
    
    channel
      .on('broadcast', { event: 'typing' }, async ({ payload }) => {
        const { conversation_id, user_id, isTyping } = payload;
        
        setConversations(prev => prev.map(conv => {
          if (conv.id === conversation_id) {
            return { ...conv, isTyping };
          }
          return conv;
        }));
      })
      .subscribe();

    return channel;
  };

  const subscribeToNewMessages = () => {
    const channel = supabase.channel('new_messages');
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          if (payload.new) {
            await fetchConversations();
          }
        }
      )
      .subscribe();

    return channel;
  };

  const loadPinnedConversations = async () => {
    if (!session?.user) return;

    try {
      const { data } = await supabase
        .from('pinned_conversations')
        .select('conversation_id')
        .eq('user_id', session.user.id);

      setPinnedConversations(data?.map(item => item.conversation_id) || []);
    } catch (error) {
      console.error('Error loading pinned conversations:', error);
    }
  };

  const handlePinConversation = async (conversationId: string, pin: boolean) => {
    if (!session?.user) return;

    try {
      if (pin) {
        await supabase
          .from('pinned_conversations')
          .insert({
            user_id: session.user.id,
            conversation_id: conversationId
          });
      } else {
        await supabase
          .from('pinned_conversations')
          .delete()
          .eq('user_id', session.user.id)
          .eq('conversation_id', conversationId);
      }

      await loadPinnedConversations();
      await fetchConversations();
    } catch (error) {
      console.error('Error pinning/unpinning conversation:', error);
      Alert.alert('Erreur', 'Impossible de modifier l\'épinglage');
    }
  };

  const handleConversationPress = (conversation: EnhancedConversation) => {
    router.push(`/messages/${conversation.id}`);
  };

  const handleConversationOptions = (conversation: EnhancedConversation) => {
    Alert.alert(
      'Options',
      'Que souhaitez-vous faire ?',
      [
        {
          text: conversation.pinned ? 'Désépingler' : 'Épingler',
          onPress: () => handlePinConversation(conversation.id, !conversation.pinned)
        },
        {
          text: 'Marquer comme lu',
          onPress: () => markConversationAsRead(conversation.id)
        },
        {
          text: conversation.type === 'group' ? 'Quitter le groupe' : 'Supprimer',
          style: 'destructive',
          onPress: () => handleDeleteConversation(conversation)
        },
        {
          text: 'Annuler',
          style: 'cancel'
        }
      ]
    );
  };

  const markConversationAsRead = async (conversationId: string) => {
    if (!session?.user) return;

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', session.user.id);

      fetchConversations();
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      Alert.alert('Erreur', 'Impossible de marquer comme lu');
    }
  };

  const handleDeleteConversation = async (conversation: EnhancedConversation) => {
    if (!session?.user) return;

    const message = conversation.type === 'group'
      ? 'Êtes-vous sûr de vouloir quitter ce groupe ?'
      : 'Êtes-vous sûr de vouloir supprimer cette conversation ?';

    Alert.alert(
      'Confirmation',
      message,
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (conversation.type === 'group') {
                await supabase
                  .from('conversation_participants')
                  .delete()
                  .eq('conversation_id', conversation.id)
                  .eq('profile_id', session.user.id);
              } else {
                // Supprimer les messages d'abord
                await supabase
                  .from('messages')
                  .delete()
                  .eq('conversation_id', conversation.id);

                // Puis supprimer la conversation
                await supabase
                  .from('conversations')
                  .delete()
                  .eq('id', conversation.id);
              }

              fetchConversations();
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la conversation');
            }
          }
        }
      ]
    );
  };

  const toggleSearchBar = (show: boolean) => {
    Animated.spring(searchBarHeight, {
      toValue: show ? 50 : 0,
      useNativeDriver: false,
    }).start();
  };

  const renderConversation = ({ item: conversation }: { item: EnhancedConversation }) => {
    const hasUnread = conversation.unread_count > 0;
    const isPinned = pinnedConversations.includes(conversation.id);
    const otherParticipant = conversation.participants
      ?.find(p => p.profile.id !== session?.user?.id)?.profile;
    const isOnline = otherParticipant ? onlineUsers[otherParticipant.id] : false;

    return (
      <Animated.View
        style={[
          styles.conversationItem,
          hasUnread && styles.unreadConversation,
          isPinned && styles.pinnedConversation
        ]}
      >
        <TouchableOpacity
          style={styles.conversationContent}
          onPress={() => handleConversationPress(conversation)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {conversation.type === 'group' ? (
              <View style={styles.groupAvatarContainer}>
                {conversation.participants?.slice(0, 4).map((participant, index) => (
                  <Image
                    key={participant.profile.id}
                    source={{ 
                      uri: participant.profile.avatar_url || 'https://via.placeholder.com/30'
                    }}
                    style={[
                      styles.groupAvatarImage,
                      {
                        top: index < 2 ? 0 : 15,
                        left: index % 2 === 0 ? 0 : 15
                      }
                    ]}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.avatarWrapper}>
                <Image
                  source={{ 
                    uri: otherParticipant?.avatar_url || 'https://via.placeholder.com/50'
                  }}
                  style={styles.avatar}
                />
                {isOnline && <View style={styles.onlineIndicator} />}
              </View>
            )}
          </View>

          <View style={styles.messageContainer}>
            <View style={styles.messageHeader}>
              <Text style={[styles.username, hasUnread && styles.unreadText]} numberOfLines={1}>
                {conversation.type === 'group' 
                  ? conversation.title 
                  : otherParticipant?.username}
              </Text>
              {conversation.last_message?.created_at && (
                <Text style={styles.time}>
                  {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                    addSuffix: true,
                    locale: fr
                  })}
                </Text>
              )}
            </View>

            <View style={styles.messagePreview}>
              {conversation.isTyping ? (
                <Text style={styles.typingText}>
                  {conversation.type === 'group' 
                    ? 'Quelqu\'un écrit...'
                    : `${otherParticipant?.username} écrit...`}
                </Text>
              ) : conversation.last_message ? (
                <Text 
                  style={[styles.lastMessage, hasUnread && styles.unreadText]}
                  numberOfLines={1}
                >
                  {conversation.type === 'group' && 
                   conversation.last_message.sender.username !== session?.user?.user_metadata?.username && (
                    <Text style={styles.senderName}>
                      {conversation.last_message.sender.username}: 
                    </Text>
                  )}
                  {conversation.last_message.content}
                </Text>
              ) : (
                <Text style={styles.noMessage}>
                  Nouvelle conversation
                </Text>
              )}

              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>
                    {conversation.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.actionContainer}>
          {isPinned && (
            <FontAwesome 
              name="thumb-tack" 
              size={14} 
              color={Colors.light.tint}
              style={styles.pinnedIcon}
            />
          )}
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => handleConversationOptions(conversation)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <FontAwesome name="ellipsis-v" size={16} color="#999" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BlurView intensity={100} style={styles.header}>
        <Animated.View style={[styles.searchContainer, { height: headerHeight }]}>
          <View style={styles.searchBar}>
            <FontAwesome name="search" size={16} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher une conversation..."
              placeholderTextColor="#999"
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
        </Animated.View>
      </BlurView>

      <FlatList
        data={sortedConversations}
        renderItem={renderConversation}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchConversations();
            }}
            tintColor={Colors.light.tint}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome 
              name="comments-o" 
              size={50} 
              color={Colors.light.tint}
            />
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'Aucune conversation trouvée'
                : 'Démarrez une nouvelle conversation'}
            </Text>
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={() => router.push('/messages/new')}
            >
              <Text style={styles.newChatButtonText}>
                Nouvelle conversation
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/messages/new')}
        activeOpacity={0.8}
      >
        <FontAwesome name="pencil" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  searchContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    overflow: 'hidden',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    margin: 10,
    padding: 10,
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  list: {
    paddingTop: HEADER_HEIGHT + 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  conversationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  groupAvatarContainer: {
    width: 50,
    height: 50,
    position: 'relative',
  },
  groupAvatarImage: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  messageContainer: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  senderName: {
    fontWeight: '500',
    marginRight: 4,
  },
  unreadText: {
    fontWeight: '600',
    color: Colors.light.tint,
  },
  typingText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontStyle: 'italic',
  },
  noMessage: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: Colors.light.tint,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedIcon: {
    marginRight: 10,
    transform: [{ rotate: '45deg' }],
  },
  optionsButton: {
    padding: 5,
  },
  unreadConversation: {
    backgroundColor: '#f8f8ff',
  },
  pinnedConversation: {
    backgroundColor: '#fcfcff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SCREEN_WIDTH * 0.2,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  newChatButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
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
});