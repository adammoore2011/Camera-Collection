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

interface Accessory {
  id: string;
  name: string;
  brand: string;
  accessory_type: string;
  compatible_with?: string;
  year?: string;
  notes?: string;
  image?: string;
  created_at: string;
}

const accessoryIcons: { [key: string]: string } = {
  'Lens': 'aperture',
  'Filter': 'color-filter',
  'Flash/Strobe': 'flash',
  'Light Meter': 'speedometer',
  'Tripod/Monopod': 'git-commit',
  'Camera Bag/Case': 'bag',
  'Strap': 'link',
  'Battery Grip': 'battery-full',
  'Viewfinder': 'eye',
  'Film Back': 'layers',
  'Lens Hood': 'disc',
  'Cable Release': 'git-branch',
  'Light/Lighting': 'bulb',
  'Reflector': 'sunny',
  'Diffuser': 'cloudy',
  'Memory Card': 'card',
  'Battery': 'battery-half',
  'Charger': 'battery-charging',
  'Cleaning Kit': 'brush',
  'Film Scanner': 'scan',
  'Darkroom Equipment': 'moon',
  'Other': 'cube',
};

export default function AccessoriesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchAccessories = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/accessories`, { headers });
      if (response.ok) {
        const data = await response.json();
        setAccessories(data);
      }
    } catch (error) {
      console.error('Error fetching accessories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAccessories();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccessories();
  };

  const filteredAccessories = accessories.filter(
    (acc) =>
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.accessory_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteAccessory = async (id: string) => {
    Alert.alert(
      'Delete Accessory',
      'Are you sure you want to delete this accessory?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/api/accessories/${id}`, {
                method: 'DELETE',
                headers,
              });
              if (response.ok) {
                setAccessories(accessories.filter((a) => a.id !== id));
              }
            } catch (error) {
              console.error('Error deleting accessory:', error);
            }
          },
        },
      ]
    );
  };

  const getIconName = (type: string): string => {
    return accessoryIcons[type] || 'cube';
  };

  const renderAccessoryItem = ({ item }: { item: Accessory }) => (
    <TouchableOpacity
      style={[styles.accessoryCard, { backgroundColor: theme.surface }]}
      onPress={() => router.push(`/accessory/${item.id}`)}
      onLongPress={() => deleteAccessory(item.id)}
    >
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.accessoryImage} />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: theme.surfaceLight }]}>
            <Ionicons name={getIconName(item.accessory_type) as any} size={36} color={theme.primary} />
          </View>
        )}
      </View>
      <View style={styles.accessoryInfo}>
        <Text style={[styles.accessoryName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.accessoryBrand, { color: theme.primary }]}>{item.brand}</Text>
        <View style={styles.tagContainer}>
          <View style={[styles.tag, { backgroundColor: theme.surfaceLight }]}>
            <Text style={[styles.tagText, { color: theme.textSecondary }]}>{item.accessory_type}</Text>
          </View>
          {item.year && (
            <View style={[styles.tag, { backgroundColor: theme.primary + '30' }]}>
              <Text style={[styles.tagText, { color: theme.primary }]}>{item.year}</Text>
            </View>
          )}
        </View>
        {item.compatible_with && (
          <Text style={[styles.compatibleText, { color: theme.textSecondary }]}>For: {item.compatible_with}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.textMuted} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading accessories...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search accessories..."
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

      {filteredAccessories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase-outline" size={80} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {searchQuery ? 'No accessories found' : 'No accessories yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            {searchQuery
              ? 'Try a different search term'
              : 'Add lenses, bags, lights & more!'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/add')}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Add Accessory</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredAccessories}
          renderItem={renderAccessoryItem}
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
          {filteredAccessories.length} accessor{filteredAccessories.length !== 1 ? 'ies' : 'y'}
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
  accessoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
  },
  accessoryImage: {
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
  accessoryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  accessoryName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  accessoryBrand: {
    fontSize: 13,
    marginTop: 2,
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
  },
  compatibleText: {
    fontSize: 11,
    marginTop: 4,
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
