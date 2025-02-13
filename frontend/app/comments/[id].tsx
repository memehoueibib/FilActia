// app/comments/[id].tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Text } from '@/components/ui/Themed';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
};

export default function CommentsScreen() {
  const { id: postId } = useLocalSearchParams();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchComments();
    const subscription = subscribeToComments();
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profile:profiles(username, avatar_url, full_name)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Erreur', 'Impossible de charger les commentaires');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const subscribeToComments = () => {
    return supabase
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
  };

  const handleSend = async () => {
    if (!session?.user || !newComment.trim() || sending) return;

    setSending(true);
    try {
      const { error: commentError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: session.user.id,
          content: newComment.trim(),
          created_at: new Date().toISOString(),
        });

      if (commentError) throw commentError;

      // Mettre à jour le compteur
      await supabase
        .from('posts')
        .update({ comments_count: supabase.rpc('increment') })
        .eq('id', postId);

      setNewComment('');
      inputRef.current?.blur();
      
      // Scroll vers le haut car les commentaires sont en ordre décroissant
      scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
      
      // Fetch immédiat pour avoir le nouveau commentaire
      fetchComments();

    } catch (error) {
      console.error('Error sending comment:', error);
      Alert.alert('Erreur', "Impossible d'envoyer le commentaire");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', session?.user?.id); // Sécurité supplémentaire

      if (error) throw error;

      // Décrémenter le compteur
      await supabase
        .from('posts')
        .update({ comments_count: supabase.rpc('decrement') })
        .eq('id', postId);

      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Erreur', 'Impossible de supprimer le commentaire');
    }
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const isOwn = item.user_id === session?.user?.id;

    return (
      <Animated.View 
        style={[
          styles.commentContainer,
          { opacity: fadeAnim }
        ]}
      >
        <Image
          source={{ uri: item.profile.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <View style={styles.userInfo}>
              <Text style={styles.username}>
                {item.profile.full_name || item.profile.username}
              </Text>
              {item.profile.username && (
                <Text style={styles.usernameHandle}>
                  @{item.profile.username}
                </Text>
              )}
            </View>
            <Text style={styles.timestamp}>
              {formatDistanceToNow(new Date(item.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </Text>
          </View>
          
          <Text style={styles.commentText}>{item.content}</Text>
          
          {isOwn && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert(
                  'Supprimer le commentaire',
                  'Êtes-vous sûr de vouloir supprimer ce commentaire ?',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { 
                      text: 'Supprimer',
                      style: 'destructive',
                      onPress: () => handleDeleteComment(item.id)
                    }
                  ]
                );
              }}
            >
              <FontAwesome name="trash-o" size={14} color="#ff4444" />
              <Text style={styles.deleteText}>Supprimer</Text>
            </TouchableOpacity>
          )}
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={scrollRef}
        data={comments}
        renderItem={renderComment}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 }
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Aucun commentaire pour le moment
            </Text>
            <Text style={styles.emptySubtext}>
              Soyez le premier à commenter !
            </Text>
          </View>
        }
      />

      <View style={[
        styles.inputContainer,
        { paddingBottom: Math.max(insets.bottom, 20) }
      ]}>
        <Image
          source={{ 
            uri: session?.user?.user_metadata?.avatar_url || 
                'https://via.placeholder.com/32'
          }}
          style={styles.inputAvatar}
        />
        
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Ajouter un commentaire..."
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
          placeholderTextColor="#999"
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
            <FontAwesome name="send" size={16} color="#fff" />
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
  listContent: {
    padding: 15,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  username: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  usernameHandle: {
    fontSize: 12,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  commentText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#333',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    padding: 4,
  },
  deleteText: {
    fontSize: 12,
    color: '#ff4444',
    marginLeft: 4,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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