// frontend/types/index.ts

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';



// Types pour les entités principales
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Like = Database['public']['Tables']['likes']['Row'];
export type Follow = Database['public']['Tables']['follows']['Row'];
export type Story = Database['public']['Tables']['stories']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];

// Types pour les jointures courantes
export interface PostWithRelations extends Post {
  profile: Profile;
  likes?: Like[];
  comments?: Comment[];
  hashtags?: string[];
}

export interface CommentWithRelations extends Comment {
  profile: Profile;
  post: Post;
  replies?: CommentWithRelations[];
}

export interface ConversationWithRelations extends Conversation {
  participants: (ConversationParticipant & { profile: Profile })[];
  messages: (Message & { sender: Profile })[];
  last_message?: Message & { sender: Profile };
}

export interface StoryWithRelations extends Story {
  profile: Profile;
  views?: (StoryView & { profile: Profile })[];
}

// Types spécifiques aux relations
export type ConversationParticipant = Database['public']['Tables']['conversation_participants']['Row'];
export type StoryView = Database['public']['Tables']['story_views']['Row'];

// Types pour les structures de données
export type NotificationType = 'follow' | 'like' | 'comment' | 'mention' | 'message' | 'story_mention' | 'story_view' | 'follow_request';
export type ResourceType = 'post' | 'comment' | 'story' | 'message' | 'profile';

export interface NotificationWithRelations extends Notification {
  sender?: Profile;
  post?: Post;
  comment?: Comment;
  story?: Story;
}

export interface UserStats {
  user_id: string;
  username: string;
  joined_at: string;
  total_posts: number;
  total_likes_received: number;
  total_comments_received: number;
  followers_count: number;
  following_count: number;
  total_engagement: number;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          email: string | null;
          created_at: string;
          updated_at: string | null;
          website: string | null;
          location: string | null;
          is_private: boolean;
          is_verified: boolean;
          followers_count: number;
          following_count: number;
          posts_count: number;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string | null;
          website?: string | null;
          location?: string | null;
          is_private?: boolean;
          is_verified?: boolean;
          followers_count?: number;
          following_count?: number;
          posts_count?: number;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string | null;
          website?: string | null;
          location?: string | null;
          is_private?: boolean;
          is_verified?: boolean;
          followers_count?: number;
          following_count?: number;
          posts_count?: number;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          content: string | null;
          file_url: string | null;
          location: string | null;
          tags: string[] | null;
          mentions: string[] | null;
          created_at: string;
          updated_at: string | null;
          likes_count: number;
          comments_count: number;
          shares_count: number;
          is_edited: boolean;
          is_private: boolean;
          media_type: 'image' | 'video' | 'audio' | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          content?: string | null;
          file_url?: string | null;
          location?: string | null;
          tags?: string[] | null;
          mentions?: string[] | null;
          created_at?: string;
          updated_at?: string | null;
          likes_count?: number;
          comments_count?: number;
          shares_count?: number;
          is_edited?: boolean;
          is_private?: boolean;
          media_type?: 'image' | 'video' | 'audio' | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string | null;
          file_url?: string | null;
          location?: string | null;
          tags?: string[] | null;
          mentions?: string[] | null;
          created_at?: string;
          updated_at?: string | null;
          likes_count?: number;
          comments_count?: number;
          shares_count?: number;
          is_edited?: boolean;
          is_private?: boolean;
          media_type?: 'image' | 'video' | 'audio' | null;
        };
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string | null;
          parent_id: string | null;
          likes_count: number;
          is_edited: boolean;
          mentions: string[] | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string | null;
          parent_id?: string | null;
          likes_count?: number;
          is_edited?: boolean;
          mentions?: string[] | null;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string | null;
          parent_id?: string | null;
          likes_count?: number;
          is_edited?: boolean;
          mentions?: string[] | null;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
          status: 'pending' | 'accepted' | 'rejected';
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
          status?: 'pending' | 'accepted' | 'rejected';
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
          status?: 'pending' | 'accepted' | 'rejected';
        };
      };
      stories: {
        Row: {
          id: string;
          user_id: string;
          media_url: string;
          media_type: 'image' | 'video';
          caption: string | null;
          location: string | null;
          mentions: string[] | null;
          created_at: string;
          expires_at: string;
          views_count: number;
          is_highlighted: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          media_url: string;
          media_type: 'image' | 'video';
          caption?: string | null;
          location?: string | null;
          mentions?: string[] | null;
          created_at?: string;
          expires_at: string;
          views_count?: number;
          is_highlighted?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          media_url?: string;
          media_type?: 'image' | 'video';
          caption?: string | null;
          location?: string | null;
          mentions?: string[] | null;
          created_at?: string;
          expires_at?: string;
          views_count?: number;
          is_highlighted?: boolean;
        };
      };
      story_views: {
        Row: {
          id: string;
          story_id: string;
          user_id: string;
          created_at: string;
          reaction: string | null;
        };
        Insert: {
          id?: string;
          story_id: string;
          user_id: string;
          created_at?: string;
          reaction?: string | null;
        };
        Update: {
          id?: string;
          story_id?: string;
          user_id?: string;
          created_at?: string;
          reaction?: string | null;
        };
      };
      conversations: {
        Row: {
          id: string;
          created_by: string;
          type: 'direct' | 'group';
          title: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string | null;
          last_message_at: string | null;
          is_group: boolean;
          group_admin_id: string | null;
          participant1_id: string | null;  
          participant2_id: string | null;  
        };
        Insert: {
          id?: string;
          created_by: string;
          type?: 'direct' | 'group';
          title?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string | null;
          last_message_at?: string | null;
          is_group?: boolean;
          group_admin_id?: string | null;
          participant1_id: string | null;  
          participant2_id: string | null;  
        };
        Update: {
          id?: string;
          created_by?: string;
          type?: 'direct' | 'group';
          title?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string | null;
          last_message_at?: string | null;
          is_group?: boolean;
          group_admin_id?: string | null;
          participant1_id: string | null;  
          participant2_id: string | null;  
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string | null;
          media_url: string | null;
          media_type: 'image' | 'video' | 'audio' | 'file' | null;
          is_read: boolean;
          is_delivered: boolean;
          reply_to_id: string | null;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content?: string | null;
          media_url?: string | null;
          media_type?: 'image' | 'video' | 'audio' | 'file' | null;
          is_read?: boolean;
          is_delivered?: boolean;
          reply_to_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string | null;
          media_url?: string | null;
          media_type?: 'image' | 'video' | 'audio' | 'file' | null;
          is_read?: boolean;
          is_delivered?: boolean;
          reply_to_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          profile_id: string;
          joined_at: string;
          left_at: string | null;
          role: 'admin' | 'member';
          last_read_at: string | null;
          is_muted: boolean;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          profile_id: string;
          joined_at?: string;
          left_at?: string | null;
          role?: 'admin' | 'member';
          last_read_at?: string | null;
          is_muted?: boolean;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          profile_id?: string;
          joined_at?: string;
          left_at?: string | null;
          role?: 'admin' | 'member';
          last_read_at?: string | null;
          is_muted?: boolean;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          sender_id: string | null;
          type: 'follow' | 'like' | 'comment' | 'mention' | 'message' | 'story_mention' | 'story_view' | 'follow_request';
          resource_type: 'post' | 'comment' | 'story' | 'message' | 'profile';
          resource_id: string | null;
          message: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          sender_id?: string | null;
          type: 'follow' | 'like' | 'comment' | 'mention' | 'message' | 'story_mention' | 'story_view' | 'follow_request';
          resource_type: 'post' | 'comment' | 'story' | 'message' | 'profile';
          resource_id?: string | null;
          message?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          sender_id?: string | null;
          type?: 'follow' | 'like' | 'comment' | 'mention' | 'message' | 'story_mention' | 'story_view' | 'follow_request';
          resource_type?: 'post' | 'comment' | 'story' | 'message' | 'profile';
          resource_id?: string | null;
          message?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      hashtags: {
        Row: {
          id: string;
          name: string;
          post_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          post_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          post_count?: number;
          created_at?: string;
        };
      };
      post_hashtags: {
        Row: {
          post_id: string;
          hashtag_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          hashtag_id: string;
          created_at?: string;
        };
        Update: {
          post_id?: string;
          hashtag_id?: string;
          created_at?: string;
        };
      };
      user_activity_history: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          action_details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          action_details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          action_details?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      user_stats: {
        Row: {
          user_id: string;
          username: string;
          joined_at: string;
          total_posts: number;
          total_likes_received: number;
          total_comments_received: number;
          followers_count: number;
          following_count: number;
          total_engagement: number;
        };
      };
    };
    Functions: {
      search_content: {
        Args: {
          search_query: string;
          search_type?: string;
          limit_val?: number;
          offset_val?: number;
        };
        Returns: {
          item_type: string;
          item_id: string;
          relevance: number;
          content: Json;
        }[];
      };
    };
  };
};

// -------------------------------------------
// 1) Définir deux types de stockage
//    - webStorage : pour navigateur (window.localStorage)
//    - nativeStorage : pour iOS/Android (AsyncStorage)
// -------------------------------------------
const webStorage = {
  getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
  setItem: (key: string, value: string) =>
    Promise.resolve(window.localStorage.setItem(key, value)),
  removeItem: (key: string) =>
    Promise.resolve(window.localStorage.removeItem(key)),
};

const nativeStorage = {
  getItem: AsyncStorage.getItem,
  setItem: AsyncStorage.setItem,
  removeItem: AsyncStorage.removeItem,
};

// -------------------------------------------
// 2) Vos propres clés Supabase
// -------------------------------------------
const supabaseUrl = 'https://ccjtbokqahxmtvlbitak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'; // La clé fournie

// -------------------------------------------
// 3) Créer le client Supabase
//    => Choix dynamique du storage selon la plateforme
// -------------------------------------------
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : nativeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
