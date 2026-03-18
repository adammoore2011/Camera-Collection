import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { getAuthHeaders } from '../src/contexts/AuthContext';
import { API_URL } from '../src/config';

interface FilmStock {
  id: string;
  name: string;
  brand: string;
  film_type: string;
  iso?: number;
  format: string;
  quantity: number;
  expiration_date?: string;
  storage_location?: string;
  notes?: string;
}

const FILM_TYPES = ["Color Negative", "Black & White", "Slide/Reversal", "Instant", "Movie Film", "Other"];
const FILM_FORMATS = ["35mm", "120/Medium Format", "4x5 Sheet", "8x10 Sheet", "110", "127", "Instant", "Super 8", "16mm", "Other"];
const STORAGE_OPTIONS = ["Freezer", "Refrigerator", "Room Temperature", "Cool Dark Place"];

export default function FilmStockScreen() {
  const { theme } = useTheme();
  const [filmStock, setFilmStock] = useState<FilmStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formType, setFormType] = useState('Color Negative');
  const [formISO, setFormISO] = useState('');
  const [formFormat, setFormFormat] = useState('35mm');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formExpiration, setFormExpiration] = useState('');
  const [formStorage, setFormStorage] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchFilmStock = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/film-stock`, { headers });
      if (response.ok) {
        const data = await response.json();
        setFilmStock(data);
      }
    } catch (error) {
      console.error('Error fetching film stock:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFilmStock();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFilmStock();
  };

  const resetForm = () => {
    setFormName('');
    setFormBrand('');
    setFormType('Color Negative');
    setFormISO('');
    setFormFormat('35mm');
    setFormQuantity('1');
    setFormExpiration('');
    setFormStorage('');
    setFormNotes('');
  };

  const handleSave = async () => {
    if (!formName.trim() || !formBrand.trim()) {
      Alert.alert('Required', 'Please enter film name and brand');
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/film-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          name: formName.trim(),
          brand: formBrand.trim(),
          film_type: formType,
          iso: formISO ? parseInt(formISO) : null,
          format: formFormat,
          quantity: parseInt(formQuantity) || 1,
          expiration_date: formExpiration || null,
          storage_location: formStorage || null,
          notes: formNotes || null,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Film stock added!');
        resetForm();
        setShowAddModal(false);
        fetchFilmStock();
      } else {
        Alert.alert('Error', 'Failed to add film stock');
      }
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Film',
      `Remove "${name}" from your stock?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              await fetch(`${API_URL}/api/film-stock/${id}`, {
                method: 'DELETE',
                headers,
              });
              fetchFilmStock();
            } catch (error) {
              console.error('Error deleting:', error);
            }
          },
        },
      ]
    );
  };

  const filteredStock = filmStock.filter(stock =>
    stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.film_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Color Negative': return '#FF6B6B';
      case 'Black & White': return '#4A4A4A';
      case 'Slide/Reversal': return '#4ECDC4';
      case 'Instant': return '#FFE66D';
      case 'Movie Film': return '#95E1D3';
      default: return theme.primary;
    }
  };

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const exp = new Date(date);
    const now = new Date();
    const monthsUntil = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsUntil <= 6 && monthsUntil > 0;
  };

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const renderItem = ({ item }: { item: FilmStock }) => (
    <TouchableOpacity
      style={[styles.stockCard, { backgroundColor: theme.surface }]}
      onLongPress={() => handleDelete(item.id, item.name)}
    >
      <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(item.film_type) }]} />
      <View style={styles.stockInfo}>
        <View style={styles.stockHeader}>
          <Text style={[styles.stockName, { color: theme.text }]}>{item.name}</Text>
          <View style={[styles.quantityBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.quantityText}>{item.quantity}</Text>
          </View>
        </View>
        <Text style={[styles.stockBrand, { color: theme.primary }]}>{item.brand}</Text>
        
        <View style={styles.tagsRow}>
          <View style={[styles.tag, { backgroundColor: theme.surfaceLight }]}>
            <Text style={[styles.tagText, { color: theme.textSecondary }]}>{item.format}</Text>
          </View>
          {item.iso && (
            <View style={[styles.tag, { backgroundColor: theme.surfaceLight }]}>
              <Text style={[styles.tagText, { color: theme.textSecondary }]}>ISO {item.iso}</Text>
            </View>
          )}
          <View style={[styles.tag, { backgroundColor: getTypeColor(item.film_type) + '30' }]}>
            <Text style={[styles.tagText, { color: getTypeColor(item.film_type) }]}>{item.film_type}</Text>
          </View>
        </View>
        
        {item.expiration_date && (
          <View style={styles.expirationRow}>
            <Ionicons 
              name={isExpired(item.expiration_date) ? "warning" : "calendar-outline"} 
              size={14} 
              color={isExpired(item.expiration_date) ? theme.error : isExpiringSoon(item.expiration_date) ? '#FFA500' : theme.textMuted} 
            />
            <Text style={[
              styles.expirationText, 
              { color: isExpired(item.expiration_date) ? theme.error : isExpiringSoon(item.expiration_date) ? '#FFA500' : theme.textMuted }
            ]}>
              {isExpired(item.expiration_date) ? 'Expired: ' : 'Exp: '}{item.expiration_date}
            </Text>
          </View>
        )}
        
        {item.storage_location && (
          <View style={styles.storageRow}>
            <Ionicons name="snow-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.storageText, { color: theme.textMuted }]}>{item.storage_location}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Add Modal
  const renderAddModal = () => (
    <Modal visible={showAddModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Film Stock</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Film Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.text }]}
              placeholder="e.g., Portra 400"
              placeholderTextColor={theme.textMuted}
              value={formName}
              onChangeText={setFormName}
            />
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Brand *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.text }]}
              placeholder="e.g., Kodak"
              placeholderTextColor={theme.textMuted}
              value={formBrand}
              onChangeText={setFormBrand}
            />
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Film Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
              {FILM_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionChip,
                    { backgroundColor: formType === type ? theme.primary : theme.surfaceLight }
                  ]}
                  onPress={() => setFormType(type)}
                >
                  <Text style={[styles.optionChipText, { color: formType === type ? '#fff' : theme.text }]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>ISO</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.text }]}
                  placeholder="400"
                  placeholderTextColor={theme.textMuted}
                  value={formISO}
                  onChangeText={setFormISO}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Quantity</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.text }]}
                  placeholder="1"
                  placeholderTextColor={theme.textMuted}
                  value={formQuantity}
                  onChangeText={setFormQuantity}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Format</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
              {FILM_FORMATS.map(format => (
                <TouchableOpacity
                  key={format}
                  style={[
                    styles.optionChip,
                    { backgroundColor: formFormat === format ? theme.primary : theme.surfaceLight }
                  ]}
                  onPress={() => setFormFormat(format)}
                >
                  <Text style={[styles.optionChipText, { color: formFormat === format ? '#fff' : theme.text }]}>
                    {format}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Expiration Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.text }]}
              placeholder="YYYY-MM"
              placeholderTextColor={theme.textMuted}
              value={formExpiration}
              onChangeText={setFormExpiration}
            />
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Storage Location</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
              {STORAGE_OPTIONS.map(storage => (
                <TouchableOpacity
                  key={storage}
                  style={[
                    styles.optionChip,
                    { backgroundColor: formStorage === storage ? theme.primary : theme.surfaceLight }
                  ]}
                  onPress={() => setFormStorage(formStorage === storage ? '' : storage)}
                >
                  <Text style={[styles.optionChipText, { color: formStorage === storage ? '#fff' : theme.text }]}>
                    {storage}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.surfaceLight, color: theme.text }]}
              placeholder="Any notes..."
              placeholderTextColor={theme.textMuted}
              value={formNotes}
              onChangeText={setFormNotes}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Film Stock</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderAddModal()}
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Film Stock</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {filmStock.reduce((sum, s) => sum + s.quantity, 0)} rolls in stock
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search film stock..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {/* List */}
      <FlatList
        data={filteredStock}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="film-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Film Stock</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Add your film collection to track expiration dates and inventory
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Add Film</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  addButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, marginTop: 8, padding: 12, borderRadius: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  list: { padding: 16, paddingTop: 0 },
  stockCard: { flexDirection: 'row', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  typeIndicator: { width: 6 },
  stockInfo: { flex: 1, padding: 14 },
  stockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockName: { fontSize: 17, fontWeight: '600', flex: 1 },
  quantityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  quantityText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  stockBrand: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 12 },
  expirationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  expirationText: { fontSize: 12 },
  storageRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  storageText: { fontSize: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20, gap: 8 },
  emptyButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalBody: { padding: 16 },
  modalFooter: { paddingVertical: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  input: { padding: 14, borderRadius: 10, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  optionsRow: { marginVertical: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  optionChipText: { fontSize: 14 },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
