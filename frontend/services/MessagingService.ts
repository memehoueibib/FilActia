// services/MessagingService.ts

import { supabase } from '@/lib/supabase';
import NotificationService from './NotificationService';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  media_url?: string;
  media_type?: string;
  sender?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  created_by: string;
  title?: string;
  avatar_url?: string;
  last_message_at: string;
  last_message?: Message;
  participant?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  participants?: {
    profile: {
      id: string;
      username: string;
      avatar_url: string | null;
    };
  }[];
  unread_count: number;
  is_group: boolean;
  group_admin_id?: string;
}

class MessagingService {
  private static instance: MessagingService;
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService();
    }
    return MessagingService.instance;
  }

  // Récupérer ou créer une conversation "direct"
  public async getOrCreateConversation(
    currentUserId: string,
    otherUserId: string
  ): Promise<string> {
    try {
      // Vérifier si conversation directe existe
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'direct')
        .eq('is_group', false)
        .or(
          `and(participant1_id.eq.${currentUserId},participant2_id.eq.${otherUserId}),` +
          `and(participant1_id.eq.${otherUserId},participant2_id.eq.${currentUserId})`
        )
        .single();

      if (existingConv) {
        return existingConv.id;
      }

      // Créer conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          created_by: currentUserId,
          type: 'direct',
          is_group: false,
          participant1_id: currentUserId,
          participant2_id: otherUserId,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (convError) throw convError;

      // Ajouter participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: newConv.id,
            profile_id: currentUserId,
            role: 'member'
          },
          {
            conversation_id: newConv.id,
            profile_id: otherUserId,
            role: 'member'
          }
        ]);

      if (participantsError) throw participantsError;

      return newConv.id;
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      throw error;
    }
  }

  // Récupérer toutes les conversations d’un user
  public async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation:conversations(
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
            messages(
              id,
              content,
              created_at,
              sender_id,
              is_read,
              media_url,
              media_type,
              sender:profiles(
                id,
                username,
                avatar_url
              )
            )
          )
        `)
        .eq('profile_id', userId)
        .order('conversation(last_message_at)', { ascending: false });

      if (partError) throw partError;

      const conversations = participations
        .map(p => p.conversation)
        .filter(conv => conv) as Conversation[];

      return conversations.map(conv => ({
        ...conv,
        unread_count: (conv.messages || []).filter(
          m => !m.is_read && m.sender_id !== userId
        ).length,
        last_message: conv.messages?.[0]
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  // Récupérer les messages d’une conversation
  public async getMessages(
    conversationId: string,
    limit = 50,
    startAfter?: string
  ): Promise<Message[]> {
    try {
      let query = supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          is_read,
          media_url,
          media_type,
          sender:profiles(
            id,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (startAfter) {
        query = query.lt('created_at', startAfter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  // Marquer les messages comme lus
  public async markMessagesAsRead(conversationId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Envoyer un message (texte ou image)
  public async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    mediaUrl?: string,
    mediaType?: string
  ): Promise<Message> {
    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: content.trim(),
          media_url: mediaUrl,
          media_type: mediaType,
          is_read: false
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          is_read,
          media_url,
          media_type,
          sender:profiles(
            id,
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Mettre à jour last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Supprimer un message (seulement si on est le sender)
  public async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

export default MessagingService;
