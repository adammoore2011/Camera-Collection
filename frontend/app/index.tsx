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
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme } = useTheme();
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
      style={[styles.cameraCard, { backgroundColor: theme.surface }]}
      onPress={() => router.push(`/camera/${item.id}`)}
      onLongPress={() => deleteCamera(item.id)}
    >
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cameraImage} />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: theme.surfaceLight }]}>
            <Ionicons name="camera-outline" size={40} color={theme.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.cameraInfo}>
        <Text style={[styles.cameraName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.cameraBrand, { color: theme.primary }]}>{item.brand}</Text>
        <View style={styles.tagContainer}>
          <View style={[styles.tag, { backgroundColor: theme.surfaceLight }]}>
            <Text style={[styles.tagText, { color: theme.textSecondary }]}>{item.camera_type}</Text>
          </View>
          {item.year && (
            <View style={[styles.tag, styles.yearTag, { backgroundColor: theme.primary + '30' }]}>
              <Text style={[styles.tagText, { color: theme.primary }]}>{item.year}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.filmFormat, { color: theme.textSecondary }]}>{item.film_format}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.textMuted} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading collection...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search cameras..."
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

      {filteredCameras.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={80} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {searchQuery ? 'No cameras found' : 'Your collection is empty'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            {searchQuery
              ? 'Try a different search term'
              : 'Add your first vintage camera!'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary }]}
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
              tintColor={theme.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={[styles.statsBar, { backgroundColor: theme.tabBar, borderTopColor: theme.border }]}>
        <Text style={[styles.statsText, { color: theme.textSecondary }]}>
          {filteredCameras.length} camera{filteredCameras.length !== 1 ? 's' : ''} in collection
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
  cameraCard: {
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
  },
  cameraImage: {
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
  cameraInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cameraName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraBrand: {
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
  yearTag: {},
  tagText: {
    fontSize: 11,
  },
  filmFormat: {
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
