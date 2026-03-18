import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL, SESSION_TOKEN_KEY } from '../src/config';
import { getAuthHeaders } from '../src/contexts/AuthContext';

interface WishlistItem {
  id: string;
  name: string;
  brand: string;
  camera_type: string;
  film_format: string;
  year?: string;
  notes?: string;
  image?: string;
  priority: string;
  created_at: string;
}

export default function WishlistScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const priorityColors = {
    high: theme.priorityHigh,
    medium: theme.priorityMedium,
    low: theme.priorityLow,
  };


  const fetchWishlist = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/wishlist`, { headers });
      if (response.ok) {
        const data = await response.json();
        setWishlist(data);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWishlist();
  };

  const filteredWishlist = wishlist.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.camera_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteItem = async (id: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/api/wishlist/${id}`, {
                method: 'DELETE',
                headers,
              });
              if (response.ok) {
                setWishlist(wishlist.filter((item) => item.id !== id));
              }
            } catch (error) {
              console.error('Error deleting item:', error);
            }
          },
        },
      ]
    );
  };

  const moveToCollection = async (id: string) => {
    Alert.alert(
      'Add to Collection',
      'Move this camera to your collection? (You acquired it!)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Collection',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_URL}/api/wishlist/${id}/to-collection`,
                { method: 'POST', headers }
              );
              if (response.ok) {
                setWishlist(wishlist.filter((item) => item.id !== id));
                Alert.alert('Success', 'Camera added to your collection!');
              }
            } catch (error) {
              console.error('Error moving to collection:', error);
            }
          },
        },
      ]
    );
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: theme.surface }]}
      onPress={() => router.push(`/wishlist-item/${item.id}`)}
      onLongPress={() => deleteItem(item.id)}
    >
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImage} />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: theme.surfaceLight }]}>
            <Ionicons name="heart-outline" size={40} color={theme.textMuted} />
          </View>
        )}
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: priorityColors[item.priority as keyof typeof priorityColors] },
          ]}
        >
          <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.itemBrand, { color: theme.primary }]}>{item.brand}</Text>
        <View style={styles.tagContainer}>
          <View style={[styles.tag, { backgroundColor: theme.surfaceLight }]}>
            <Text style={[styles.tagText, { color: theme.textSecondary }]}>{item.camera_type}</Text>
          </View>
        </View>
        <Text style={[styles.filmFormat, { color: theme.textSecondary }]}>{item.film_format}</Text>
      </View>
      <TouchableOpacity
        style={styles.moveButton}
        onPress={() => moveToCollection(item.id)}
      >
        <Ionicons name="checkmark-circle" size={28} color={theme.success} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading wishlist...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search wishlist..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {filteredWishlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {searchQuery ? 'No items found' : 'Your wishlist is empty'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            {searchQuery
              ? 'Try a different search term'
              : 'Add cameras you dream of owning!'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/add')}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Add to Wishlist</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredWishlist}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={[styles.statsBar, { backgroundColor: theme.tabBar, borderTopColor: theme.border }]}>
        <Text style={[styles.statsText, { color: theme.textSecondary }]}>
          {filteredWishlist.length} item{filteredWishlist.length !== 1 ? 's' : ''} on wishlist
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemBrand: {
    fontSize: 14,
    marginTop: 2,
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
  },
  filmFormat: {
    fontSize: 12,
    marginTop: 4,
  },
  moveButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 24,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  statsText: {
    fontSize: 14,
  },
});
