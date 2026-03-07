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

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
  const router = useRouter();
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAccessories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/accessories`);
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
              const response = await fetch(`${API_URL}/api/accessories/${id}`, {
                method: 'DELETE',
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
      style={styles.accessoryCard}
      onPress={() => router.push(`/accessory/${item.id}`)}
      onLongPress={() => deleteAccessory(item.id)}
    >
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.accessoryImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name={getIconName(item.accessory_type) as any} size={36} color="#D4A574" />
          </View>
        )}
      </View>
      <View style={styles.accessoryInfo}>
        <Text style={styles.accessoryName}>{item.name}</Text>
        <Text style={styles.accessoryBrand}>{item.brand}</Text>
        <View style={styles.tagContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.accessory_type}</Text>
          </View>
          {item.year && (
            <View style={[styles.tag, styles.yearTag]}>
              <Text style={styles.tagText}>{item.year}</Text>
            </View>
          )}
        </View>
        {item.compatible_with && (
          <Text style={styles.compatibleText}>For: {item.compatible_with}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color="#666" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4A574" />
        <Text style={styles.loadingText}>Loading accessories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search accessories..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {filteredAccessories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase-outline" size={80} color="#444" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No accessories found' : 'No accessories yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try a different search term'
              : 'Add lenses, bags, lights & more!'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.addButton}
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
              tintColor="#D4A574"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredAccessories.length} accessor{filteredAccessories.length !== 1 ? 'ies' : 'y'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
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
    color: '#fff',
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  accessoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
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
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessoryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  accessoryName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  accessoryBrand: {
    color: '#D4A574',
    fontSize: 13,
    marginTop: 2,
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  yearTag: {
    backgroundColor: '#4A3728',
  },
  tagText: {
    color: '#aaa',
    fontSize: 10,
  },
  compatibleText: {
    color: '#888',
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
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4A574',
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
    backgroundColor: '#1A1A1A',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statsText: {
    color: '#888',
    fontSize: 14,
  },
});
