import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SESSION_TOKEN_KEY = '@vintage_camera_session_token';
const screenWidth = Dimensions.get('window').width;

interface Camera {
  id: string;
  name: string;
  brand: string;
  camera_type: string;
  film_format: string;
  year?: string;
}

interface YearData {
  decade: string;
  count: number;
}

export default function StatsScreen() {
  const { theme } = useTheme();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchCameras = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/cameras`, { headers });
      if (response.ok) {
        const data = await response.json();
        setCameras(data);
      }
    } catch (error) {
      console.error('Error fetching cameras:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCameras();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCameras();
  };

  // Parse years and create histogram data
  const getYearHistogramData = (): YearData[] => {
    const yearCounts: { [key: string]: number } = {};
    
    cameras.forEach((camera) => {
      if (camera.year) {
        let yearKey = camera.year.trim();
        
        const yearMatch = yearKey.match(/(\d{4})/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1]);
          const decade = Math.floor(year / 10) * 10;
          yearKey = `${decade}s`;
        } else if (yearKey.toLowerCase().includes('s')) {
          const decadeMatch = yearKey.match(/(\d{4})s/i);
          if (decadeMatch) {
            yearKey = `${decadeMatch[1]}s`;
          }
        }
        
        yearCounts[yearKey] = (yearCounts[yearKey] || 0) + 1;
      }
    });

    const sortedKeys = Object.keys(yearCounts).sort((a, b) => {
      const aNum = parseInt(a.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.replace(/\D/g, '')) || 0;
      return aNum - bNum;
    });

    return sortedKeys.map((key) => ({
      decade: key,
      count: yearCounts[key],
    }));
  };

  const getCameraTypeStats = () => {
    const typeCounts: { [key: string]: number } = {};
    cameras.forEach((camera) => {
      typeCounts[camera.camera_type] = (typeCounts[camera.camera_type] || 0) + 1;
    });
    return Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const getBrandStats = () => {
    const brandCounts: { [key: string]: number } = {};
    cameras.forEach((camera) => {
      brandCounts[camera.brand] = (brandCounts[camera.brand] || 0) + 1;
    });
    return Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const yearData = getYearHistogramData();
  const typeStats = getCameraTypeStats();
  const brandStats = getBrandStats();
  const maxYearCount = Math.max(...yearData.map(d => d.count), 1);

  const barColors = [theme.primary, theme.primary + 'CC', theme.primary + '99', theme.primary + '77', theme.primary + '55', theme.primary + '44'];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading statistics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
        <View style={styles.summaryItem}>
          <Ionicons name="camera" size={32} color={theme.primary} />
          <Text style={[styles.summaryNumber, { color: theme.text }]}>{cameras.length}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Cameras</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
        <View style={styles.summaryItem}>
          <Ionicons name="calendar" size={32} color={theme.primary} />
          <Text style={[styles.summaryNumber, { color: theme.text }]}>{yearData.length}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Decades</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
        <View style={styles.summaryItem}>
          <Ionicons name="business" size={32} color={theme.primary} />
          <Text style={[styles.summaryNumber, { color: theme.text }]}>{new Set(cameras.map(c => c.brand)).size}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Brands</Text>
        </View>
      </View>

      {/* Year Histogram */}
      <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
        <View style={styles.chartHeader}>
          <Ionicons name="bar-chart" size={24} color={theme.primary} />
          <Text style={[styles.chartTitle, { color: theme.text }]}>Cameras by Decade</Text>
        </View>
        
        {yearData.length > 0 ? (
          <View style={styles.histogramContainer}>
            <View style={styles.yAxis}>
              {[...Array(maxYearCount + 1)].map((_, i) => (
                <Text key={i} style={[styles.yAxisLabel, { color: theme.textMuted }]}>
                  {maxYearCount - i}
                </Text>
              ))}
            </View>
            
            <View style={styles.barsContainer}>
              <View style={styles.gridLines}>
                {[...Array(maxYearCount + 1)].map((_, i) => (
                  <View key={i} style={[styles.gridLine, { backgroundColor: theme.border }]} />
                ))}
              </View>
              
              <View style={styles.bars}>
                {yearData.map((item, index) => {
                  const barHeight = (item.count / maxYearCount) * 150;
                  return (
                    <View key={item.decade} style={styles.barWrapper}>
                      <Text style={[styles.barValue, { color: theme.primary }]}>{item.count}</Text>
                      <View 
                        style={[
                          styles.bar, 
                          { 
                            height: barHeight,
                            backgroundColor: barColors[index % barColors.length],
                          }
                        ]} 
                      />
                      <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{item.decade}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Ionicons name="analytics-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No year data available</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Add years to your cameras to see the histogram</Text>
          </View>
        )}
      </View>

      {/* Camera Types */}
      <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
        <View style={styles.chartHeader}>
          <Ionicons name="aperture" size={24} color={theme.primary} />
          <Text style={[styles.chartTitle, { color: theme.text }]}>Top Camera Types</Text>
        </View>
        {typeStats.length > 0 ? (
          typeStats.map(([type, count], index) => (
            <View key={type} style={styles.statRow}>
              <View style={[styles.statRank, { backgroundColor: theme.surfaceLight }]}>
                <Text style={[styles.rankText, { color: theme.primary }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.statName, { color: theme.text }]} numberOfLines={1}>{type}</Text>
              <View style={[styles.statBarContainer, { backgroundColor: theme.surfaceLight }]}>
                <View 
                  style={[
                    styles.statBar, 
                    { width: `${(count / cameras.length) * 100}%`, backgroundColor: theme.primary }
                  ]} 
                />
              </View>
              <Text style={[styles.statCount, { color: theme.primary }]}>{count}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.noDataText, { color: theme.textMuted }]}>No cameras in collection</Text>
        )}
      </View>

      {/* Brands */}
      <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
        <View style={styles.chartHeader}>
          <Ionicons name="business" size={24} color={theme.primary} />
          <Text style={[styles.chartTitle, { color: theme.text }]}>Top Brands</Text>
        </View>
        {brandStats.length > 0 ? (
          brandStats.map(([brand, count], index) => (
            <View key={brand} style={styles.statRow}>
              <View style={[styles.statRank, { backgroundColor: theme.surfaceLight }]}>
                <Text style={[styles.rankText, { color: theme.primary }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.statName, { color: theme.text }]} numberOfLines={1}>{brand}</Text>
              <View style={[styles.statBarContainer, { backgroundColor: theme.surfaceLight }]}>
                <View 
                  style={[
                    styles.statBar, 
                    { width: `${(count / cameras.length) * 100}%`, backgroundColor: theme.primary }
                  ]} 
                />
              </View>
              <Text style={[styles.statCount, { color: theme.primary }]}>{count}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.noDataText, { color: theme.textMuted }]}>No cameras in collection</Text>
        )}
      </View>

      {/* Film Formats */}
      <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
        <View style={styles.chartHeader}>
          <Ionicons name="film" size={24} color={theme.primary} />
          <Text style={[styles.chartTitle, { color: theme.text }]}>Film Formats</Text>
        </View>
        {cameras.length > 0 ? (
          (() => {
            const formatCounts: { [key: string]: number } = {};
            cameras.forEach((camera) => {
              formatCounts[camera.film_format] = (formatCounts[camera.film_format] || 0) + 1;
            });
            return Object.entries(formatCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([format, count], index) => (
                <View key={format} style={styles.statRow}>
                  <View style={[styles.statRank, { backgroundColor: theme.surfaceLight }]}>
                    <Text style={[styles.rankText, { color: theme.primary }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.statName, { color: theme.text }]} numberOfLines={1}>{format}</Text>
                  <View style={[styles.statBarContainer, { backgroundColor: theme.surfaceLight }]}>
                    <View 
                      style={[
                        styles.statBar, 
                        { width: `${(count / cameras.length) * 100}%`, backgroundColor: theme.primary }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.statCount, { color: theme.primary }]}>{count}</Text>
                </View>
              ));
          })()
        ) : (
          <Text style={[styles.noDataText, { color: theme.textMuted }]}>No cameras in collection</Text>
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  histogramContainer: {
    flexDirection: 'row',
    height: 220,
  },
  yAxis: {
    width: 25,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingBottom: 25,
  },
  yAxisLabel: {
    fontSize: 11,
  },
  barsContainer: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 25,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 25,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 60,
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bar: {
    width: 30,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    marginTop: 8,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statName: {
    fontSize: 13,
    flex: 1,
  },
  statBarContainer: {
    width: 60,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  statBar: {
    height: '100%',
    borderRadius: 4,
  },
  statCount: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 25,
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  bottomPadding: {
    height: 100,
  },
});
