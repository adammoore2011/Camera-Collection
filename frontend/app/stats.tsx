import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SESSION_TOKEN_KEY = '@vintage_camera_session_token';
const screenWidth = Dimensions.get('window').width;

interface Stats {
  total_cameras: number;
  total_wishlist: number;
  total_accessories: number;
  total_estimated_value: number;
  total_purchase_price: number;
  average_camera_value: number;
  value_appreciation: number;
  appreciation_percentage: number;
  cameras_with_value_count: number;
  by_type: { [key: string]: number };
  by_type_value: { [key: string]: number };
  by_format: { [key: string]: number };
  by_condition: { [key: string]: number };
  by_decade: { [key: string]: number };
  by_brand: { [key: string]: number };
  top_valuable_cameras: Array<{
    id: string;
    name: string;
    brand: string;
    estimated_value: number;
  }>;
}

export default function StatsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'value' | 'breakdown'>('overview');

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchStats = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/stats`, { headers });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Mint': return '#27AE60';
      case 'Excellent': return '#2ECC71';
      case 'Good': return '#F39C12';
      case 'Fair': return '#E67E22';
      case 'For Parts': return '#E74C3C';
      default: return theme.textSecondary;
    }
  };

  const renderBarChart = (data: { [key: string]: number }, colorFn?: (key: string) => string) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const maxValue = Math.max(...entries.map(([_, v]) => v), 1);

    return entries.slice(0, 8).map(([key, value], index) => (
      <View key={key} style={styles.barRow}>
        <Text style={[styles.barLabel, { color: theme.text }]} numberOfLines={1}>
          {key}
        </Text>
        <View style={styles.barContainer}>
          <View
            style={[
              styles.bar,
              {
                width: `${(value / maxValue) * 100}%`,
                backgroundColor: colorFn ? colorFn(key) : theme.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.barValue, { color: theme.textSecondary }]}>{value}</Text>
      </View>
    ));
  };

  const renderDecadeHistogram = () => {
    if (!stats || Object.keys(stats.by_decade).length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Ionicons name="bar-chart-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No year data available
          </Text>
        </View>
      );
    }

    const decades = Object.entries(stats.by_decade).sort((a, b) => a[0].localeCompare(b[0]));
    const maxCount = Math.max(...decades.map(([_, count]) => count), 1);
    const barWidth = Math.max(40, (screenWidth - 80) / decades.length - 8);

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.histogram}>
          {decades.map(([decade, count], index) => (
            <View key={decade} style={styles.histogramBar}>
              <Text style={[styles.histogramCount, { color: theme.text }]}>{count}</Text>
              <View
                style={[
                  styles.histogramBarFill,
                  {
                    height: Math.max(20, (count / maxCount) * 120),
                    width: barWidth,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
              <Text style={[styles.histogramLabel, { color: theme.textSecondary }]}>{decade}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading statistics...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle" size={64} color={theme.textMuted} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Failed to load statistics</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Section Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: theme.surface }]}>
        {(['overview', 'value', 'breakdown'] as const).map((section) => (
          <TouchableOpacity
            key={section}
            style={[
              styles.tab,
              activeSection === section && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setActiveSection(section)}
          >
            <Text style={[
              styles.tabText,
              { color: activeSection === section ? theme.primary : theme.textSecondary }
            ]}>
              {section === 'overview' ? 'Overview' : section === 'value' ? 'Value' : 'Breakdown'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <View style={styles.section}>
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
              <Ionicons name="camera" size={28} color={theme.primary} />
              <Text style={[styles.summaryValue, { color: theme.text }]}>{stats.total_cameras}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Cameras</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
              <Ionicons name="heart" size={28} color="#E74C3C" />
              <Text style={[styles.summaryValue, { color: theme.text }]}>{stats.total_wishlist}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Wishlist</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
              <Ionicons name="cube" size={28} color="#9B59B6" />
              <Text style={[styles.summaryValue, { color: theme.text }]}>{stats.total_accessories}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Accessories</Text>
            </View>
          </View>

          {/* Decade Histogram */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Cameras by Decade</Text>
            </View>
            {renderDecadeHistogram()}
          </View>

          {/* Top Brands */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="ribbon" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Top Brands</Text>
            </View>
            {Object.keys(stats.by_brand).length > 0 ? (
              renderBarChart(stats.by_brand)
            ) : (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No brand data</Text>
            )}
          </View>

          {/* Condition Distribution */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Condition</Text>
            </View>
            {Object.keys(stats.by_condition).length > 0 ? (
              renderBarChart(stats.by_condition, getConditionColor)
            ) : (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No condition data recorded</Text>
            )}
          </View>
        </View>
      )}

      {/* Value Section */}
      {activeSection === 'value' && (
        <View style={styles.section}>
          {/* Total Value Card */}
          <View style={[styles.valueHeroCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.valueHeroLabel, { color: theme.textSecondary }]}>Total Collection Value</Text>
            <Text style={[styles.valueHeroAmount, { color: theme.primary }]}>
              {formatCurrency(stats.total_estimated_value)}
            </Text>
            <Text style={[styles.valueHeroSubtext, { color: theme.textSecondary }]}>
              {stats.cameras_with_value_count} of {stats.total_cameras} cameras valued
            </Text>
          </View>

          {/* Value Stats Row */}
          <View style={styles.valueStatsRow}>
            <View style={[styles.valueStatCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.valueStatLabel, { color: theme.textSecondary }]}>Total Paid</Text>
              <Text style={[styles.valueStatAmount, { color: theme.text }]}>
                {formatCurrency(stats.total_purchase_price)}
              </Text>
            </View>
            <View style={[styles.valueStatCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.valueStatLabel, { color: theme.textSecondary }]}>Appreciation</Text>
              <Text style={[
                styles.valueStatAmount,
                { color: stats.value_appreciation >= 0 ? '#27AE60' : '#E74C3C' }
              ]}>
                {stats.value_appreciation >= 0 ? '+' : ''}{formatCurrency(stats.value_appreciation)}
              </Text>
              {stats.appreciation_percentage !== 0 && (
                <Text style={[
                  styles.valueStatPercent,
                  { color: stats.appreciation_percentage >= 0 ? '#27AE60' : '#E74C3C' }
                ]}>
                  ({stats.appreciation_percentage >= 0 ? '+' : ''}{stats.appreciation_percentage.toFixed(1)}%)
                </Text>
              )}
            </View>
          </View>

          {/* Average Value */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="calculator" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Average Camera Value</Text>
            </View>
            <Text style={[styles.avgValue, { color: theme.text }]}>
              {formatCurrency(stats.average_camera_value)}
            </Text>
          </View>

          {/* Value by Type */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="pie-chart" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Value by Camera Type</Text>
            </View>
            {Object.keys(stats.by_type_value).length > 0 ? (
              Object.entries(stats.by_type_value)
                .filter(([_, value]) => value > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([type, value]) => (
                  <View key={type} style={styles.typeValueRow}>
                    <Text style={[styles.typeValueLabel, { color: theme.text }]}>{type}</Text>
                    <Text style={[styles.typeValueAmount, { color: theme.primary }]}>{formatCurrency(value)}</Text>
                  </View>
                ))
            ) : (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No value data recorded</Text>
            )}
          </View>

          {/* Most Valuable Cameras */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="trophy" size={20} color="#F1C40F" />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Most Valuable Cameras</Text>
            </View>
            {stats.top_valuable_cameras.length > 0 ? (
              stats.top_valuable_cameras.map((camera, index) => (
                <TouchableOpacity
                  key={camera.id}
                  style={styles.valuableCamera}
                  onPress={() => router.push(`/camera/${camera.id}`)}
                >
                  <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#F1C40F' : index === 1 ? '#BDC3C7' : index === 2 ? '#CD7F32' : theme.surfaceLight }]}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.valuableCameraInfo}>
                    <Text style={[styles.valuableCameraName, { color: theme.text }]}>{camera.name}</Text>
                    <Text style={[styles.valuableCameraBrand, { color: theme.textSecondary }]}>{camera.brand}</Text>
                  </View>
                  <Text style={[styles.valuableCameraValue, { color: theme.primary }]}>
                    {formatCurrency(camera.estimated_value)}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No cameras with values recorded</Text>
            )}
          </View>
        </View>
      )}

      {/* Breakdown Section */}
      {activeSection === 'breakdown' && (
        <View style={styles.section}>
          {/* By Camera Type */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="aperture" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>By Camera Type</Text>
            </View>
            {Object.keys(stats.by_type).length > 0 ? (
              renderBarChart(stats.by_type)
            ) : (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No data</Text>
            )}
          </View>

          {/* By Film Format */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="film" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>By Film Format</Text>
            </View>
            {Object.keys(stats.by_format).length > 0 ? (
              renderBarChart(stats.by_format)
            ) : (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No data</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16 },
  tabContainer: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  section: { padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  summaryValue: { fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  summaryLabel: { fontSize: 12, marginTop: 4 },
  card: { borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  histogram: { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 8, paddingHorizontal: 8 },
  histogramBar: { alignItems: 'center', marginHorizontal: 4 },
  histogramBarFill: { borderRadius: 6 },
  histogramCount: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  histogramLabel: { fontSize: 10, marginTop: 4 },
  emptyChart: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { textAlign: 'center', fontSize: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 80, fontSize: 12 },
  barContainer: { flex: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, marginHorizontal: 8 },
  bar: { height: '100%', borderRadius: 8 },
  barValue: { width: 30, fontSize: 12, textAlign: 'right' },
  valueHeroCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  valueHeroLabel: { fontSize: 14 },
  valueHeroAmount: { fontSize: 42, fontWeight: 'bold', marginTop: 8 },
  valueHeroSubtext: { fontSize: 13, marginTop: 8 },
  valueStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  valueStatCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  valueStatLabel: { fontSize: 12 },
  valueStatAmount: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  valueStatPercent: { fontSize: 12, marginTop: 2 },
  avgValue: { fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  typeValueRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  typeValueLabel: { fontSize: 14 },
  typeValueAmount: { fontSize: 14, fontWeight: '600' },
  valuableCamera: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  rankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  valuableCameraInfo: { flex: 1, marginLeft: 12 },
  valuableCameraName: { fontSize: 14, fontWeight: '600' },
  valuableCameraBrand: { fontSize: 12, marginTop: 2 },
  valuableCameraValue: { fontSize: 14, fontWeight: '600' },
  bottomPadding: { height: 100 },
});
