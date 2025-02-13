// frontend/components/ui/EnhancedNotifications.tsx
// Composant amélioré pour l'affichage des notifications avec animations et interactions

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  RefreshControl,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Text } from './Themed';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import NotificationService, { NotificationType, Notification } from '../../services/NotificationService';

export default function EnhancedNotifications() {
  // États
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation pour le badge non lu
  const unreadIndicator = useRef(new Animated.Value(0)).current;
  
  const { session } = useAuth();
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
      // Initialiser le service de notification
      notificationService.initialize(session.user.id);
    }
  }, [session]);

  // Écouteur pour les nouvelles notifications
  useEffect(() => {
    const handleNewNotification = (event: Event) => {
      const notification = (event as CustomEvent).detail;
      setNotifications(prev => [notification, ...prev]);
      animateUnreadIndicator();
    };

    document.addEventListener('newNotification', handleNewNotification);
    return () => {
      document.removeEventListener('newNotification', handleNewNotification);
    };
  }, []);

  // Animation de l'indicateur non lu
  const animateUnreadIndicator = () => {
    Animated.sequence([
      Animated.spring(unreadIndicator, {
        toValue: 1.2,
        useNativeDriver: true,
        speed: 50,
        bounciness: 12
      }),
      Animated.spring(unreadIndicator, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50
      })
    ]).start();
  };

  // Récupérer les notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!notifications_actor_id_fkey(
            username,
            avatar_url
          )
        `)
        .eq('recipient_id', session?.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Rafraîchir les notifications
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  // Gérer le clic sur une notification
  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Marquer comme lue
      await notificationService.markAsRead(notification.id);

      // Redirection selon le type
      switch (notification.type) {
        case NotificationType.LIKE:
        case NotificationType.COMMENT:
          if (notification.post_id) {
            router.push(`/post/${notification.post_id}`);
          }
          break;
        case NotificationType.FOLLOW:
          if (notification.actor_id) {
            router.push(`/profile/${notification.actor_id}`);
          }
          break;
        case NotificationType.MESSAGE:
          if (notification.message_id) {
            router.push(`/messages/${notification.message_id}`);
          }
          break;
      }

      // Mettre à jour la liste
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Erreur lors du traitement de la notification:', error);
    }
  };

  // Rendu d'une notification
  const renderNotification = ({ item }: { item: Notification }) => {
    const isUnread = !item.read;

    return (
      <Animated.View style={[
        styles.notificationItem,
        isUnread && {
          transform: [{ scale: unreadIndicator }],
          backgroundColor: '#f0f8ff'
        }
      ]}>
        <TouchableOpacity
          style={styles.notificationContent}
          onPress={() => handleNotificationPress(item)}
        >
          <Image
            source={{ 
              uri: item.actor?.avatar_url || 'https://via.placeholder.com/40'
            }}
            style={styles.avatar}
          />
          
          <View style={styles.textContainer}>
            <Text style={styles.username}>
              {item.actor?.username}
            </Text>
            
            <Text style={styles.notificationText}>
              {(() => {
                switch (item.type) {
                  case NotificationType.LIKE:
                    return 'a aimé votre publication';
                  case NotificationType.COMMENT:
                    return 'a commenté votre publication';
                  case NotificationType.FOLLOW:
                    return 'a commencé à vous suivre';
                  case NotificationType.MESSAGE:
                    return 'vous a envoyé un message';
                  default:
                    return '';
                }
              })()}
            </Text>

            <Text style={styles.timestamp}>
              {formatDistanceToNow(new Date(item.created_at), {
                addSuffix: true,
                locale: fr
              })}
            </Text>
          </View>

          {isUnread && (
            <View style={styles.unreadDot} />
          )}
        </TouchableOpacity>
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
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.light.tint}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome
              name="bell-o"
              size={48}
              color={Colors.light.icon}
            />
            <Text style={styles.emptyText}>
              Aucune notification pour le moment
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
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
    flexGrow: 1,
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  username: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
  },
  notificationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.tint,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
  },
});