import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Themed';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type FollowButtonProps = {
  profileId: string;
  onFollowChange?: (isFollowing: boolean) => void;
};

export default function FollowButton({ profileId, onFollowChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    checkFollowStatus();
  }, [profileId]);

  async function checkFollowStatus() {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', session.user.id)
        .eq('following_id', profileId)
        .single();

      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  }

  async function toggleFollow() {
    if (!session?.user || loading) return;

    setLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', profileId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert([
            {
              follower_id: session.user.id,
              following_id: profileId,
            }
          ]);

        if (error) throw error;
      }

      setIsFollowing(!isFollowing);
      onFollowChange?.(!isFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  }

  if (session?.user?.id === profileId) return null;

  return (
    <TouchableOpacity 
      style={[styles.button, isFollowing ? styles.followingButton : styles.followButton]}
      onPress={toggleFollow}
      disabled={loading}
    >
      <Text style={[styles.buttonText, isFollowing ? styles.followingText : styles.followText]}>
        {loading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  followButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderColor: '#666',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  followText: {
    color: 'white',
  },
  followingText: {
    color: '#666',
  },
});