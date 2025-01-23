import React, { useState, useEffect } from 'react';
import { View, Text } from './Themed';
import { StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Comment } from '../../types';

type CommentsProps = {
  postId: string;
};

export default function Comments({ postId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  async function fetchComments() {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profile: profiles(*)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            content: newComment.trim(),
          }
        ]);

      if (error) throw error;

      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={comments}
        renderItem={({ item }) => (
          <View style={styles.commentContainer}>
            <Text style={styles.username}>{item.profile?.username}</Text>
            <Text style={styles.content}>{item.content}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newComment}
          onChangeText={setNewComment}
          placeholder="Add a comment..."
          multiline
        />
        <TouchableOpacity 
          style={styles.button}
          onPress={handleAddComment}
          disabled={loading || !newComment.trim()}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  commentContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  username: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  content: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});