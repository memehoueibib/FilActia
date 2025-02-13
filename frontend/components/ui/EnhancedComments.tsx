// frontend/components/ui/EnhancedComments.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from './Themed';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
 
type Comment = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profile: {
    username: string;
    avatar_url: string | null;
  };
};
 
type Props = {
  postId: string;
  maxDisplayed?: number;
  showInput?: boolean;
  onCommentAdded?: () => void;
};
 
export default function EnhancedComments({
  postId,
  maxDisplayed = 3,
  showInput = true,
  onCommentAdded
}: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
 
  const { session } = useAuth();
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
 
  useEffect(() => {
    fetchComments();
    subscribeToComments();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);
 
  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profile:profiles(username, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(maxDisplayed);
 
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };
 
  const subscribeToComments = () => {
    const subscription = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`,
      }, () => {
        fetchComments();
      })
      .subscribe();
 
    return () => {
      subscription.unsubscribe();
    };
  };
 
  const handleSend = async () => {
    if (!session?.user || !newComment.trim() || sending) return;
 
    try {
      setSending(true);
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: session.user.id,
          content: newComment.trim(),
          created_at: new Date().toISOString(),
        });
 
      if (error) throw error;
 
      // Mettre à jour le compteur de commentaires
      await supabase
        .from('posts')
        .update({
          comments_count: supabase.rpc('increment')
        })
        .eq('id', postId);
 
      setNewComment('');
      inputRef.current?.blur();
      fetchComments();
      onCommentAdded?.();
 
    } catch (error) {
      console.error('Error sending comment:', error);
      Alert.alert('Erreur', "Impossible d'envoyer le commentaire");
    } finally {
      setSending(false);
    }
  };
 
  const handleViewAll = () => {
    router.push(`/comments/${postId}`);
  };
 
  const renderComment = ({ item }: { item: Comment }) => (
    <Animated.View style={[styles.commentContainer, { opacity: fadeAnim }]}>
      <View style={styles.commentHeader}>
        <Text style={styles.username}>{item.profile.username}</Text>
        <Text style={styles.timestamp}>
          {formatDistanceToNow(new Date(item.created_at), {
            addSuffix: true,
            locale: fr,
          })}
        </Text>
      </View>
      <Text style={styles.content}>{item.content}</Text>
    </Animated.View>
  );
 
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.light.tint} />
      </View>
    );
  }
 
  return (
    <View style={styles.container}>
      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Aucun commentaire pour le moment
          </Text>
        }
      />
 
      {comments.length > 0 && (
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={handleViewAll}
        >
          <Text style={styles.viewAllText}>
            Voir tous les commentaires
          </Text>
        </TouchableOpacity>
      )}
 
      {showInput && session?.user && (
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Ajouter un commentaire..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newComment.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!newComment.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <FontAwesome name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  commentContainer: {
    marginVertical: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontWeight: '600',
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  viewAllButton: {
    paddingVertical: 10,
  },
  viewAllText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    marginRight: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    fontSize: 14,
    color: '#333',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
        elevation: 4,
      },
    }),
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});