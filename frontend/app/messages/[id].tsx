// app/messages/[id].tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Alert
} from 'react-native';
import { Text } from '@/components/ui/Themed';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import { Message, Profile } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '@/lib/fileUtils';

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const MESSAGE_WIDTH = WINDOW_WIDTH * 0.75;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const { session } = useAuth();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchMessages();
    fetchParticipants();
    subscribeToMessages();
    markMessagesAsRead();
  }, []);

  // Affichage du pseudo + avatar dans l'entête
  useEffect(() => {
    if (participants.length > 0) {
      const otherParticipant = participants.find(p => p.id !== session?.user?.id);
      if (otherParticipant) {
        navigation.setOptions({
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <Image 
                source={{ uri: otherParticipant.avatar_url || 'https://via.placeholder.com/40' }}
                style={styles.headerAvatar}
              />
              <View>
                <Text style={styles.headerName}>{otherParticipant.username}</Text>
                {isTyping && (
                  <Text style={styles.typingText}>En train d'écrire...</Text>
                )}
              </View>
            </View>
          ),
        });
      }
    }
  }, [participants, isTyping]);

  const fetchMessages = async () => {
    try {
      // Vérifier que l'utilisateur participe
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('profile_id')
        .eq('conversation_id', id)
        .eq('profile_id', session?.user?.id)
        .single();
  
      if (participantError) throw participantError;
      if (!participantData) {
        throw new Error('Not a participant');
      }
  
      // Récupérer les messages
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          media_url,
          media_type,
          sender_id,
          is_read,
          sender:profiles(
            id,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', id)
        .order('created_at', { ascending: false });
  
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          profile:profiles(
            id,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', id);

      if (error) throw error;
      setParticipants(data?.map(d => d.profile) || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      // Marquer tous les messages non lus comme lus
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', id)
        .neq('sender_id', session?.user?.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const subscribeToMessages = () => {
    // S'abonner aux nouveaux messages
    const subscription = supabase
      .channel(`conversation:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        async (payload) => {
          const { data: message, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && message) {
            setMessages(prev => [message, ...prev]);
            if (message.sender_id !== session?.user?.id) {
              markMessagesAsRead();
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedImage) || sending) return;
  
    try {
      setSending(true);
      let file_url = null;
  
      if (selectedImage) {
        const uploadResult = await uploadFile(selectedImage, 'messages', session?.user?.id || '');
        if (uploadResult.error) throw uploadResult.error;
        file_url = uploadResult.url;
      }
  
      // Vérifier que l'utilisateur est toujours participant
      const { data: isParticipant } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', id)
        .eq('profile_id', session?.user?.id)
        .single();
  
      if (!isParticipant) {
        throw new Error('Not a participant');
      }
  
      // Insérer le message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: id,
          sender_id: session?.user?.id,
          content: newMessage.trim(),
          media_url: file_url,
          media_type: selectedImage ? 'image' : null,
        });
  
      if (messageError) throw messageError;
  
      // Reset state
      setNewMessage('');
      setSelectedImage(null);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'envoyer le message. Veuillez réessayer.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  // Rendu d'un message
  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === session?.user?.id;

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwnMessage && (
          <Image
            source={{ uri: item.sender?.avatar_url || 'https://via.placeholder.com/32' }}
            style={styles.messageAvatar}
          />
        )}

        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          {item.media_url && (
            <Image
              source={{ uri: item.media_url }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}

          {item.content && (
            <Text style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText
            ]}>
              {item.content}
            </Text>
          )}

          <Text style={styles.messageTime}>
            {formatDistanceToNow(new Date(item.created_at), {
              addSuffix: true,
              locale: fr
            })}
          </Text>
        </View>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.messagesList}
      />

      {selectedImage && (
        <View style={styles.selectedImageContainer}>
          <Image
            source={{ uri: selectedImage }}
            style={styles.selectedImage}
          />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setSelectedImage(null)}
          >
            <FontAwesome name="times" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.mediaButton}
          onPress={handleImagePick}
        >
          <FontAwesome name="image" size={24} color={Colors.light.icon} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={(text) => {
            setNewMessage(text);
            setIsTyping(true);
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
              setIsTyping(false);
            }, 1500);
          }}
          placeholder="Écrivez un message..."
          multiline
          maxHeight={100}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() && !selectedImage) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={(!newMessage.trim() && !selectedImage) || sending}
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

// Styles
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
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  typingText: {
    fontSize: 12,
    color: Colors.light.tint,
    fontStyle: 'italic',
  },
  messagesList: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    maxWidth: MESSAGE_WIDTH,
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageBubble: {
    borderRadius: 20,
    padding: 12,
    maxWidth: '100%',
  },
  ownBubble: {
    backgroundColor: Colors.light.tint,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.5)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  selectedImageContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  mediaButton: {
    padding: 10,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    marginHorizontal: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
