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

interface Camera {
  id: string;
  name: string;
  brand: string;
  camera_type: string;
  film_format: string;
  year?: string;
  notes?: string;
  image?: string;
  created_at: string;
}

export default function CollectionScreen() {
  const router = useRouter();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCameras = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cameras`);
      if (response.ok) {
        const data = await response.json();
        setCameras(data);
      }
    } catch (error) {
      console.error('Error fetching cameras:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCameras();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCameras();
  };

  const filteredCameras = cameras.filter(
    (camera) =>
      camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.camera_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteCamera = async (id: string) => {
    Alert.alert(
      'Delete Camera',
      'Are you sure you want to delete this camera from your collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/cameras/${id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                setCameras(cameras.filter((c) => c.id !== id));
              }
            } catch (error) {
              console.error('Error deleting camera:', error);
            }
          },
        },
      ]
    );
  };

  const renderCameraItem = ({ item }: { item: Camera }) => (
    <TouchableOpacity
      style={styles.cameraCard}
      onPress={() => router.push(`/camera/${item.id}`)}
      onLongPress={() => deleteCamera(item.id)}
    >
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cameraImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="camera-outline" size={40} color="#666" />
          </View>
        )}
      </View>
      <View style={styles.cameraInfo}>
        <Text style={styles.cameraName}>{item.name}</Text>
        <Text style={styles.cameraBrand}>{item.brand}</Text>
        <View style={styles.tagContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.camera_type}</Text>
          </View>
          {item.year && (
            <View style={[styles.tag, styles.yearTag]}>
              <Text style={styles.tagText}>{item.year}</Text>
            </View>
          )}
        </View>
        <Text style={styles.filmFormat}>{item.film_format}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#666" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4A574" />
        <Text style={styles.loadingText}>Loading collection...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search cameras..."
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

      {filteredCameras.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={80} color="#444" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No cameras found' : 'Your collection is empty'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try a different search term'
              : 'Add your first vintage camera!'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/add')}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Add Camera</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredCameras}
          renderItem={renderCameraItem}
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
          {filteredCameras.length} camera{filteredCameras.length !== 1 ? 's' : ''} in collection
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
  cameraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cameraImage: {
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
  cameraInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cameraName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraBrand: {
    color: '#D4A574',
    fontSize: 14,
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
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  yearTag: {
    backgroundColor: '#4A3728',
  },
  tagText: {
    color: '#aaa',
    fontSize: 11,
  },
  filmFormat: {
    color: '#888',
    fontSize: 12,
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
