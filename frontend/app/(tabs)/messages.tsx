// app/(tabs)/messages.tsx


import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Text } from '@/components/ui/Themed';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type Conversation = {
  id: string;
  type: 'direct' | 'group';
  last_message?: {
    content: string;
    created_at: string;
    sender: {
      username: string;
    };
  };
  other_participant?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  unread_count: number;
};

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    // On peut ajouter un bouton en entête, par ex. "Nouvelle conv"
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 15 }}
          onPress={() => router.push('/messages/new')}
        >
          <FontAwesome name="plus" size={20} color={Colors.light.tint} />
        </TouchableOpacity>
      )
    });

    fetchConversations();
    const subscription = subscribeToMessages();
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchConversations = async () => {
    if (!session?.user) return;

    try {
      // 1) IDs des conv
      const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('profile_id', session.user.id);

      if (!participations || participations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participations.map(p => p.conversation_id);

      // 2) Récup. conv
      const { data: conversationsData } = await supabase
        .from('conversations')
        .select(`
          id,
          type,
          created_at,
          last_message_at,
          last_message:messages(
            content,
            created_at,
            sender:profiles(username)
          )
        `)
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      // 3) Récup. participants
      const { data: participantsData } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          profile:profiles(
            id,
            username,
            avatar_url
          )
        `)
        .in('conversation_id', conversationIds);

      const participantsByConv: Record<string, any[]> = {};
      participantsData?.forEach((row) => {
        const { conversation_id, profile } = row;
        if (!participantsByConv[conversation_id]) {
          participantsByConv[conversation_id] = [];
        }
        participantsByConv[conversation_id].push(profile);
      });

      // 4) Non-lus + otherParticipant
      const processedConversations = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', session.user.id);

          const unreadCount = count || 0;
          const conversationParticipants = participantsByConv[conv.id] || [];

          let otherParticipant;
          if (conv.type === 'direct') {
            otherParticipant = conversationParticipants.find(
              (p) => p.id !== session.user.id
            );
          }

          return {
            id: conv.id,
            type: conv.type,
            last_message: conv.last_message?.[0],
            other_participant: otherParticipant,
            unread_count: unreadCount
          };
        })
      );

      setConversations(processedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!session?.user) return;

    return supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();
  };

  const handleDeleteConversation = async (conversationId: string) => {
    Alert.alert(
      'Supprimer la conversation',
      'Voulez-vous vraiment supprimer cette conversation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Si c’est un direct, on supprime la conv + messages
              // Sinon, si c’est un group, on supprime la conv (ou on se retire)
              // Ex. minimal: on supprime tout
              await supabase
                .from('messages')
                .delete()
                .eq('conversation_id', conversationId);

              await supabase
                .from('conversation_participants')
                .delete()
                .eq('conversation_id', conversationId);

              await supabase
                .from('conversations')
                .delete()
                .eq('id', conversationId);

              fetchConversations();
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer la conversation');
              console.error(err);
            }
          },
        },
      ]
    );
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    if (item.type === 'direct' && !item.other_participant) {
      return null;
    }

    return (
      <View style={styles.conversationItem}>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => router.push(`/messages/${item.id}`)}
        >
          {/* Avatar */}
          {item.type === 'direct' ? (
            <Image
              source={{ uri: item.other_participant?.avatar_url || 'https://via.placeholder.com/50' }}
              style={styles.avatar}
            />
          ) : (
            <Image
              source={{ uri: 'https://via.placeholder.com/50?text=GRP' }}
              style={styles.avatar}
            />
          )}

          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={styles.username}>
                {item.type === 'group'
                  ? 'Groupe'
                  : item.other_participant?.username}
              </Text>
              {item.last_message && (
                <Text style={styles.time}>
                  {formatDistanceToNow(new Date(item.last_message.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </Text>
              )}
            </View>

            {item.last_message ? (
              <Text style={styles.lastMessage} numberOfLines={1}>
                <Text style={styles.senderName}>
                  {item.last_message.sender.username === session?.user?.user_metadata?.username
                    ? 'Vous: '
                    : ''}
                </Text>
                {item.last_message.content}
              </Text>
            ) : (
              <Text style={styles.noMessage}>Aucun message</Text>
            )}
          </View>
        </TouchableOpacity>

        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{item.unread_count}</Text>
          </View>
        )}

        {/* Icône poubelle pour supprimer */}
        <TouchableOpacity
          style={{ marginLeft: 10 }}
          onPress={() => handleDeleteConversation(item.id)}
        >
          <FontAwesome name="trash" size={18} color="#c00" />
        </TouchableOpacity>
      </View>
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
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Aucune conversation pour le moment
            </Text>
            <TouchableOpacity
              style={styles.newMessageButton}
              onPress={() => router.push('/messages/new')}
            >
              <Text style={styles.newMessageText}>
                Démarrer une conversation
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB si besoin en plus du headerRight */}
      {/* <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/messages/new')}
      >
        <FontAwesome name="pencil" size={24} color="#fff" />
      </TouchableOpacity> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingVertical: 10 },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  conversationContent: { flex: 1 },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: { fontSize: 16, fontWeight: '600' },
  time: { fontSize: 12, color: '#666' },
  lastMessage: { fontSize: 14, color: '#666' },
  senderName: { fontWeight: '500' },
  noMessage: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  unreadBadge: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 8,
  },
  unreadCount: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 20, marginTop: 50,
  },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  newMessageButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20,
  },
  newMessageText: { color: '#fff', fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center', alignItems: 'center',
  },
});
