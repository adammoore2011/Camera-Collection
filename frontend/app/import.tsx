import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, SESSION_TOKEN_KEY } from '../src/config';

interface CameraData {
  name: string;
  brand: string;
  year?: string | null;
  camera_type: string;
  film_format: string;
  notes?: string;
}

interface BrandInfo {
  name: string;
  count?: number;
}

export default function ImportScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  
  // State
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [selectedCameras, setSelectedCameras] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Loading states
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Modal state
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [importTarget, setImportTarget] = useState<'collection' | 'wishlist'>('wishlist');

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Fetch available brands on mount
  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await fetch(`${API_URL}/api/camera-database`);
      if (response.ok) {
        const data = await response.json();
        setBrands(data.brands || []);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
      Alert.alert('Error', 'Failed to load camera brands');
    } finally {
      setLoadingBrands(false);
    }
  };

  // Fetch cameras for selected brand
  const fetchCamerasForBrand = async (brand: string) => {
    setLoadingCameras(true);
    setCameras([]);
    setSelectedCameras(new Set());
    setSearchQuery('');
    
    try {
      const response = await fetch(`${API_URL}/api/camera-database/${encodeURIComponent(brand)}`);
      if (response.ok) {
        const data = await response.json();
        setCameras(data.cameras || []);
      } else {
        Alert.alert('Error', `Failed to load cameras for ${brand}`);
      }
    } catch (error) {
      console.error('Error fetching cameras:', error);
      Alert.alert('Error', `Failed to load cameras for ${brand}`);
    } finally {
      setLoadingCameras(false);
    }
  };

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand);
    setShowBrandPicker(false);
    fetchCamerasForBrand(brand);
  };

  const toggleCamera = (index: number) => {
    const newSelected = new Set(selectedCameras);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedCameras(newSelected);
  };

  const selectAll = () => {
    const filtered = filteredCameras;
    if (selectedCameras.size === filtered.length && filtered.length > 0) {
      setSelectedCameras(new Set());
    } else {
      const allIndices = filtered.map((_, i) => cameras.indexOf(filtered[i]));
      setSelectedCameras(new Set(allIndices));
    }
  };

  const importSelected = async (target: 'collection' | 'wishlist') => {
    if (selectedCameras.size === 0) {
      Alert.alert('No Selection', 'Please select cameras to import');
      return;
    }

    const targetName = target === 'collection' ? 'Collection' : 'Wishlist';
    
    Alert.alert(
      `Add to ${targetName}`,
      `Add ${selectedCameras.size} camera(s) to your ${targetName.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            setImporting(true);
            try {
              const headers = await getAuthHeaders();
              const selectedData = Array.from(selectedCameras).map(i => cameras[i]);
              
              let successCount = 0;
              let failCount = 0;
              
              // Add cameras one by one
              for (const camera of selectedData) {
                const endpoint = target === 'collection' ? '/api/cameras' : '/api/wishlist';
                const body = {
                  name: camera.name,
                  brand: camera.brand,
                  camera_type: camera.camera_type,
                  film_format: camera.film_format,
                  year: camera.year || null,
                  notes: camera.notes || null,
                  image: null,
                  images: [],
                };
                
                if (target === 'wishlist') {
                  (body as any).priority = 'medium';
                }
                
                try {
                  const response = await fetch(`${API_URL}${endpoint}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...headers,
                    },
                    body: JSON.stringify(body),
                  });
                  
                  if (response.ok) {
                    successCount++;
                  } else {
                    failCount++;
                  }
                } catch (e) {
                  failCount++;
                }
              }

              if (successCount > 0) {
                Alert.alert(
                  'Import Complete',
                  `Added ${successCount} camera(s) to your ${targetName.toLowerCase()}${failCount > 0 ? ` (${failCount} failed)` : ''}`,
                  [
                    { text: 'OK', style: 'default' },
                    { 
                      text: `View ${targetName}`, 
                      onPress: () => router.push(target === 'collection' ? '/' : '/wishlist') 
                    }
                  ]
                );
                setSelectedCameras(new Set());
              } else {
                Alert.alert('Error', 'Failed to import cameras. Please try again.');
              }
            } catch (error) {
              console.error('Import error:', error);
              Alert.alert('Error', 'Failed to import cameras');
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  };

  const filteredCameras = cameras.filter(camera =>
    camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (camera.year && camera.year.toLowerCase().includes(searchQuery.toLowerCase())) ||
    camera.film_format.toLowerCase().includes(searchQuery.toLowerCase()) ||
    camera.camera_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Brand Picker Modal
  const renderBrandPicker = () => (
    <Modal
      visible={showBrandPicker}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBrandPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Brand</Text>
            <TouchableOpacity onPress={() => setShowBrandPicker(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={brands}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.brandItem,
                  { backgroundColor: theme.surfaceLight },
                  selectedBrand === item && { backgroundColor: theme.primary + '30' }
                ]}
                onPress={() => handleBrandSelect(item)}
              >
                <Text style={[
                  styles.brandItemText,
                  { color: theme.text },
                  selectedBrand === item && { color: theme.primary, fontWeight: 'bold' }
                ]}>
                  {item}
                </Text>
                {selectedBrand === item && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ padding: 16 }}
          />
        </View>
      </View>
    </Modal>
  );

  // Loading brands state
  if (loadingBrands) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading camera database...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderBrandPicker()}
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Camera Database</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {brands.length} brands available
          </Text>
        </View>
      </View>

      {/* Brand Selector */}
      <TouchableOpacity
        style={[styles.brandSelector, { backgroundColor: theme.surface }]}
        onPress={() => setShowBrandPicker(true)}
      >
        <View style={styles.brandSelectorContent}>
          <Ionicons name="camera" size={24} color={theme.primary} />
          <View style={styles.brandSelectorText}>
            <Text style={[styles.brandSelectorLabel, { color: theme.textSecondary }]}>
              Select Brand
            </Text>
            <Text style={[styles.brandSelectorValue, { color: theme.text }]}>
              {selectedBrand || 'Choose a brand to browse cameras'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={24} color={theme.textSecondary} />
      </TouchableOpacity>

      {/* Content */}
      {!selectedBrand ? (
        // No brand selected - show intro
        <View style={styles.introContainer}>
          <Ionicons name="albums-outline" size={80} color={theme.textMuted} />
          <Text style={[styles.introTitle, { color: theme.text }]}>
            Browse Camera Database
          </Text>
          <Text style={[styles.introText, { color: theme.textSecondary }]}>
            Select a brand above to browse vintage cameras.{'\n'}
            You can add them to your collection or wishlist.
          </Text>
          
          {/* Popular brands quick access */}
          <View style={styles.popularBrands}>
            <Text style={[styles.popularTitle, { color: theme.textSecondary }]}>
              Popular Brands
            </Text>
            <View style={styles.popularGrid}>
              {['Canon', 'Kodak', 'Nikon', 'Polaroid', 'Minolta', 'Olympus'].map(brand => (
                brands.includes(brand) ? (
                  <TouchableOpacity
                    key={brand}
                    style={[styles.popularBrandButton, { backgroundColor: theme.surfaceLight }]}
                    onPress={() => handleBrandSelect(brand)}
                  >
                    <Text style={[styles.popularBrandText, { color: theme.text }]}>{brand}</Text>
                  </TouchableOpacity>
                ) : null
              ))}
            </View>
          </View>
        </View>
      ) : loadingCameras ? (
        // Loading cameras
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading {selectedBrand} cameras...
          </Text>
          <Text style={[styles.loadingSubtext, { color: theme.textMuted }]}>
            (Fetching from camera-wiki.org)
          </Text>
        </View>
      ) : (
        // Cameras loaded
        <>
          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} />
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

          {/* Selection Bar */}
          <View style={[styles.selectionBar, { backgroundColor: theme.surfaceLight }]}>
            <TouchableOpacity style={styles.selectAllButton} onPress={selectAll}>
              <Ionicons
                name={selectedCameras.size === filteredCameras.length && filteredCameras.length > 0 ? 'checkbox' : 'square-outline'}
                size={22}
                color={theme.primary}
              />
              <Text style={[styles.selectAllText, { color: theme.text }]}>
                {selectedCameras.size === filteredCameras.length && filteredCameras.length > 0 ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.selectedCount, { color: theme.primary }]}>
              {selectedCameras.size} of {filteredCameras.length}
            </Text>
          </View>

          {/* Camera List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {filteredCameras.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="camera-outline" size={48} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {searchQuery ? 'No cameras match your search' : 'No cameras found for this brand'}
                </Text>
              </View>
            ) : (
              filteredCameras.map((camera, displayIndex) => {
                const actualIndex = cameras.indexOf(camera);
                const isSelected = selectedCameras.has(actualIndex);
                
                return (
                  <TouchableOpacity
                    key={`${camera.name}-${actualIndex}`}
                    style={[
                      styles.cameraItem,
                      { backgroundColor: theme.surface },
                      isSelected && { borderColor: theme.primary, borderWidth: 2 }
                    ]}
                    onPress={() => toggleCamera(actualIndex)}
                  >
                    <View style={styles.checkbox}>
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={isSelected ? theme.primary : theme.textMuted}
                      />
                    </View>
                    <View style={styles.cameraInfo}>
                      <Text style={[styles.cameraName, { color: theme.text }]} numberOfLines={2}>
                        {camera.name}
                      </Text>
                      <View style={styles.cameraDetails}>
                        {camera.year && (
                          <View style={[styles.tag, { backgroundColor: theme.surfaceLight }]}>
                            <Text style={[styles.tagText, { color: theme.textSecondary }]}>
                              {camera.year}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.tag, { backgroundColor: theme.primary + '20' }]}>
                          <Text style={[styles.tagText, { color: theme.primary }]} numberOfLines={1}>
                            {camera.film_format}
                          </Text>
                        </View>
                        <View style={[styles.tag, { backgroundColor: theme.surfaceLight }]}>
                          <Text style={[styles.tagText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {camera.camera_type}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={styles.bottomPadding} />
          </ScrollView>

          {/* Import Buttons */}
          {selectedCameras.size > 0 && (
            <View style={[styles.importBar, { backgroundColor: theme.surface }]}>
              <TouchableOpacity
                style={[styles.importButton, styles.wishlistButton, { backgroundColor: theme.primary }]}
                onPress={() => importSelected('wishlist')}
                disabled={importing}
              >
                {importing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="heart" size={18} color="#fff" />
                    <Text style={styles.importButtonText}>Wishlist</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.importButton, styles.collectionButton, { backgroundColor: theme.success }]}
                onPress={() => importSelected('collection')}
                disabled={importing}
              >
                {importing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="albums" size={18} color="#fff" />
                    <Text style={styles.importButtonText}>Collection</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16, textAlign: 'center' },
  loadingSubtext: { marginTop: 4, fontSize: 13, textAlign: 'center' },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50 },
  backButton: { padding: 8, marginRight: 8 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  
  // Brand Selector
  brandSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
  },
  brandSelectorContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  brandSelectorText: { marginLeft: 12 },
  brandSelectorLabel: { fontSize: 12 },
  brandSelectorValue: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  
  // Intro
  introContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  introTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  introText: { fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  popularBrands: { marginTop: 32, width: '100%' },
  popularTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  popularBrandButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  popularBrandText: { fontSize: 14, fontWeight: '500' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '70%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  brandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
  },
  brandItemText: { fontSize: 16 },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 8 },
  
  // Selection Bar
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  selectAllButton: { flexDirection: 'row', alignItems: 'center' },
  selectAllText: { marginLeft: 8, fontSize: 14, fontWeight: '500' },
  selectedCount: { fontSize: 14, fontWeight: '600' },
  
  // Camera List
  list: { flex: 1, paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 15, textAlign: 'center' },
  cameraItem: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  checkbox: { marginRight: 12, justifyContent: 'center' },
  cameraInfo: { flex: 1 },
  cameraName: { fontSize: 15, fontWeight: '600' },
  cameraDetails: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, maxWidth: 150 },
  tagText: { fontSize: 11 },
  bottomPadding: { height: 120 },
  
  // Import Bar
  importBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  importButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  wishlistButton: {},
  collectionButton: {},
  importButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
