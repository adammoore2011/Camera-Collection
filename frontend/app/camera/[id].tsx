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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SESSION_TOKEN_KEY = '@vintage_camera_session_token';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CONDITIONS = ['Mint', 'Excellent', 'Good', 'Fair', 'For Parts'];

interface ServiceEntry {
  date: string;
  description: string;
  cost?: number;
}

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
  estimated_value?: number;
  purchase_price?: number;
  purchase_date?: string;
  purchase_location?: string;
  condition?: string;
  service_history?: ServiceEntry[];
  created_at: string;
}

interface Options {
  camera_types: string[];
  film_formats: string[];
  conditions: string[];
}

export default function CameraDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [options, setOptions] = useState<Options>({
    camera_types: [],
    film_formats: [],
    conditions: CONDITIONS,
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'value' | 'history'>('details');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const galleryRef = useRef<FlatList>(null);

  // Edit form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [cameraType, setCameraType] = useState('');
  const [filmFormat, setFilmFormat] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  // Value fields
  const [estimatedValue, setEstimatedValue] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  // Condition and service
  const [condition, setCondition] = useState('');
  const [serviceHistory, setServiceHistory] = useState<ServiceEntry[]>([]);
  // New service entry
  const [newServiceDate, setNewServiceDate] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceCost, setNewServiceCost] = useState('');

  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showFormatSelector, setShowFormatSelector] = useState(false);
  const [showConditionSelector, setShowConditionSelector] = useState(false);

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
        setOptions({ ...optionsData, conditions: optionsData.conditions || CONDITIONS });
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
    // Images
    const allImages: string[] = [];
    if (data.images && data.images.length > 0) {
      allImages.push(...data.images);
    } else if (data.image) {
      allImages.push(data.image);
    }
    setImages(allImages);
    // Value fields
    setEstimatedValue(data.estimated_value?.toString() || '');
    setPurchasePrice(data.purchase_price?.toString() || '');
    setPurchaseDate(data.purchase_date || '');
    setPurchaseLocation(data.purchase_location || '');
    // Condition and history
    setCondition(data.condition || '');
    setServiceHistory(data.service_history || []);
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
    Alert.alert('Remove Image', 'Are you sure?', [
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
    ]);
  };

  const addServiceEntry = () => {
    if (!newServiceDate || !newServiceDesc) {
      Alert.alert('Missing Info', 'Please enter date and description');
      return;
    }
    const entry: ServiceEntry = {
      date: newServiceDate,
      description: newServiceDesc,
      cost: newServiceCost ? parseFloat(newServiceCost) : undefined,
    };
    setServiceHistory([...serviceHistory, entry]);
    setNewServiceDate('');
    setNewServiceDesc('');
    setNewServiceCost('');
    setShowServiceModal(false);
  };

  const removeServiceEntry = (index: number) => {
    Alert.alert('Remove Entry', 'Delete this service record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setServiceHistory(serviceHistory.filter((_, i) => i !== index));
        },
      },
    ]);
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
          estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
          purchase_date: purchaseDate || null,
          purchase_location: purchaseLocation || null,
          condition: condition || null,
          service_history: serviceHistory,
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
    Alert.alert('Delete Camera', 'Are you sure you want to delete this camera?', [
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
    ]);
  };

  const getDisplayImages = (): string[] => {
    if (camera?.images && camera.images.length > 0) return camera.images;
    if (camera?.image) return [camera.image];
    return [];
  };

  const displayImages = editing ? images : getDisplayImages();
  
  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getConditionColor = (cond: string) => {
    switch (cond) {
      case 'Mint': return '#27AE60';
      case 'Excellent': return '#2ECC71';
      case 'Good': return '#F39C12';
      case 'Fair': return '#E67E22';
      case 'For Parts': return '#E74C3C';
      default: return theme.textSecondary;
    }
  };

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
        
        <View style={[styles.imageCounter, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Text style={styles.imageCounterText}>{currentImageIndex + 1} / {displayImages.length}</Text>
        </View>
        
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

  const renderTabs = () => (
    <View style={[styles.tabContainer, { backgroundColor: theme.surface }]}>
      {(['details', 'value', 'history'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            activeTab === tab && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === tab ? theme.primary : theme.textSecondary }
          ]}>
            {tab === 'details' ? 'Details' : tab === 'value' ? 'Value' : 'History'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDetailsTab = () => {
    if (editing) {
      return (
        <>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.primary }]}>Camera Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.primary }]}>Brand *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
              value={brand}
              onChangeText={setBrand}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.primary }]}>Camera Type *</Text>
            <TouchableOpacity
              style={[styles.selector, { backgroundColor: theme.surface }]}
              onPress={() => setShowTypeSelector(!showTypeSelector)}
            >
              <Text style={[styles.selectorText, { color: theme.text }]}>{cameraType || 'Select...'}</Text>
              <Ionicons name={showTypeSelector ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            {showTypeSelector && (
              <ScrollView style={[styles.optionsList, { backgroundColor: theme.surface }]} nestedScrollEnabled>
                {options.camera_types.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.optionItem, cameraType === type && { backgroundColor: theme.primary }]}
                    onPress={() => { setCameraType(type); setShowTypeSelector(false); }}
                  >
                    <Text style={[styles.optionText, { color: cameraType === type ? '#fff' : theme.text }]}>{type}</Text>
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
              <Text style={[styles.selectorText, { color: theme.text }]}>{filmFormat || 'Select...'}</Text>
              <Ionicons name={showFormatSelector ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            {showFormatSelector && (
              <ScrollView style={[styles.optionsList, { backgroundColor: theme.surface }]} nestedScrollEnabled>
                {options.film_formats.map((fmt) => (
                  <TouchableOpacity
                    key={fmt}
                    style={[styles.optionItem, filmFormat === fmt && { backgroundColor: theme.primary }]}
                    onPress={() => { setFilmFormat(fmt); setShowFormatSelector(false); }}
                  >
                    <Text style={[styles.optionText, { color: filmFormat === fmt ? '#fff' : theme.text }]}>{fmt}</Text>
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
              placeholder="e.g., 1975, 1960s"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.primary }]}>Condition</Text>
            <TouchableOpacity
              style={[styles.selector, { backgroundColor: theme.surface }]}
              onPress={() => setShowConditionSelector(!showConditionSelector)}
            >
              <Text style={[styles.selectorText, { color: condition ? getConditionColor(condition) : theme.textMuted }]}>
                {condition || 'Select condition...'}
              </Text>
              <Ionicons name={showConditionSelector ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            {showConditionSelector && (
              <View style={[styles.optionsList, { backgroundColor: theme.surface }]}>
                {CONDITIONS.map((cond) => (
                  <TouchableOpacity
                    key={cond}
                    style={[styles.optionItem, condition === cond && { backgroundColor: getConditionColor(cond) }]}
                    onPress={() => { setCondition(cond); setShowConditionSelector(false); }}
                  >
                    <Text style={[styles.optionText, { color: condition === cond ? '#fff' : getConditionColor(cond) }]}>{cond}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.primary }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.surface, color: theme.text }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </View>
        </>
      );
    }

    return (
      <>
        <Text style={[styles.cameraName, { color: theme.text }]}>{camera.name}</Text>
        <Text style={[styles.cameraBrand, { color: theme.primary }]}>{camera.brand}</Text>

        {camera.condition && (
          <View style={[styles.conditionBadge, { backgroundColor: getConditionColor(camera.condition) + '20' }]}>
            <Text style={[styles.conditionText, { color: getConditionColor(camera.condition) }]}>
              {camera.condition}
            </Text>
          </View>
        )}

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
    );
  };

  const renderValueTab = () => {
    if (editing) {
      return (
        <>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.primary }]}>Estimated Value ($)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
              value={estimatedValue}
              onChangeText={setEstimatedValue}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.primary }]}>Purchase Price ($)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.primary }]}>Purchase Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="e.g., 2023-06-15 or June 2023"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.primary }]}>Purchase Location</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
              value={purchaseLocation}
              onChangeText={setPurchaseLocation}
              placeholder="e.g., eBay, Estate Sale, Camera Shop"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </>
      );
    }

    const appreciation = (camera.estimated_value && camera.purchase_price) 
      ? camera.estimated_value - camera.purchase_price 
      : null;

    return (
      <>
        <View style={[styles.valueCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.valueLabel, { color: theme.textSecondary }]}>Estimated Value</Text>
          <Text style={[styles.valueAmount, { color: theme.primary }]}>
            {formatCurrency(camera.estimated_value)}
          </Text>
        </View>

        <View style={styles.valueRow}>
          <View style={[styles.valueCardSmall, { backgroundColor: theme.surface }]}>
            <Text style={[styles.valueLabelSmall, { color: theme.textSecondary }]}>Purchase Price</Text>
            <Text style={[styles.valueAmountSmall, { color: theme.text }]}>
              {formatCurrency(camera.purchase_price)}
            </Text>
          </View>
          <View style={[styles.valueCardSmall, { backgroundColor: theme.surface }]}>
            <Text style={[styles.valueLabelSmall, { color: theme.textSecondary }]}>Appreciation</Text>
            <Text style={[
              styles.valueAmountSmall, 
              { color: appreciation && appreciation > 0 ? '#27AE60' : appreciation && appreciation < 0 ? '#E74C3C' : theme.text }
            ]}>
              {appreciation !== null ? (appreciation >= 0 ? '+' : '') + formatCurrency(appreciation) : '-'}
            </Text>
          </View>
        </View>

        {(camera.purchase_date || camera.purchase_location) && (
          <View style={[styles.purchaseInfo, { backgroundColor: theme.surface }]}>
            <Text style={[styles.purchaseInfoTitle, { color: theme.primary }]}>Purchase Details</Text>
            {camera.purchase_date && (
              <View style={styles.purchaseInfoRow}>
                <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                <Text style={[styles.purchaseInfoText, { color: theme.text }]}>{camera.purchase_date}</Text>
              </View>
            )}
            {camera.purchase_location && (
              <View style={styles.purchaseInfoRow}>
                <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
                <Text style={[styles.purchaseInfoText, { color: theme.text }]}>{camera.purchase_location}</Text>
              </View>
            )}
          </View>
        )}
      </>
    );
  };

  const renderHistoryTab = () => {
    const history = editing ? serviceHistory : (camera.service_history || []);

    return (
      <>
        {editing && (
          <TouchableOpacity
            style={[styles.addServiceButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowServiceModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addServiceButtonText}>Add Service Record</Text>
          </TouchableOpacity>
        )}

        {history.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="construct-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyHistoryText, { color: theme.textSecondary }]}>
              No service history recorded
            </Text>
          </View>
        ) : (
          history.map((entry, index) => (
            <View key={index} style={[styles.serviceEntry, { backgroundColor: theme.surface }]}>
              <View style={styles.serviceEntryHeader}>
                <View style={styles.serviceEntryDate}>
                  <Ionicons name="calendar" size={16} color={theme.primary} />
                  <Text style={[styles.serviceDate, { color: theme.primary }]}>{entry.date}</Text>
                </View>
                {editing && (
                  <TouchableOpacity onPress={() => removeServiceEntry(index)}>
                    <Ionicons name="trash-outline" size={18} color={theme.error} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.serviceDesc, { color: theme.text }]}>{entry.description}</Text>
              {entry.cost && (
                <Text style={[styles.serviceCost, { color: theme.textSecondary }]}>
                  Cost: {formatCurrency(entry.cost)}
                </Text>
              )}
            </View>
          ))
        )}
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.imageContainer}>{renderImageGallery()}</View>
        
        {renderTabs()}
        
        <View style={styles.detailsContainer}>
          {activeTab === 'details' && renderDetailsTab()}
          {activeTab === 'value' && renderValueTab()}
          {activeTab === 'history' && renderHistoryTab()}
        </View>

        <View style={styles.actionButtons}>
          {editing ? (
            <>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.surface }]}
                onPress={() => { populateForm(camera); setEditing(false); }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[styles.editButton, { backgroundColor: theme.primary }]} onPress={() => setEditing(true)}>
                <Ionicons name="pencil" size={20} color="#fff" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Service Entry Modal */}
      <Modal visible={showServiceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Service Record</Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Date *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
                  value={newServiceDate}
                  onChangeText={setNewServiceDate}
                  placeholder="e.g., 2024-01-15"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.surface, color: theme.text }]}
                  value={newServiceDesc}
                  onChangeText={setNewServiceDesc}
                  placeholder="What service was performed?"
                  placeholderTextColor={theme.textMuted}
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.primary }]}>Cost ($)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
                  value={newServiceCost}
                  onChangeText={setNewServiceCost}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.surface }]}
                onPress={() => setShowServiceModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={addServiceEntry}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Add Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, marginTop: 16 },
  backButton: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  scrollView: { flex: 1 },
  imageContainer: { width: '100%', height: 280 },
  imageSlide: { width: SCREEN_WIDTH, height: 280, position: 'relative' },
  cameraImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 280 },
  tapToChange: { marginTop: 8 },
  removeImageButton: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  paginationContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  paginationDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  imageCounter: { position: 'absolute', bottom: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  imageCounterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  addMoreImagesButton: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  addMoreImagesText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  detailsContainer: { padding: 20 },
  cameraName: { fontSize: 28, fontWeight: 'bold' },
  cameraBrand: { fontSize: 20, marginTop: 4 },
  conditionBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: 12 },
  conditionText: { fontSize: 14, fontWeight: '600' },
  infoRow: { flexDirection: 'row', marginTop: 20, gap: 8 },
  infoItem: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  infoSection: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 16, marginTop: 12 },
  infoSectionContent: { marginLeft: 12 },
  infoLabel: { fontSize: 12, marginTop: 8 },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  notesSection: { borderRadius: 12, padding: 16, marginTop: 12 },
  notesLabel: { fontSize: 14, fontWeight: '600' },
  notesText: { fontSize: 14, marginTop: 8, lineHeight: 22 },
  valueCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12 },
  valueLabel: { fontSize: 14 },
  valueAmount: { fontSize: 36, fontWeight: 'bold', marginTop: 8 },
  valueRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  valueCardSmall: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  valueLabelSmall: { fontSize: 12 },
  valueAmountSmall: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  purchaseInfo: { borderRadius: 12, padding: 16 },
  purchaseInfoTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  purchaseInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  purchaseInfoText: { marginLeft: 8, fontSize: 14 },
  addServiceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, marginBottom: 16 },
  addServiceButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  emptyHistory: { alignItems: 'center', paddingVertical: 40 },
  emptyHistoryText: { marginTop: 12, fontSize: 14 },
  serviceEntry: { borderRadius: 12, padding: 16, marginBottom: 12 },
  serviceEntryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  serviceEntryDate: { flexDirection: 'row', alignItems: 'center' },
  serviceDate: { marginLeft: 8, fontSize: 14, fontWeight: '600' },
  serviceDesc: { fontSize: 14, lineHeight: 20 },
  serviceCost: { marginTop: 8, fontSize: 13 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 12, padding: 16, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 16 },
  selectorText: { fontSize: 16 },
  optionsList: { borderRadius: 12, marginTop: 8, maxHeight: 200 },
  optionItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  optionText: { fontSize: 14 },
  actionButtons: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  editButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  deleteButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E74C3C', paddingVertical: 14, borderRadius: 12 },
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  cancelButtonText: { fontSize: 16, fontWeight: 'bold' },
  saveButton: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#27AE60', paddingVertical: 14, borderRadius: 12 },
  buttonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bottomPadding: { height: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalButtonText: { fontSize: 16, fontWeight: '600' },
});
