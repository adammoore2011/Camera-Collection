import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Options {
  camera_types: string[];
  film_formats: string[];
  accessory_types: string[];
}

type ItemMode = 'collection' | 'wishlist' | 'accessory';

export default function AddCameraScreen() {
  const router = useRouter();
  const [options, setOptions] = useState<Options>({
    camera_types: [],
    film_formats: [],
    accessory_types: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ItemMode>('collection');

  // Common fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string | null>(null);

  // Camera fields
  const [cameraType, setCameraType] = useState('');
  const [filmFormat, setFilmFormat] = useState('');
  const [priority, setPriority] = useState('medium');

  // Accessory fields
  const [accessoryType, setAccessoryType] = useState('');
  const [compatibleWith, setCompatibleWith] = useState('');

  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showFormatSelector, setShowFormatSelector] = useState(false);
  const [showAccessoryTypeSelector, setShowAccessoryTypeSelector] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/options`);
      if (response.ok) {
        const data = await response.json();
        setOptions(data);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setBrand('');
    setYear('');
    setNotes('');
    setImage(null);
    setCameraType('');
    setFilmFormat('');
    setPriority('medium');
    setAccessoryType('');
    setCompatibleWith('');
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

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    // Validate based on mode
    if (mode === 'accessory') {
      if (!name.trim() || !brand.trim() || !accessoryType) {
        Alert.alert('Missing Information', 'Please fill in all required fields');
        return;
      }
    } else {
      if (!name.trim() || !brand.trim() || !cameraType || !filmFormat) {
        Alert.alert('Missing Information', 'Please fill in all required fields');
        return;
      }
    }

    setSaving(true);

    let endpoint = '';
    let body: any = {};

    if (mode === 'accessory') {
      endpoint = '/api/accessories';
      body = {
        name: name.trim(),
        brand: brand.trim(),
        accessory_type: accessoryType,
        compatible_with: compatibleWith.trim() || null,
        year: year.trim() || null,
        notes: notes.trim() || null,
        image: image,
      };
    } else if (mode === 'wishlist') {
      endpoint = '/api/wishlist';
      body = {
        name: name.trim(),
        brand: brand.trim(),
        camera_type: cameraType,
        film_format: filmFormat,
        year: year.trim() || null,
        notes: notes.trim() || null,
        image: image,
        priority: priority,
      };
    } else {
      endpoint = '/api/cameras';
      body = {
        name: name.trim(),
        brand: brand.trim(),
        camera_type: cameraType,
        film_format: filmFormat,
        year: year.trim() || null,
        notes: notes.trim() || null,
        image: image,
      };
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const successMessage = 
          mode === 'accessory' ? 'Accessory added!' :
          mode === 'wishlist' ? 'Added to your wishlist!' :
          'Camera added to your collection!';
        
        Alert.alert('Success', successMessage, [
          { text: 'OK', onPress: () => {
            resetForm();
            router.back();
          }}
        ]);
      } else {
        Alert.alert('Error', 'Failed to save. Please try again.');
      }
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4A574" />
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
        {/* Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              mode === 'collection' && styles.toggleButtonActive,
            ]}
            onPress={() => { setMode('collection'); resetForm(); }}
          >
            <Ionicons
              name="camera"
              size={18}
              color={mode === 'collection' ? '#fff' : '#888'}
            />
            <Text
              style={[
                styles.toggleText,
                mode === 'collection' && styles.toggleTextActive,
              ]}
            >
              Collection
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              mode === 'wishlist' && styles.toggleButtonActive,
            ]}
            onPress={() => { setMode('wishlist'); resetForm(); }}
          >
            <Ionicons
              name="heart"
              size={18}
              color={mode === 'wishlist' ? '#fff' : '#888'}
            />
            <Text
              style={[
                styles.toggleText,
                mode === 'wishlist' && styles.toggleTextActive,
              ]}
            >
              Wishlist
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              mode === 'accessory' && styles.toggleButtonActive,
            ]}
            onPress={() => { setMode('accessory'); resetForm(); }}
          >
            <Ionicons
              name="briefcase"
              size={18}
              color={mode === 'accessory' ? '#fff' : '#888'}
            />
            <Text
              style={[
                styles.toggleText,
                mode === 'accessory' && styles.toggleTextActive,
              ]}
            >
              Accessory
            </Text>
          </TouchableOpacity>
        </View>

        {/* Image Picker */}
        <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons 
                name={mode === 'accessory' ? 'briefcase-outline' : 'camera-outline'} 
                size={48} 
                color="#666" 
              />
              <Text style={styles.imagePlaceholderText}>Add Photo</Text>
            </View>
          )}
          {image && (
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setImage(null)}
            >
              <Ionicons name="close-circle" size={28} color="#E74C3C" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {mode === 'accessory' ? 'Accessory Name *' : 'Camera Name *'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={mode === 'accessory' ? 'e.g., Summicron 50mm f/2' : 'e.g., Leica M3'}
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand/Manufacturer *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Leica, Canon, Nikon"
              placeholderTextColor="#666"
              value={brand}
              onChangeText={setBrand}
            />
          </View>

          {mode === 'accessory' ? (
            // Accessory Type Selector
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Accessory Type *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowAccessoryTypeSelector(!showAccessoryTypeSelector)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !accessoryType && styles.selectorPlaceholder,
                  ]}
                >
                  {accessoryType || 'Select accessory type'}
                </Text>
                <Ionicons
                  name={showAccessoryTypeSelector ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
              {showAccessoryTypeSelector && (
                <ScrollView style={styles.optionsList} nestedScrollEnabled>
                  {options.accessory_types.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionItem,
                        accessoryType === type && styles.optionItemSelected,
                      ]}
                      onPress={() => {
                        setAccessoryType(type);
                        setShowAccessoryTypeSelector(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          accessoryType === type && styles.optionTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : (
            // Camera Type & Film Format
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Camera Type *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowTypeSelector(!showTypeSelector)}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      !cameraType && styles.selectorPlaceholder,
                    ]}
                  >
                    {cameraType || 'Select camera type'}
                  </Text>
                  <Ionicons
                    name={showTypeSelector ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
                {showTypeSelector && (
                  <ScrollView style={styles.optionsList} nestedScrollEnabled>
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
                  </ScrollView>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Film Format *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowFormatSelector(!showFormatSelector)}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      !filmFormat && styles.selectorPlaceholder,
                    ]}
                  >
                    {filmFormat || 'Select film format'}
                  </Text>
                  <Ionicons
                    name={showFormatSelector ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
                {showFormatSelector && (
                  <ScrollView style={styles.optionsList} nestedScrollEnabled>
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
                  </ScrollView>
                )}
              </View>
            </>
          )}

          {mode === 'accessory' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Compatible With</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Canon EOS, Nikon F-Mount, Universal"
                placeholderTextColor="#666"
                value={compatibleWith}
                onChangeText={setCompatibleWith}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Year/Era</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 1954, 1960s, Early 1970s"
              placeholderTextColor="#666"
              value={year}
              onChangeText={setYear}
            />
          </View>

          {mode === 'wishlist' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityContainer}>
                {['low', 'medium', 'high'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      priority === p && styles.priorityButtonActive,
                      priority === p && {
                        backgroundColor:
                          p === 'high'
                            ? '#E74C3C'
                            : p === 'medium'
                            ? '#F39C12'
                            : '#27AE60',
                      },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        priority === p && styles.priorityTextActive,
                      ]}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={mode === 'accessory' 
                ? 'Add any notes about this accessory...' 
                : 'Add any notes about this camera...'}
              placeholderTextColor="#666"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name={
                  mode === 'accessory' ? 'briefcase' :
                  mode === 'wishlist' ? 'heart' : 'camera'
                }
                size={20}
                color="#fff"
              />
              <Text style={styles.saveButtonText}>
                {mode === 'accessory' ? 'Add Accessory' :
                 mode === 'wishlist' ? 'Add to Wishlist' : 'Add to Collection'}
              </Text>
            </>
          )}
        </TouchableOpacity>

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
  scrollView: {
    flex: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#D4A574',
  },
  toggleText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  toggleTextActive: {
    color: '#fff',
  },
  imagePicker: {
    marginHorizontal: 16,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#666',
    marginTop: 8,
    fontSize: 16,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  form: {
    paddingHorizontal: 16,
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
    paddingTop: 16,
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
  selectorPlaceholder: {
    color: '#666',
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
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
  },
  priorityButtonActive: {
    borderWidth: 0,
  },
  priorityText: {
    color: '#888',
    fontWeight: '600',
  },
  priorityTextActive: {
    color: '#fff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4A574',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
