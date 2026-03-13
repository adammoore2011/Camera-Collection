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
import { useTheme } from '../src/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SESSION_TOKEN_KEY = '@vintage_camera_session_token';

interface Options {
  camera_types: string[];
  film_formats: string[];
  accessory_types: string[];
}

type ItemMode = 'collection' | 'wishlist' | 'accessory';

export default function AddCameraScreen() {
  const { theme } = useTheme();
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

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

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
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
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
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

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
        {/* Mode Toggle */}
        <View style={[styles.toggleContainer, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              mode === 'collection' && { backgroundColor: theme.primary },
            ]}
            onPress={() => { setMode('collection'); resetForm(); }}
          >
            <Ionicons
              name="camera"
              size={18}
              color={mode === 'collection' ? '#fff' : theme.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                { color: mode === 'collection' ? '#fff' : theme.textSecondary },
              ]}
            >
              Collection
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              mode === 'wishlist' && { backgroundColor: theme.primary },
            ]}
            onPress={() => { setMode('wishlist'); resetForm(); }}
          >
            <Ionicons
              name="heart"
              size={18}
              color={mode === 'wishlist' ? '#fff' : theme.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                { color: mode === 'wishlist' ? '#fff' : theme.textSecondary },
              ]}
            >
              Wishlist
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              mode === 'accessory' && { backgroundColor: theme.primary },
            ]}
            onPress={() => { setMode('accessory'); resetForm(); }}
          >
            <Ionicons
              name="briefcase"
              size={18}
              color={mode === 'accessory' ? '#fff' : theme.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                { color: mode === 'accessory' ? '#fff' : theme.textSecondary },
              ]}
            >
              Accessory
            </Text>
          </TouchableOpacity>
        </View>

        {/* Image Picker */}
        <TouchableOpacity style={[styles.imagePicker, { backgroundColor: theme.surface }]} onPress={showImageOptions}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons 
                name={mode === 'accessory' ? 'briefcase-outline' : 'camera-outline'} 
                size={48} 
                color={theme.textMuted} 
              />
              <Text style={[styles.imagePlaceholderText, { color: theme.textMuted }]}>Add Photo</Text>
            </View>
          )}
          {image && (
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setImage(null)}
            >
              <Ionicons name="close-circle" size={28} color={theme.error} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.primary }]}>
              {mode === 'accessory' ? 'Accessory Name *' : 'Camera Name *'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
              placeholder={mode === 'accessory' ? 'e.g., Summicron 50mm f/2' : 'e.g., Leica M3'}
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.primary }]}>Brand/Manufacturer *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
              placeholder="e.g., Leica, Canon, Nikon"
              placeholderTextColor={theme.textMuted}
              value={brand}
              onChangeText={setBrand}
            />
          </View>

          {mode === 'accessory' ? (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.primary }]}>Accessory Type *</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: theme.surface }]}
                onPress={() => setShowAccessoryTypeSelector(!showAccessoryTypeSelector)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    { color: accessoryType ? theme.text : theme.textMuted },
                  ]}
                >
                  {accessoryType || 'Select accessory type'}
                </Text>
                <Ionicons
                  name={showAccessoryTypeSelector ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
              {showAccessoryTypeSelector && (
                <ScrollView style={[styles.optionsList, { backgroundColor: theme.surface }]} nestedScrollEnabled>
                  {options.accessory_types.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionItem,
                        { borderBottomColor: theme.border },
                        accessoryType === type && { backgroundColor: theme.primary },
                      ]}
                      onPress={() => {
                        setAccessoryType(type);
                        setShowAccessoryTypeSelector(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: accessoryType === type ? '#fff' : theme.text },
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
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Camera Type *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: theme.surface }]}
                  onPress={() => setShowTypeSelector(!showTypeSelector)}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      { color: cameraType ? theme.text : theme.textMuted },
                    ]}
                  >
                    {cameraType || 'Select camera type'}
                  </Text>
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
                          cameraType === type && { backgroundColor: theme.primary },
                        ]}
                        onPress={() => {
                          setCameraType(type);
                          setShowTypeSelector(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            { color: cameraType === type ? '#fff' : theme.text },
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
                <Text style={[styles.label, { color: theme.primary }]}>Film Format *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: theme.surface }]}
                  onPress={() => setShowFormatSelector(!showFormatSelector)}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      { color: filmFormat ? theme.text : theme.textMuted },
                    ]}
                  >
                    {filmFormat || 'Select film format'}
                  </Text>
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
                          filmFormat === format && { backgroundColor: theme.primary },
                        ]}
                        onPress={() => {
                          setFilmFormat(format);
                          setShowFormatSelector(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            { color: filmFormat === format ? '#fff' : theme.text },
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
              <Text style={[styles.label, { color: theme.primary }]}>Compatible With</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
                placeholder="e.g., Canon EOS, Nikon F-Mount, Universal"
                placeholderTextColor={theme.textMuted}
                value={compatibleWith}
                onChangeText={setCompatibleWith}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.primary }]}>Year/Era</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
              placeholder="e.g., 1954, 1960s, Early 1970s"
              placeholderTextColor={theme.textMuted}
              value={year}
              onChangeText={setYear}
            />
          </View>

          {mode === 'wishlist' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.primary }]}>Priority</Text>
              <View style={styles.priorityContainer}>
                {['low', 'medium', 'high'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      { backgroundColor: theme.surface },
                      priority === p && {
                        backgroundColor:
                          p === 'high' ? theme.priorityHigh :
                          p === 'medium' ? theme.priorityMedium : theme.priorityLow,
                      },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        { color: priority === p ? '#fff' : theme.textSecondary },
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
            <Text style={[styles.label, { color: theme.primary }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.surface, color: theme.text }]}
              placeholder={mode === 'accessory' 
                ? 'Add any notes about this accessory...' 
                : 'Add any notes about this camera...'}
              placeholderTextColor={theme.textMuted}
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
          style={[styles.saveButton, { backgroundColor: theme.primary }, saving && styles.saveButtonDisabled]}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    margin: 16,
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
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  imagePicker: {
    marginHorizontal: 16,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
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
    paddingTop: 16,
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
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  priorityText: {
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
