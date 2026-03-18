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
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL, SESSION_TOKEN_KEY } from '../src/config';

interface Camera {
  id: string;
  name: string;
  brand: string;
  camera_type: string;
  film_format: string;
  year?: string;
  notes?: string;
  image?: string;
  images?: string[];
  created_at: string;
}

interface Options {
  camera_types: string[];
  film_formats: string[];
}

type SortOption = 'newest' | 'oldest' | 'name' | 'brand' | 'year';

export default function CollectionScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [options, setOptions] = useState<Options>({ camera_types: [], film_formats: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchData = async () => {
    try {
      const headers = await getAuthHeaders();
      const [camerasRes, optionsRes] = await Promise.all([
        fetch(`${API_URL}/api/cameras`, { headers }),
        fetch(`${API_URL}/api/options`),
      ]);
      
      if (camerasRes.ok) {
        const data = await camerasRes.json();
        setCameras(data);
      }
      
      if (optionsRes.ok) {
        const opts = await optionsRes.json();
        setOptions(opts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filter and sort cameras
  const filteredCameras = cameras
    .filter((camera) => {
      const matchesSearch = 
        camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (camera.year && camera.year.includes(searchQuery));
      
      const matchesType = !selectedType || camera.camera_type === selectedType;
      const matchesFormat = !selectedFormat || camera.film_format === selectedFormat;
      
      return matchesSearch && matchesType && matchesFormat;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'brand':
          return a.brand.localeCompare(b.brand);
        case 'year':
          return (b.year || '0').localeCompare(a.year || '0');
        default:
          return 0;
      }
    });

  const activeFiltersCount = (selectedType ? 1 : 0) + (selectedFormat ? 1 : 0);

  const clearFilters = () => {
    setSelectedType(null);
    setSelectedFormat(null);
    setSortBy('newest');
  };

  const renderCameraItem = ({ item }: { item: Camera }) => (
    <TouchableOpacity
      style={[styles.cameraCard, { backgroundColor: theme.surface }]}
      onPress={() => router.push(`/camera/${item.id}`)}
    >
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cameraImage} />
        ) : item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.cameraImage} />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: theme.surfaceLight }]}>
            <Ionicons name="camera-outline" size={40} color={theme.textMuted} />
          </View>
        )}
        {item.images && item.images.length > 1 && (
          <View style={[styles.imageCountBadge, { backgroundColor: theme.primary }]}>
            <Ionicons name="images" size={10} color="#fff" />
            <Text style={styles.imageCountText}>{item.images.length}</Text>
          </View>
        )}
      </View>
      <View style={styles.cameraInfo}>
        <Text style={[styles.cameraName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.cameraBrand, { color: theme.primary }]}>{item.brand}</Text>
        <View style={styles.tagContainer}>
          <View style={[styles.tag, { backgroundColor: theme.surfaceLight }]}>
            <Text style={[styles.tagText, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.camera_type}
            </Text>
          </View>
          {item.year && (
            <View style={[styles.tag, styles.yearTag, { backgroundColor: theme.primary + '30' }]}>
              <Text style={[styles.tagText, { color: theme.primary }]}>{item.year}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.filmFormat, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.film_format}
        </Text>
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
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search by name, brand, or year..."
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

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: theme.surface },
            activeFiltersCount > 0 && { borderColor: theme.primary, borderWidth: 1 }
          ]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={18} color={theme.text} />
          <Text style={[styles.filterButtonText, { color: theme.text }]}>Filters</Text>
          {activeFiltersCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: theme.surface }]}
          onPress={() => {
            const sortOptions: SortOption[] = ['newest', 'oldest', 'name', 'brand', 'year'];
            const currentIndex = sortOptions.indexOf(sortBy);
            const nextIndex = (currentIndex + 1) % sortOptions.length;
            setSortBy(sortOptions[nextIndex]);
          }}
        >
          <Ionicons name="swap-vertical" size={18} color={theme.text} />
          <Text style={[styles.sortButtonText, { color: theme.text }]}>
            {sortBy === 'newest' ? 'Newest' : 
             sortBy === 'oldest' ? 'Oldest' :
             sortBy === 'name' ? 'Name' :
             sortBy === 'brand' ? 'Brand' : 'Year'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {(selectedType || selectedFormat) && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.activeFiltersContainer}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {selectedType && (
            <TouchableOpacity
              style={[styles.activeFilterChip, { backgroundColor: theme.primary + '30' }]}
              onPress={() => setSelectedType(null)}
            >
              <Text style={[styles.activeFilterText, { color: theme.primary }]}>{selectedType}</Text>
              <Ionicons name="close" size={14} color={theme.primary} />
            </TouchableOpacity>
          )}
          {selectedFormat && (
            <TouchableOpacity
              style={[styles.activeFilterChip, { backgroundColor: theme.primary + '30' }]}
              onPress={() => setSelectedFormat(null)}
            >
              <Text style={[styles.activeFilterText, { color: theme.primary }]}>{selectedFormat}</Text>
              <Ionicons name="close" size={14} color={theme.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearFilters}>
            <Text style={[styles.clearAllText, { color: theme.error }]}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Camera List */}
      {filteredCameras.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={80} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {searchQuery || selectedType || selectedFormat ? 'No cameras found' : 'Your collection is empty'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            {searchQuery || selectedType || selectedFormat
              ? 'Try different search or filter criteria'
              : 'Add your first vintage camera!'}
          </Text>
          {!searchQuery && !selectedType && !selectedFormat && (
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

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: theme.tabBar, borderTopColor: theme.border }]}>
        <Text style={[styles.statsText, { color: theme.textSecondary }]}>
          {filteredCameras.length} of {cameras.length} camera{cameras.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Camera Type Filter */}
              <Text style={[styles.filterSectionTitle, { color: theme.primary }]}>Camera Type</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { backgroundColor: theme.surface },
                    !selectedType && { borderColor: theme.primary, borderWidth: 2 }
                  ]}
                  onPress={() => setSelectedType(null)}
                >
                  <Text style={[styles.filterOptionText, { color: theme.text }]}>All Types</Text>
                </TouchableOpacity>
                {options.camera_types.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      { backgroundColor: theme.surface },
                      selectedType === type && { borderColor: theme.primary, borderWidth: 2 }
                    ]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text style={[styles.filterOptionText, { color: theme.text }]} numberOfLines={1}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Film Format Filter */}
              <Text style={[styles.filterSectionTitle, { color: theme.primary, marginTop: 20 }]}>
                Film Format
              </Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { backgroundColor: theme.surface },
                    !selectedFormat && { borderColor: theme.primary, borderWidth: 2 }
                  ]}
                  onPress={() => setSelectedFormat(null)}
                >
                  <Text style={[styles.filterOptionText, { color: theme.text }]}>All Formats</Text>
                </TouchableOpacity>
                {options.film_formats.map((format) => (
                  <TouchableOpacity
                    key={format}
                    style={[
                      styles.filterOption,
                      { backgroundColor: theme.surface },
                      selectedFormat === format && { borderColor: theme.primary, borderWidth: 2 }
                    ]}
                    onPress={() => setSelectedFormat(format)}
                  >
                    <Text style={[styles.filterOptionText, { color: theme.text }]} numberOfLines={1}>
                      {format}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.surface }]}
                onPress={clearFilters}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 8,
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
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  filterBadge: {
    marginLeft: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sortButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  activeFiltersContainer: {
    maxHeight: 40,
    marginBottom: 8,
  },
  activeFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  activeFilterText: {
    fontSize: 12,
    marginRight: 4,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
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
    position: 'relative',
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
  imageCountBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
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
    maxWidth: 100,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 4,
  },
  filterOptionText: {
    fontSize: 13,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
