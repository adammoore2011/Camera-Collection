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

import { API_URL, SESSION_TOKEN_KEY } from '../src/config';
import { getAuthHeaders } from '../src/contexts/AuthContext';

const CONDITIONS = ['Mint', 'Excellent', 'Good', 'Fair', 'For Parts'];

interface Options {
  camera_types: string[];
  film_formats: string[];
  accessory_types: string[];
  conditions: string[];
}

type ItemMode = 'collection' | 'wishlist' | 'accessory';

export default function AddCameraScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [options, setOptions] = useState<Options>({
    camera_types: [],
    film_formats: [],
    accessory_types: [],
    conditions: CONDITIONS,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ItemMode>('collection');

  // Common fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // Camera fields
  const [cameraType, setCameraType] = useState('');
  const [filmFormat, setFilmFormat] = useState('');
  const [priority, setPriority] = useState('medium');

  // New value tracking fields
  const [estimatedValue, setEstimatedValue] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [condition, setCondition] = useState('');

  // Accessory fields
  const [accessoryType, setAccessoryType] = useState('');
  const [compatibleWith, setCompatibleWith] = useState('');

  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showFormatSelector, setShowFormatSelector] = useState(false);
  const [showAccessoryTypeSelector, setShowAccessoryTypeSelector] = useState(false);
  const [showConditionSelector, setShowConditionSelector] = useState(false);


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
    setImages([]);
    setCameraType('');
    setFilmFormat('');
    setPriority('medium');
    setAccessoryType('');
    setCompatibleWith('');
    setEstimatedValue('');
    setPurchasePrice('');
    setPurchaseDate('');
    setPurchaseLocation('');
    setCondition('');
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
      const newImage = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setImages([...images, newImage]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
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
        image: images.length > 0 ? images[0] : null,
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
        image: images.length > 0 ? images[0] : null,
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
        image: images.length > 0 ? images[0] : null,
        images: images,
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        purchase_date: purchaseDate.trim() || null,
        purchase_location: purchaseLocation.trim() || null,
        condition: condition || null,
      };
    }

    try {
      console.log('[ADD] Getting auth headers...');
      const authHeaders = await getAuthHeaders();
      console.log('[ADD] Auth headers:', JSON.stringify(authHeaders));
      console.log('[ADD] Making POST to:', `${API_URL}${endpoint}`);
      console.log('[ADD] Body:', JSON.stringify(body).substring(0, 200));
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(body),
      });

      console.log('[ADD] Response status:', response.status);

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
        const errorText = await response.text();
        console.log('[ADD] Error response:', errorText);
        Alert.alert('Error', 'Failed to save. Please try again.');
      }
    } catch (error) {
      console.error('[ADD] Error saving:', error);
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

        {/* Image Picker - Multi-Image Gallery */}
        <View style={[styles.imageSection, { backgroundColor: theme.surface }]}>
          {images.length === 0 ? (
            <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions}>
              <View style={styles.imagePlaceholder}>
                <Ionicons 
                  name={mode === 'accessory' ? 'briefcase-outline' : 'camera-outline'} 
                  size={48} 
                  color={theme.textMuted} 
                />
                <Text style={[styles.imagePlaceholderText, { color: theme.textMuted }]}>Add Photo</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageGallery}
              >
                {images.map((img, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri: img }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#E74C3C" />
                    </TouchableOpacity>
                    <View style={[styles.imageIndex, { backgroundColor: theme.primary }]}>
                      <Text style={styles.imageIndexText}>{index + 1}</Text>
                    </View>
                  </View>
                ))}
                <TouchableOpacity 
                  style={[styles.addMoreButton, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                  onPress={showImageOptions}
                >
                  <Ionicons name="add" size={32} color={theme.primary} />
                  <Text style={[styles.addMoreText, { color: theme.primary }]}>Add More</Text>
                </TouchableOpacity>
              </ScrollView>
              <Text style={[styles.imageCount, { color: theme.textSecondary }]}>
                {images.length} photo{images.length !== 1 ? 's' : ''} added
              </Text>
            </View>
          )}
        </View>

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

          {/* Value & Condition fields - only for collection mode */}
          {mode === 'collection' && (
            <>
              <View style={[styles.sectionDivider, { borderColor: theme.border }]}>
                <Text style={[styles.sectionDividerText, { color: theme.textSecondary }]}>Value & Condition</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Condition</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: theme.surface }]}
                  onPress={() => setShowConditionSelector(!showConditionSelector)}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      { color: condition ? (
                        condition === 'Mint' ? '#27AE60' :
                        condition === 'Excellent' ? '#2ECC71' :
                        condition === 'Good' ? '#F39C12' :
                        condition === 'Fair' ? '#E67E22' : '#E74C3C'
                      ) : theme.textMuted },
                    ]}
                  >
                    {condition || 'Select condition'}
                  </Text>
                  <Ionicons
                    name={showConditionSelector ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
                {showConditionSelector && (
                  <View style={[styles.optionsList, { backgroundColor: theme.surface }]}>
                    {CONDITIONS.map((cond) => (
                      <TouchableOpacity
                        key={cond}
                        style={[
                          styles.optionItem,
                          { borderBottomColor: theme.border },
                          condition === cond && { backgroundColor: 
                            cond === 'Mint' ? '#27AE60' :
                            cond === 'Excellent' ? '#2ECC71' :
                            cond === 'Good' ? '#F39C12' :
                            cond === 'Fair' ? '#E67E22' : '#E74C3C'
                          },
                        ]}
                        onPress={() => {
                          setCondition(cond);
                          setShowConditionSelector(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            { color: condition === cond ? '#fff' : (
                              cond === 'Mint' ? '#27AE60' :
                              cond === 'Excellent' ? '#2ECC71' :
                              cond === 'Good' ? '#F39C12' :
                              cond === 'Fair' ? '#E67E22' : '#E74C3C'
                            )},
                          ]}
                        >
                          {cond}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.primary }]}>Est. Value ($)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    value={estimatedValue}
                    onChangeText={setEstimatedValue}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.primary }]}>Paid ($)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Purchase Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
                  placeholder="e.g., 2024-01-15 or January 2024"
                  placeholderTextColor={theme.textMuted}
                  value={purchaseDate}
                  onChangeText={setPurchaseDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Purchase Location</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
                  placeholder="e.g., eBay, Estate Sale, Camera Shop"
                  placeholderTextColor={theme.textMuted}
                  value={purchaseLocation}
                  onChangeText={setPurchaseLocation}
                />
              </View>
            </>
          )}

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
  imageSection: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imagePicker: {
    height: 180,
  },
  imageGallery: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  imageWrapper: {
    width: 140,
    height: 140,
    marginHorizontal: 6,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
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
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  imageIndex: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndexText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addMoreButton: {
    width: 140,
    height: 140,
    marginHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  imageCount: {
    textAlign: 'center',
    fontSize: 13,
    paddingBottom: 12,
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
  sectionDivider: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionDividerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rowInputs: {
    flexDirection: 'row',
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
