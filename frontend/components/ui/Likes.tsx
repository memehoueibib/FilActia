import React, { useState, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { Text } from './Themed';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type LikesProps = {
  postId: string;
  initialCount?: number;
};

export default function Likes({ postId, initialCount = 0 }: LikesProps) {
  const [likesCount, setLikesCount] = useState(initialCount);
  const [isLiked, setIsLiked] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    checkIfLiked();
    fetchLikesCount();
  }, [postId]);

  async function checkIfLiked() {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', session?.user.id)
        .single();

      if (error) throw error;
      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  }

  async function fetchLikesCount() {
    try {
      const { count, error } = await supabase
        .from('likes')
        .select('id', { count: 'exact' })
        .eq('post_id', postId);

      if (error) throw error;
      setLikesCount(count || 0);
    } catch (error) {
      console.error('Error fetching likes count:', error);
    }
  }

  async function toggleLike() {
    if (!session?.user) return;

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', session.user.id);

        if (error) throw error;
        setLikesCount(prev => prev - 1);
      } else {
        const { error } = await supabase
          .from('likes')
          .insert([
            {
              post_id: postId,
              user_id: session.user.id,
            }
          ]);

        if (error) throw error;
        setLikesCount(prev => prev + 1);
      }

      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }

  return (
    <TouchableOpacity onPress={toggleLike} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <FontAwesome
        name={isLiked ? 'heart' : 'heart-o'}
        size={20}
        color={isLiked ? '#e74c3c' : '#666'}
      />
      <Text style={{ marginLeft: 5, color: '#666' }}>{likesCount}</Text>
    </TouchableOpacity>
  );
}