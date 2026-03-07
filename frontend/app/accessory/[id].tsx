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

interface Accessory {
  id: string;
  name: string;
  brand: string;
  accessory_type: string;
  compatible_with?: string;
  year?: string;
  notes?: string;
  image?: string;
  created_at: string;
}

interface Options {
  accessory_types: string[];
}

const accessoryIcons: { [key: string]: string } = {
  'Lens': 'aperture',
  'Filter': 'color-filter',
  'Flash/Strobe': 'flash',
  'Light Meter': 'speedometer',
  'Tripod/Monopod': 'git-commit',
  'Camera Bag/Case': 'bag',
  'Strap': 'link',
  'Battery Grip': 'battery-full',
  'Viewfinder': 'eye',
  'Film Back': 'layers',
  'Lens Hood': 'disc',
  'Cable Release': 'git-branch',
  'Light/Lighting': 'bulb',
  'Reflector': 'sunny',
  'Diffuser': 'cloudy',
  'Memory Card': 'card',
  'Battery': 'battery-half',
  'Charger': 'battery-charging',
  'Cleaning Kit': 'brush',
  'Film Scanner': 'scan',
  'Darkroom Equipment': 'moon',
  'Other': 'cube',
};

export default function AccessoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [accessory, setAccessory] = useState<Accessory | null>(null);
  const [options, setOptions] = useState<Options>({
    accessory_types: [],
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [accessoryType, setAccessoryType] = useState('');
  const [compatibleWith, setCompatibleWith] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string | null>(null);

  const [showTypeSelector, setShowTypeSelector] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [accessoryRes, optionsRes] = await Promise.all([
        fetch(`${API_URL}/api/accessories/${id}`),
        fetch(`${API_URL}/api/options`),
      ]);

      if (accessoryRes.ok) {
        const accessoryData = await accessoryRes.json();
        setAccessory(accessoryData);
        populateForm(accessoryData);
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

  const populateForm = (data: Accessory) => {
    setName(data.name);
    setBrand(data.brand);
    setAccessoryType(data.accessory_type);
    setCompatibleWith(data.compatible_with || '');
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
    if (!name.trim() || !brand.trim() || !accessoryType) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/accessories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim(),
          accessory_type: accessoryType,
          compatible_with: compatibleWith.trim() || null,
          year: year.trim() || null,
          notes: notes.trim() || null,
          image: image,
        }),
      });

      if (response.ok) {
        const updatedAccessory = await response.json();
        setAccessory(updatedAccessory);
        setEditing(false);
        Alert.alert('Success', 'Accessory updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update accessory');
      }
    } catch (error) {
      console.error('Error updating accessory:', error);
      Alert.alert('Error', 'Failed to update accessory');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Accessory',
      'Are you sure you want to delete this accessory?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/accessories/${id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                router.back();
              }
            } catch (error) {
              console.error('Error deleting accessory:', error);
            }
          },
        },
      ]
    );
  };

  const getIconName = (type: string): string => {
    return accessoryIcons[type] || 'cube';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4A574" />
      </View>
    );
  }

  if (!accessory) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#E74C3C" />
        <Text style={styles.errorText}>Accessory not found</Text>
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
          {(editing ? image : accessory.image) ? (
            <Image
              source={{ uri: editing ? image! : accessory.image! }}
              style={styles.accessoryImage}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name={getIconName(accessory.accessory_type) as any} size={64} color="#D4A574" />
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
                <Text style={styles.label}>Accessory Name *</Text>
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
                <Text style={styles.label}>Accessory Type *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowTypeSelector(!showTypeSelector)}
                >
                  <Text style={styles.selectorText}>{accessoryType}</Text>
                  <Ionicons
                    name={showTypeSelector ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
                {showTypeSelector && (
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
                          setShowTypeSelector(false);
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Compatible With</Text>
                <TextInput
                  style={styles.input}
                  value={compatibleWith}
                  onChangeText={setCompatibleWith}
                  placeholder="e.g., Canon EOS, Nikon F-Mount"
                  placeholderTextColor="#666"
                />
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
              <Text style={styles.accessoryName}>{accessory.name}</Text>
              <Text style={styles.accessoryBrand}>{accessory.brand}</Text>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name={getIconName(accessory.accessory_type) as any} size={20} color="#D4A574" />
                  <Text style={styles.infoLabel}>Type</Text>
                  <Text style={styles.infoValue}>{accessory.accessory_type}</Text>
                </View>
                {accessory.compatible_with && (
                  <View style={styles.infoItem}>
                    <Ionicons name="link" size={20} color="#D4A574" />
                    <Text style={styles.infoLabel}>Compatible</Text>
                    <Text style={styles.infoValue}>{accessory.compatible_with}</Text>
                  </View>
                )}
              </View>

              {accessory.year && (
                <View style={styles.infoSection}>
                  <Ionicons name="calendar" size={20} color="#D4A574" />
                  <View style={styles.infoSectionContent}>
                    <Text style={styles.infoLabel}>Year/Era</Text>
                    <Text style={styles.infoValue}>{accessory.year}</Text>
                  </View>
                </View>
              )}

              {accessory.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notesText}>{accessory.notes}</Text>
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
                  populateForm(accessory);
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
    height: 250,
    backgroundColor: '#1E1E1E',
  },
  accessoryImage: {
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
  accessoryName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  accessoryBrand: {
    color: '#D4A574',
    fontSize: 18,
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
    textAlign: 'center',
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
