import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SESSION_TOKEN_KEY = '@vintage_camera_session_token';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

export default function CameraDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [options, setOptions] = useState<Options>({
    camera_types: [],
    film_formats: [],
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const galleryRef = useRef<FlatList>(null);

  // Edit form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [cameraType, setCameraType] = useState('');
  const [filmFormat, setFilmFormat] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showFormatSelector, setShowFormatSelector] = useState(false);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const headers = await getAuthHeaders();
      const [cameraRes, optionsRes] = await Promise.all([
        fetch(`${API_URL}/api/cameras/${id}`, { headers }),
        fetch(`${API_URL}/api/options`),
      ]);

      if (cameraRes.ok) {
        const cameraData = await cameraRes.json();
        setCamera(cameraData);
        populateForm(cameraData);
      }

      if (optionsRes.ok) {
        const optionsData = await optionsRes.json();
        setOptions(optionsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: Camera) => {
    setName(data.name);
    setBrand(data.brand);
    setCameraType(data.camera_type);
    setFilmFormat(data.film_format);
    setYear(data.year || '');
    setNotes(data.notes || '');
    // Support both single image and multiple images
    const allImages: string[] = [];
    if (data.images && data.images.length > 0) {
      allImages.push(...data.images);
    } else if (data.image) {
      allImages.push(data.image);
    }
    setImages(allImages);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const newImage = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setImages([...images, newImage]);
    }
  };

  const removeImage = (index: number) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newImages = images.filter((_, i) => i !== index);
            setImages(newImages);
            if (currentImageIndex >= newImages.length && newImages.length > 0) {
              setCurrentImageIndex(newImages.length - 1);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !brand.trim() || !cameraType || !filmFormat) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/cameras/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim(),
          camera_type: cameraType,
          film_format: filmFormat,
          year: year.trim() || null,
          notes: notes.trim() || null,
          image: images.length > 0 ? images[0] : null,
          images: images,
        }),
      });

      if (response.ok) {
        const updatedCamera = await response.json();
        setCamera(updatedCamera);
        setEditing(false);
        Alert.alert('Success', 'Camera updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update camera');
      }
    } catch (error) {
      console.error('Error updating camera:', error);
      Alert.alert('Error', 'Failed to update camera');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
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
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/api/cameras/${id}`, {
                method: 'DELETE',
                headers,
              });
              if (response.ok) {
                router.back();
              }
            } catch (error) {
              console.error('Error deleting camera:', error);
            }
          },
        },
      ]
    );
  };

  // Get display images (for view mode)
  const getDisplayImages = (): string[] => {
    if (camera?.images && camera.images.length > 0) return camera.images;
    if (camera?.image) return [camera.image];
    return [];
  };

  const displayImages = editing ? images : getDisplayImages();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!camera) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle" size={64} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.text }]}>Camera not found</Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.primary }]} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderImageGallery = () => {
    if (displayImages.length === 0) {
      return (
        <TouchableOpacity
          style={[styles.placeholderImage, { backgroundColor: theme.surfaceLight }]}
          onPress={editing ? pickImage : undefined}
          disabled={!editing}
        >
          <Ionicons name="camera-outline" size={64} color={theme.textMuted} />
          {editing && <Text style={[styles.tapToChange, { color: theme.textSecondary }]}>Tap to add photo</Text>}
        </TouchableOpacity>
      );
    }

    return (
      <View>
        <FlatList
          ref={galleryRef}
          data={displayImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentImageIndex(index);
          }}
          renderItem={({ item, index }) => (
            <View style={styles.imageSlide}>
              <Image source={{ uri: item }} style={styles.cameraImage} />
              {editing && (
                <TouchableOpacity
                  style={[styles.removeImageButton, { backgroundColor: theme.error }]}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="trash" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          )}
          keyExtractor={(_, index) => index.toString()}
        />
        
        {/* Pagination dots */}
        {displayImages.length > 1 && (
          <View style={styles.paginationContainer}>
            {displayImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  { backgroundColor: index === currentImageIndex ? theme.primary : theme.textMuted }
                ]}
              />
            ))}
          </View>
        )}
        
        {/* Image counter */}
        <View style={[styles.imageCounter, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Text style={styles.imageCounterText}>
            {currentImageIndex + 1} / {displayImages.length}
          </Text>
        </View>
        
        {/* Add more images button (edit mode) */}
        {editing && (
          <TouchableOpacity
            style={[styles.addMoreImagesButton, { backgroundColor: theme.primary }]}
            onPress={pickImage}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addMoreImagesText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {renderImageGallery()}
        </View>

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          {editing ? (
            // Edit Mode
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Camera Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Brand *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
                  value={brand}
                  onChangeText={setBrand}
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Camera Type *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: theme.surface }]}
                  onPress={() => setShowTypeSelector(!showTypeSelector)}
                >
                  <Text style={[styles.selectorText, { color: theme.text }]}>{cameraType}</Text>
                  <Ionicons
                    name={showTypeSelector ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
                {showTypeSelector && (
                  <ScrollView style={[styles.optionsList, { backgroundColor: theme.surface }]} nestedScrollEnabled>
                    {options.camera_types.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.optionItem,
                          { borderBottomColor: theme.border },
                          cameraType === type && { backgroundColor: theme.primary }
                        ]}
                        onPress={() => {
                          setCameraType(type);
                          setShowTypeSelector(false);
                        }}
                      >
                        <Text style={[styles.optionText, { color: cameraType === type ? '#fff' : theme.text }]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Film Format *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: theme.surface }]}
                  onPress={() => setShowFormatSelector(!showFormatSelector)}
                >
                  <Text style={[styles.selectorText, { color: theme.text }]}>{filmFormat}</Text>
                  <Ionicons
                    name={showFormatSelector ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
                {showFormatSelector && (
                  <ScrollView style={[styles.optionsList, { backgroundColor: theme.surface }]} nestedScrollEnabled>
                    {options.film_formats.map((format) => (
                      <TouchableOpacity
                        key={format}
                        style={[
                          styles.optionItem,
                          { borderBottomColor: theme.border },
                          filmFormat === format && { backgroundColor: theme.primary }
                        ]}
                        onPress={() => {
                          setFilmFormat(format);
                          setShowFormatSelector(false);
                        }}
                      >
                        <Text style={[styles.optionText, { color: filmFormat === format ? '#fff' : theme.text }]}>
                          {format}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Year/Era</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
                  value={year}
                  onChangeText={setYear}
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.surface, color: theme.text }]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </>
          ) : (
            // View Mode
            <>
              <Text style={[styles.cameraName, { color: theme.text }]}>{camera.name}</Text>
              <Text style={[styles.cameraBrand, { color: theme.primary }]}>{camera.brand}</Text>

              <View style={styles.infoRow}>
                <View style={[styles.infoItem, { backgroundColor: theme.surface }]}>
                  <Ionicons name="aperture" size={20} color={theme.primary} />
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Type</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{camera.camera_type}</Text>
                </View>
                <View style={[styles.infoItem, { backgroundColor: theme.surface }]}>
                  <Ionicons name="film" size={20} color={theme.primary} />
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Film Format</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{camera.film_format}</Text>
                </View>
              </View>

              {camera.year && (
                <View style={[styles.infoSection, { backgroundColor: theme.surface }]}>
                  <Ionicons name="calendar" size={20} color={theme.primary} />
                  <View style={styles.infoSectionContent}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Year/Era</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{camera.year}</Text>
                  </View>
                </View>
              )}

              {camera.notes && (
                <View style={[styles.notesSection, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.notesLabel, { color: theme.primary }]}>Notes</Text>
                  <Text style={[styles.notesText, { color: theme.text }]}>{camera.notes}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {editing ? (
            <>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.surface }]}
                onPress={() => {
                  populateForm(camera);
                  setEditing(false);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: theme.primary }]}
                onPress={() => setEditing(true)}
              >
                <Ionicons name="pencil" size={20} color="#fff" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 300,
  },
  imageSlide: {
    width: SCREEN_WIDTH,
    height: 300,
    position: 'relative',
  },
  cameraImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
  },
  tapToChange: {
    marginTop: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addMoreImagesButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addMoreImagesText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailsContainer: {
    padding: 20,
  },
  cameraName: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  cameraBrand: {
    fontSize: 20,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 24,
  },
  infoItem: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    marginRight: 8,
    alignItems: 'center',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  infoSectionContent: {
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  notesSection: {
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
  },
  selectorText: {
    fontSize: 16,
  },
  optionsList: {
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E74C3C',
    paddingVertical: 14,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27AE60',
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 40,
  },
});
