// frontend/components/ui/Chat.tsx
// Composant de chat en temps réel avec animations et indicateurs de typing

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Text } from './Themed';
import { FontAwesome } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import MessagingService, { Message } from '@/services/MessagingService';
import { debounce } from 'lodash';

type ChatProps = {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
};

export default function Chat({
  conversationId,
  otherUserId,
  otherUserName,
  otherUserAvatar
}: ChatProps) {
  // États
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const listRef = useRef<FlatList>(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const messagingService = MessagingService.getInstance();
  const { session } = useAuth();

  // Effet pour charger les messages et gérer les subscriptions
  useEffect(() => {
    if (!conversationId || !session?.user) return;

    fetchMessages();
    markMessagesAsRead();

    // Souscrire aux nouveaux messages
    const unsubscribeMessages = messagingService.subscribeToMessages(
      conversationId,
      handleNewMessage
    );

    // Souscrire aux changements de statut de lecture
    const unsubscribeRead = messagingService.subscribeToReadStatus(
      conversationId,
      fetchMessages
    );

    return () => {
      unsubscribeMessages();
      unsubscribeRead();
    };
  }, [conversationId, session]);

  // Charger les messages
  const fetchMessages = async () => {
    try {
      const fetchedMessages = await messagingService.getMessages(conversationId);
      setMessages(fetchedMessages);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      setLoading(false);
    }
  };

  // Marquer les messages comme lus
  const markMessagesAsRead = async () => {
    if (!session?.user) return;
    try {
      await messagingService.markMessagesAsRead(conversationId, session.user.id);
    } catch (error) {
      console.error('Erreur lors du marquage des messages:', error);
    }
  };

  // Gérer un nouveau message
  const handleNewMessage = (message: Message) => {
    setMessages(prev => [message, ...prev]);
    if (message.sender_id !== session?.user?.id) {
      markMessagesAsRead();
    }
  };

  // Animer l'indicateur de frappe
  const animateTyping = () => {
    Animated.sequence([
      Animated.timing(typingAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(typingAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start(() => {
      if (isTyping) {
        animateTyping();
      }
    });
  };

  // Gérer la frappe avec debounce
  const handleTyping = debounce(() => {
    setIsTyping(true);
    animateTyping();
    
    // Désactiver après 2 secondes
    setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  }, 300);

  // Envoyer un message
  const sendMessage = async () => {
    if (!session?.user || !newMessage.trim() || sending) return;

    try {
      setSending(true);
      await messagingService.sendMessage(
        conversationId,
        session.user.id,
        newMessage
      );
      setNewMessage('');
      
      // Scroll vers le haut
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  // Supprimer un message
  const handleDeleteMessage = async (messageId: string) => {
    if (!session?.user) return;

    Alert.alert(
      'Supprimer le message',
      'Êtes-vous sûr de vouloir supprimer ce message ?',
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await messagingService.deleteMessage(messageId, session.user.id);
              setMessages(prev => prev.filter(m => m.id !== messageId));
            } catch (error) {
              console.error('Erreur lors de la suppression du message:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le message');
            }
          }
        }
      ]
    );
  };

  // Rendu d'un message
  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === session?.user?.id;

    return (
      <Animated.View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwnMessage && (
          <Image
            source={{ uri: otherUserAvatar || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
        )}

        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          
          <Text style={styles.timestamp}>
            {formatDistanceToNow(new Date(item.created_at), {
              addSuffix: true,
              locale: fr
            })}
          </Text>
        </View>

        {isOwnMessage && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteMessage(item.id)}
          >
            <FontAwesome name="trash-o" size={16} color="#666" />
          </TouchableOpacity>
        )}
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Commencez la conversation avec {otherUserName}
            </Text>
          </View>
        }
      />

      {isTyping && (
        <Animated.View style={[
          styles.typingIndicator,
          {
            opacity: typingAnimation
          }
        ]}>
          <Text style={styles.typingText}>
            {otherUserName} est en train d'écrire...
          </Text>
        </Animated.View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={(text) => {
            setNewMessage(text);
            handleTyping();
          }}
          placeholder="Écrivez votre message..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.disabledButton
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FontAwesome name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  messagesList: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 20,
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
  ownBubble: {
    backgroundColor: Colors.light.tint,
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    color: 'rgba(0, 0, 0, 0.5)',
    alignSelf: 'flex-end',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  typingIndicator: {
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    marginHorizontal: 15,
    marginBottom: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});