import { useState } from 'react';
import { StyleSheet, FlatList, TextInput } from 'react-native';
import { View } from '../../components/ui/Themed';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { ProfileCard } from '../../components/ui/ProfileCard';

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  async function searchProfiles(query: string) {
    if (!query.trim()) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error searching profiles:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search users..."
        value={searchQuery}
        onChangeText={text => {
          setSearchQuery(text);
          searchProfiles(text);
        }}
      />
      <FlatList
        data={profiles}
        renderItem={({ item }) => <ProfileCard profile={item} />}
        keyExtractor={(item) => item.id}
        refreshing={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
});