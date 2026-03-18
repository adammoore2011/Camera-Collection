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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SESSION_TOKEN_KEY = '@vintage_camera_session_token';

interface CameraData {
  name: string;
  brand: string;
  year?: string;
  camera_type: string;
  film_format: string;
  notes?: string;
}

export default function ImportScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [selectedCameras, setSelectedCameras] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchCameraDatabase();
  }, []);

  const fetchCameraDatabase = async () => {
    try {
      const response = await fetch(`${API_URL}/api/camera-database`);
      if (response.ok) {
        const data = await response.json();
        setCameras(data.brownie || []);
      }
    } catch (error) {
      console.error('Error fetching camera database:', error);
    } finally {
      setLoading(false);
    }
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
    if (selectedCameras.size === filtered.length) {
      setSelectedCameras(new Set());
    } else {
      const allIndices = filtered.map((_, i) => cameras.indexOf(filtered[i]));
      setSelectedCameras(new Set(allIndices));
    }
  };

  const importSelected = async () => {
    if (selectedCameras.size === 0) {
      Alert.alert('No Selection', 'Please select cameras to import');
      return;
    }

    Alert.alert(
      'Import to Wishlist',
      `Add ${selectedCameras.size} camera(s) to your wishlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            setImporting(true);
            try {
              const headers = await getAuthHeaders();
              const selectedData = Array.from(selectedCameras).map(i => cameras[i]);
              
              const response = await fetch(`${API_URL}/api/import-to-wishlist`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...headers,
                },
                body: JSON.stringify(selectedData),
              });

              if (response.ok) {
                const result = await response.json();
                Alert.alert(
                  'Success!',
                  `Imported ${result.imported} cameras to your wishlist`,
                  [{ text: 'View Wishlist', onPress: () => router.push('/wishlist') }]
                );
                setSelectedCameras(new Set());
              } else {
                Alert.alert('Error', 'Failed to import cameras');
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
    camera.year?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    camera.film_format.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading camera database...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Import Cameras</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Kodak Brownie Collection ({cameras.length} cameras)
          </Text>
        </View>
      </View>

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
            name={selectedCameras.size === filteredCameras.length ? 'checkbox' : 'square-outline'}
            size={22}
            color={theme.primary}
          />
          <Text style={[styles.selectAllText, { color: theme.text }]}>
            {selectedCameras.size === filteredCameras.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.selectedCount, { color: theme.primary }]}>
          {selectedCameras.size} selected
        </Text>
      </View>

      {/* Camera List */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filteredCameras.map((camera, displayIndex) => {
          const actualIndex = cameras.indexOf(camera);
          const isSelected = selectedCameras.has(actualIndex);
          
          return (
            <TouchableOpacity
              key={actualIndex}
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
                <Text style={[styles.cameraName, { color: theme.text }]}>{camera.name}</Text>
                <View style={styles.cameraDetails}>
                  <View style={[styles.tag, { backgroundColor: theme.surfaceLight }]}>
                    <Text style={[styles.tagText, { color: theme.textSecondary }]}>{camera.year || 'Unknown'}</Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.tagText, { color: theme.primary }]}>{camera.film_format}</Text>
                  </View>
                </View>
                {camera.notes && (
                  <Text style={[styles.notes, { color: theme.textSecondary }]} numberOfLines={1}>
                    {camera.notes}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Import Button */}
      {selectedCameras.size > 0 && (
        <View style={[styles.importBar, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={[styles.importButton, { backgroundColor: theme.primary }]}
            onPress={importSelected}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download" size={20} color="#fff" />
                <Text style={styles.importButtonText}>
                  Add {selectedCameras.size} to Wishlist
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50 },
  backButton: { padding: 8, marginRight: 8 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 8 },
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
  list: { flex: 1, paddingHorizontal: 16 },
  cameraItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  checkbox: { marginRight: 12, justifyContent: 'center' },
  cameraInfo: { flex: 1 },
  cameraName: { fontSize: 16, fontWeight: '600' },
  cameraDetails: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 12 },
  notes: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  bottomPadding: { height: 100 },
  importBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  importButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});
