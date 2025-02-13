// app/profile/[id]/followers.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Themed';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { Colors } from '@/constants/Colors';
import ProfileCard from '@/components/ui/ProfileCard';
// ou FollowButton ?

export default function FollowersScreen() {
  const { id } = useLocalSearchParams();
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowers();
  }, [id]);

  async function fetchFollowers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower:profiles(*)
        `)
        .eq('following_id', id);

      if (error) throw error;
      const mapped = data.map((row: any) => row.follower);
      setFollowers(mapped);
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={followers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProfileCard profile={item} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text>Aucun follower pour l'instant</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
