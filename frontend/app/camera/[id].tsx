import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

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

interface Options {
  camera_types: string[];
  film_formats: string[];
}

export default function CameraDetailScreen() {
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

  // Edit form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [cameraType, setCameraType] = useState('');
  const [filmFormat, setFilmFormat] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string | null>(null);

  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showFormatSelector, setShowFormatSelector] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [cameraRes, optionsRes] = await Promise.all([
        fetch(`${API_URL}/api/cameras/${id}`),
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
    setImage(data.image || null);
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
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !brand.trim() || !cameraType || !filmFormat) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/cameras/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim(),
          camera_type: cameraType,
          film_format: filmFormat,
          year: year.trim() || null,
          notes: notes.trim() || null,
          image: image,
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
              const response = await fetch(`${API_URL}/api/cameras/${id}`, {
                method: 'DELETE',
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4A574" />
      </View>
    );
  }

  if (!camera) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#E74C3C" />
        <Text style={styles.errorText}>Camera not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Section */}
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={editing ? pickImage : undefined}
          disabled={!editing}
        >
          {(editing ? image : camera.image) ? (
            <Image
              source={{ uri: editing ? image! : camera.image! }}
              style={styles.cameraImage}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="camera-outline" size={64} color="#666" />
              {editing && <Text style={styles.tapToChange}>Tap to add photo</Text>}
            </View>
          )}
        </TouchableOpacity>

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          {editing ? (
            // Edit Mode
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Camera Name *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Brand *</Text>
                <TextInput
                  style={styles.input}
                  value={brand}
                  onChangeText={setBrand}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Camera Type *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowTypeSelector(!showTypeSelector)}
                >
                  <Text style={styles.selectorText}>{cameraType}</Text>
                  <Ionicons
                    name={showTypeSelector ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
                {showTypeSelector && (
                  <View style={styles.optionsList}>
                    {options.camera_types.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.optionItem,
                          cameraType === type && styles.optionItemSelected,
                        ]}
                        onPress={() => {
                          setCameraType(type);
                          setShowTypeSelector(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            cameraType === type && styles.optionTextSelected,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Film Format *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowFormatSelector(!showFormatSelector)}
                >
                  <Text style={styles.selectorText}>{filmFormat}</Text>
                  <Ionicons
                    name={showFormatSelector ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
                {showFormatSelector && (
                  <View style={styles.optionsList}>
                    {options.film_formats.map((format) => (
                      <TouchableOpacity
                        key={format}
                        style={[
                          styles.optionItem,
                          filmFormat === format && styles.optionItemSelected,
                        ]}
                        onPress={() => {
                          setFilmFormat(format);
                          setShowFormatSelector(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            filmFormat === format && styles.optionTextSelected,
                          ]}
                        >
                          {format}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Year/Era</Text>
                <TextInput
                  style={styles.input}
                  value={year}
                  onChangeText={setYear}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          ) : (
            // View Mode
            <>
              <Text style={styles.cameraName}>{camera.name}</Text>
              <Text style={styles.cameraBrand}>{camera.brand}</Text>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="aperture" size={20} color="#D4A574" />
                  <Text style={styles.infoLabel}>Type</Text>
                  <Text style={styles.infoValue}>{camera.camera_type}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="film" size={20} color="#D4A574" />
                  <Text style={styles.infoLabel}>Film Format</Text>
                  <Text style={styles.infoValue}>{camera.film_format}</Text>
                </View>
              </View>

              {camera.year && (
                <View style={styles.infoSection}>
                  <Ionicons name="calendar" size={20} color="#D4A574" />
                  <View style={styles.infoSectionContent}>
                    <Text style={styles.infoLabel}>Year/Era</Text>
                    <Text style={styles.infoValue}>{camera.year}</Text>
                  </View>
                </View>
              )}

              {camera.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notesText}>{camera.notes}</Text>
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
                style={styles.cancelButton}
                onPress={() => {
                  populateForm(camera);
                  setEditing(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
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
                style={styles.editButton}
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
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#D4A574',
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
    backgroundColor: '#1E1E1E',
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
  },
  tapToChange: {
    color: '#888',
    marginTop: 8,
  },
  detailsContainer: {
    padding: 20,
  },
  cameraName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  cameraBrand: {
    color: '#D4A574',
    fontSize: 20,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 24,
  },
  infoItem: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginRight: 8,
    alignItems: 'center',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  infoSectionContent: {
    marginLeft: 12,
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  notesSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  notesLabel: {
    color: '#D4A574',
    fontSize: 14,
    fontWeight: '600',
  },
  notesText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#D4A574',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
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
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
  },
  selectorText: {
    color: '#fff',
    fontSize: 16,
  },
  optionsList: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  optionItemSelected: {
    backgroundColor: '#D4A574',
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
  },
  optionTextSelected: {
    fontWeight: 'bold',
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
    backgroundColor: '#D4A574',
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
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: '#fff',
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
