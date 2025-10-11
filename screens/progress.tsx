// (authenticated)/(tabs)/progress.tsx
// Progress tab screen for tracking user progress over time

/* ------------------------------------------------------
WHAT IT DOES
- Displays progress tracking interface
- Shows trends and improvements over time using photo metrics
- Fetches and processes user's analyzed photos

DEV PRINCIPLES
- Uses TypeScript for type safety
- Clean component structure
- Consistent styling
------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { AlertCircle, RefreshCw, TrendingUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import SettingsDrawer from '../components/layout/SettingsDrawer';
import TabHeader from '../components/ui/TabHeader';
import { colors, spacing, typography, shadows } from '../styles';
import MetricsSeries from '../components/analysis/MetricsSeries';
import { getComparison, transformComparisonData } from '../utils/newApiService';

export default function ProgressTab(): React.JSX.Element {
  const navigation = useNavigation();
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  const [isError, setIsError] = useState<boolean>(false);

  const handleMenuPress = (): void => {
    // setIsSettingsVisible(true);
    (navigation as any).navigate('Index');
  };

  // Fetch comparison data using simple axios
  const fetchComparisonData = async (isRefresh: boolean = false): Promise<void> => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setIsError(false);

      console.log('🔵 Fetching comparison data for progress screen');
      const response = await getComparison('older_than_6_month');

      if ((response as any).success && (response as any).data) {
        const transformedPhotos = transformComparisonData((response as any).data);
        console.log(`✅ Loaded ${transformedPhotos.length} photos for progress display`);
        setPhotos(transformedPhotos);
      } else {
        throw new Error('Failed to fetch comparison data');
      }
    } catch (err: any) {
      console.error('🔴 Progress data fetch error:', err);
      setError(err);
      setIsError(true);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  console.log('🔵 photos from ProgressTab:', photos);

  const handleRefresh = (): void => {
    fetchComparisonData(true);
  };

  const handleRetry = (): void => {
    fetchComparisonData(false);
  };

  useEffect(() => {
    fetchComparisonData();
  }, []);

  // All photos from comparison API already have metrics
  const analyzedPhotos = photos;

  // Enhanced Loading Component
  const LoadingState = (): React.JSX.Element => (
    <View style={styles.loadingContainer}>
      {/* <LinearGradient
        colors={[colors.primary + '20', colors.primary + '10']}
        style={styles.loadingGradient}
      > */}
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analyzing progress...</Text>
          <Text style={styles.loadingSubtext}>This may take a moment</Text>
        </View>
      {/* </LinearGradient> */}
    </View>
  );

  // Enhanced Error Component
  const ErrorState = (): React.JSX.Element => (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        <View style={styles.errorIconContainer}>
          <AlertCircle size={48} color={colors.error} />
        </View>
        <Text style={styles.errorText}>Unable to load progress</Text>
        <Text style={styles.errorSubtext}>
          {error?.message || 'Something went wrong while loading your progress data'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <RefreshCw size={16} color={colors.textOnPrimary} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Enhanced Empty State Component
  const EmptyState = (): React.JSX.Element => (
    <View style={styles.noDataContainer}>
      <View style={styles.emptyContent}>
        <LinearGradient
          colors={[colors.primary + '15', colors.primary + '05']}
          style={styles.emptyIconContainer}
        >
          <TrendingUp size={48} color={colors.primary} />
        </LinearGradient>
        <Text style={styles.noDataText}>Track your skin health and the efficacy of your skin care</Text>
        <Text style={styles.noDataSubtext}>
        On your first visit, take 2 photos to activate the tracker, then as often as you want!
        </Text>
      </View>
    </View>
  );

  console.log('🔵 analyzedPhotos from ProgressTab:', analyzedPhotos);

  return (
    <View style={styles.container}>
      <TabHeader
        title="Progress"
        onMenuPress={handleMenuPress}
        showBack={true}
      />

      <View style={styles.content}>
        {loading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : analyzedPhotos.length > 0 ? (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            <MetricsSeries photos={analyzedPhotos} />
          </ScrollView>
        ) : (
          <EmptyState />
        )}
      </View>

      {/* <SettingsDrawer
        isVisible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
      /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    marginTop: 120, // Space for new header
    marginBottom: 100, // Space for bottom nav
  },
  scrollContainer: {
    flex: 1,
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Enhanced Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingGradient: {
    borderRadius: 20,
    padding: spacing.xl,
    minWidth: 280,
    maxWidth: 350,
    alignItems: 'center',
    ...shadows.md,
  },
  loadingContent: {
    alignItems: 'center',
    maxWidth: 320,
    paddingHorizontal: spacing.md,
  },
  loadingText: {
    fontSize: 18,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    textAlign: 'center',
    fontWeight: '600',
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  loadingSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    flexWrap: 'wrap',
    maxWidth: '100%',
  },

  // Enhanced Error Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 25,
    ...shadows.sm,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },

  // Enhanced Empty State Styles
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  noDataText: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  noDataSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
