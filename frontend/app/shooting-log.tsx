import React, { useState, useCallback, useEffect } from 'react';
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

interface ShootingLog {
  id: string;
  date: string;
  camera_id?: string;
  camera_name?: string;
  film_stock_id?: string;
  film_name?: string;
  location?: string;
  shots_taken?: number;
  notes?: string;
  weather?: string;
  rating?: number;
}

interface Camera {
  id: string;
  name: string;
  brand: string;
}

interface FilmStock {
  id: string;
  name: string;
  brand: string;
}

const WEATHER_OPTIONS = ["Sunny", "Cloudy", "Overcast", "Rainy", "Golden Hour", "Blue Hour", "Night", "Indoor"];

export default function ShootingLogScreen() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<ShootingLog[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [filmStock, setFilmStock] = useState<FilmStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState<any>(null);
  
  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCamera, setFormCamera] = useState<Camera | null>(null);
  const [formFilm, setFormFilm] = useState<FilmStock | null>(null);
  const [formLocation, setFormLocation] = useState('');
  const [formShots, setFormShots] = useState('');
  const [formWeather, setFormWeather] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formRating, setFormRating] = useState(0);
  const [saving, setSaving] = useState(false);
  
  // Picker modals
  const [showCameraPicker, setShowCameraPicker] = useState(false);
  const [showFilmPicker, setShowFilmPicker] = useState(false);

  const fetchData = async () => {
    try {
      const headers = await getAuthHeaders();
      const [logsRes, camerasRes, filmRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/shooting-log`, { headers }),
        fetch(`${API_URL}/api/cameras`, { headers }),
        fetch(`${API_URL}/api/film-stock`, { headers }),
        fetch(`${API_URL}/api/shooting-stats`, { headers }),
      ]);
      
      if (logsRes.ok) setLogs(await logsRes.json());
      if (camerasRes.ok) setCameras(await camerasRes.json());
      if (filmRes.ok) setFilmStock(await filmRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCamera(null);
    setFormFilm(null);
    setFormLocation('');
    setFormShots('');
    setFormWeather('');
    setFormNotes('');
    setFormRating(0);
  };

  const handleSave = async () => {
    if (!formDate) {
      Alert.alert('Required', 'Please enter a date');
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/shooting-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          date: formDate,
          camera_id: formCamera?.id || null,
          camera_name: formCamera ? `${formCamera.brand} ${formCamera.name}` : null,
          film_stock_id: formFilm?.id || null,
          film_name: formFilm ? `${formFilm.brand} ${formFilm.name}` : null,
          location: formLocation || null,
          shots_taken: formShots ? parseInt(formShots) : null,
          weather: formWeather || null,
          notes: formNotes || null,
          rating: formRating || null,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Shooting session logged!');
        resetForm();
        setShowAddModal(false);
        fetchData();
      } else {
        Alert.alert('Error', 'Failed to save log');
      }
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Entry',
      'Remove this shooting log entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              await fetch(`${API_URL}/api/shooting-log/${id}`, {
                method: 'DELETE',
                headers,
              });
              fetchData();
            } catch (error) {
              console.error('Error deleting:', error);
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating: number, interactive = false, onPress?: (r: number) => void) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            disabled={!interactive}
            onPress={() => onPress && onPress(star)}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={interactive ? 28 : 16}
              color={star <= rating ? "#FFD700" : theme.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: ShootingLog }) => (
    <TouchableOpacity
      style={[styles.logCard, { backgroundColor: theme.surface }]}
      onLongPress={() => handleDelete(item.id)}
    >
      <View style={styles.logHeader}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar" size={16} color={theme.primary} />
          <Text style={[styles.logDate, { color: theme.text }]}>{item.date}</Text>
        </View>
        {item.rating && renderStars(item.rating)}
      </View>
      
      {item.camera_name && (
        <View style={styles.logRow}>
          <Ionicons name="camera" size={16} color={theme.textSecondary} />
          <Text style={[styles.logText, { color: theme.text }]}>{item.camera_name}</Text>
        </View>
      )}
      
      {item.film_name && (
        <View style={styles.logRow}>
          <Ionicons name="film" size={16} color={theme.textSecondary} />
          <Text style={[styles.logText, { color: theme.text }]}>{item.film_name}</Text>
        </View>
      )}
      
      <View style={styles.logDetails}>
        {item.location && (
          <View style={[styles.detailChip, { backgroundColor: theme.surfaceLight }]}>
            <Ionicons name="location" size={12} color={theme.textSecondary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>{item.location}</Text>
          </View>
        )}
        {item.weather && (
          <View style={[styles.detailChip, { backgroundColor: theme.surfaceLight }]}>
            <Ionicons name="partly-sunny" size={12} color={theme.textSecondary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>{item.weather}</Text>
          </View>
        )}
        {item.shots_taken && (
          <View style={[styles.detailChip, { backgroundColor: theme.primary + '30' }]}>
            <Text style={[styles.detailText, { color: theme.primary }]}>{item.shots_taken} shots</Text>
          </View>
        )}
      </View>
      
      {item.notes && (
        <Text style={[styles.logNotes, { color: theme.textMuted }]}>{item.notes}</Text>
      )}
    </TouchableOpacity>
  );

  const renderStats = () => {
    if (!stats) return null;
    
    return (
      <View style={[styles.statsContainer, { backgroundColor: theme.surface }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{stats.total_sessions}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{stats.total_shots}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Shots</Text>
          </View>
        </View>
        
        {stats.most_used_cameras?.length > 0 && (
          <View style={styles.topSection}>
            <Text style={[styles.topTitle, { color: theme.text }]}>Most Used Cameras</Text>
            {stats.most_used_cameras.slice(0, 3).map((cam: any, i: number) => (
              <View key={i} style={styles.topItem}>
                <Text style={[styles.topName, { color: theme.textSecondary }]}>{cam.name}</Text>
                <Text style={[styles.topCount, { color: theme.primary }]}>{cam.count}x</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Camera Picker Modal
  const renderCameraPicker = () => (
    <Modal visible={showCameraPicker} animationType="slide" transparent>
      <View style={styles.pickerOverlay}>
        <View style={[styles.pickerContent, { backgroundColor: theme.surface }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Camera</Text>
            <TouchableOpacity onPress={() => setShowCameraPicker(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={cameras}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerItem, { backgroundColor: theme.surfaceLight }]}
                onPress={() => {
                  setFormCamera(item);
                  setShowCameraPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, { color: theme.text }]}>
                  {item.brand} {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  // Film Picker Modal
  const renderFilmPicker = () => (
    <Modal visible={showFilmPicker} animationType="slide" transparent>
      <View style={styles.pickerOverlay}>
        <View style={[styles.pickerContent, { backgroundColor: theme.surface }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Film</Text>
            <TouchableOpacity onPress={() => setShowFilmPicker(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={filmStock}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerItem, { backgroundColor: theme.surfaceLight }]}
                onPress={() => {
                  setFormFilm(item);
                  setShowFilmPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, { color: theme.text }]}>
                  {item.brand} {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  // Add Modal
  const renderAddModal = () => (
    <Modal visible={showAddModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Log Shooting Session</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Date *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textMuted}
              value={formDate}
              onChangeText={setFormDate}
            />
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Camera</Text>
            <TouchableOpacity
              style={[styles.pickerButton, { backgroundColor: theme.surfaceLight }]}
              onPress={() => setShowCameraPicker(true)}
            >
              <Text style={[styles.pickerButtonText, { color: formCamera ? theme.text : theme.textMuted }]}>
                {formCamera ? `${formCamera.brand} ${formCamera.name}` : 'Select camera...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
            </TouchableOpacity>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Film Used</Text>
            <TouchableOpacity
              style={[styles.pickerButton, { backgroundColor: theme.surfaceLight }]}
              onPress={() => setShowFilmPicker(true)}
            >
              <Text style={[styles.pickerButtonText, { color: formFilm ? theme.text : theme.textMuted }]}>
                {formFilm ? `${formFilm.brand} ${formFilm.name}` : 'Select film...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
            </TouchableOpacity>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Location</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.text }]}
              placeholder="Where did you shoot?"
              placeholderTextColor={theme.textMuted}
              value={formLocation}
              onChangeText={setFormLocation}
            />
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Shots Taken</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.text }]}
              placeholder="Number of shots/frames"
              placeholderTextColor={theme.textMuted}
              value={formShots}
              onChangeText={setFormShots}
              keyboardType="numeric"
            />
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Weather/Lighting</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
              {WEATHER_OPTIONS.map(weather => (
                <TouchableOpacity
                  key={weather}
                  style={[
                    styles.optionChip,
                    { backgroundColor: formWeather === weather ? theme.primary : theme.surfaceLight }
                  ]}
                  onPress={() => setFormWeather(formWeather === weather ? '' : weather)}
                >
                  <Text style={[styles.optionChipText, { color: formWeather === weather ? '#fff' : theme.text }]}>
                    {weather}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Rating</Text>
            <View style={styles.ratingContainer}>
              {renderStars(formRating, true, setFormRating)}
            </View>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.surfaceLight, color: theme.text }]}
              placeholder="What did you shoot? Any notes..."
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
                  <Text style={styles.saveButtonText}>Log Session</Text>
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
      {renderCameraPicker()}
      {renderFilmPicker()}
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Shooting Log</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {logs.length} sessions logged
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Stats */}
      {renderStats()}
      
      {/* List */}
      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Sessions Yet</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Log your shooting sessions to track which cameras and films you use most
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Log Session</Text>
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
  statsContainer: { margin: 16, marginBottom: 8, padding: 16, borderRadius: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },
  topSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  topTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  topItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  topName: { fontSize: 14 },
  topCount: { fontSize: 14, fontWeight: '600' },
  list: { padding: 16, paddingTop: 0 },
  logCard: { borderRadius: 12, padding: 14, marginBottom: 12 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logDate: { fontSize: 16, fontWeight: '600' },
  starsRow: { flexDirection: 'row', gap: 2 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  logText: { fontSize: 15 },
  logDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  detailChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  detailText: { fontSize: 12 },
  logNotes: { marginTop: 8, fontSize: 13, fontStyle: 'italic' },
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
  pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10 },
  pickerButtonText: { fontSize: 16 },
  optionsRow: { marginVertical: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  optionChipText: { fontSize: 14 },
  ratingContainer: { marginVertical: 8 },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Picker modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContent: { maxHeight: '60%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  pickerTitle: { fontSize: 18, fontWeight: 'bold' },
  pickerItem: { padding: 16, marginHorizontal: 16, marginVertical: 4, borderRadius: 10 },
  pickerItemText: { fontSize: 16 },
});
