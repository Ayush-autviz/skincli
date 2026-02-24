// archived-routines.tsx
// Screen to display archived (stopped) routine items

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Alert, RefreshControl, ScrollView } from 'react-native';
import { colors, spacing, typography, shadows, fontFamily } from '../styles';
import { ChevronLeft, Archive, Clock, Calendar, Trash2, RotateCcw, AlertCircle, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import ListItem from '../components/ui/ListItem';
import TabHeader from '../components/ui/TabHeader';
import {
  getRoutineItems,
  updateRoutineItem,
  clearPendingRequests
} from '../utils/newApiService';

// Type definitions
interface RoutineItem {
  id: string;
  name: string;
  type: string;
  usage: string;
  frequency: string;
  dateStarted: string | Date | { toDate: () => Date };
  isActive: boolean;
  category?: string;
  brand?: string;
  notes?: string;
  treatmentDate?: string | Date;
  dateStopped?: string | Date;
}

interface ApiResponse {
  success: boolean;
  data: ApiItem[];
}

interface TransformedRoutineItem {
  id: string;
  name: string;
  type: string;
  usage: string;
  frequency: string;
  dateStarted: string | Date | { toDate: () => Date };
  isActive: boolean;
  category?: string;
  brand?: string;
  notes?: string;
  usageDuration?: string;
  treatmentDate?: string | Date;
  dateStopped?: string | Date;
  concerns?: any[];
  stopReason?: string;
  dateCreated?: Date;
  extra?: any;
}

interface ApiItem {
  id: string;
  name: string;
  type: string;
  usage: string;
  frequency: string;
  start_date?: string;
  end_date?: string;
  treatment_date?: string;
  end_reason?: string;
  isActive: boolean;
  category?: string;
  brand?: string;
  notes?: string;
  extra?: any;
  concern?: any[];
  concern_tracking?: any[];
}

// Helper function to calculate usage duration
const calculateUsageDuration = (dateStarted: string | Date | { toDate: () => Date } | null): string | null => {
  let start: Date | null = null;
  // Firestore Timestamp
  if (dateStarted && typeof dateStarted === 'object' && 'toDate' in dateStarted && typeof dateStarted.toDate === 'function') {
    start = dateStarted.toDate();
  }
  // JS Date
  else if (dateStarted instanceof Date) {
    start = dateStarted;
  }
  // String date (MM/DD/YY or MM/DD/YYYY)
  else if (typeof dateStarted === 'string' && dateStarted.includes('/')) {
    // Normalize to MM/DD/YYYY if needed
    let parts = dateStarted.split('/');
    if (parts.length === 3 && parts[2].length === 2) {
      parts[2] = (parseInt(parts[2], 10) > 50 ? '19' : '20') + parts[2];
    }
    start = new Date(parts.join('/'));
  } else {
    return null;
  }

  if (!start || isNaN(start.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30);
  const years = Math.floor(months / 12);

  if (years > 0) {
    return `Used for ${years} year${years > 1 ? 's' : ''}`;
  } else if (months > 0) {
    return `Used for ${months} month${months > 1 ? 's' : ''}`;
  } else {
    return `Used for ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }
};

const ArchivedRoutines: React.FC = () => {
  const navigation = useNavigation();
  const [routineItems, setRoutineItems] = useState<RoutineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Transform API data to component format
  const transformApiItem = (apiItem: ApiItem): TransformedRoutineItem => {
    // Normalize API values to component expected format
    const typeMap: { [key: string]: string } = {
      'product': 'Product',
      'activity': 'Activity',
      'nutrition': 'Nutrition',
      'treatment_facial': 'Treatment / Facial',
      'treatment_injection': 'Treatment / Injection',
      'treatment_other': 'Treatment / Other'
    };

    const usageMap: { [key: string]: string } = {
      'am': 'AM',
      'pm': 'PM',
      'both': 'AM + PM',
      'as_needed': 'As needed'
    };

    const frequencyMap: { [key: string]: string } = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'as_needed': 'As needed'
    };

    // Helper to get date from root level only
    const getDate = (dateValue: any): Date | null => {
      if (!dateValue) return null;
      try {
        return new Date(dateValue);
      } catch (e) {
        return null;
      }
    };

    // Check if this is a treatment type
    const isTreatment = apiItem.type && (
      apiItem.type === 'treatment_facial' ||
      apiItem.type === 'treatment_injection' ||
      apiItem.type === 'treatment_other'
    );

    return {
      id: apiItem.id,
      name: apiItem.name,
      type: typeMap[apiItem.type] || apiItem.type,
      usage: usageMap[apiItem.usage] || apiItem.usage,
      frequency: frequencyMap[apiItem.frequency] || apiItem.frequency,
      isActive: apiItem.isActive,
      concerns: apiItem.concern || apiItem.extra?.concerns || [],
      // For treatment types, use treatment date; for others, use start/stop dates from root level
      dateStarted: isTreatment ?
        getDate(apiItem.treatment_date) :
        getDate(apiItem.start_date),
      dateStopped: isTreatment ? undefined : // Treatments don't have stop dates
        getDate(apiItem.end_date),
      treatmentDate: isTreatment ?
        getDate(apiItem.treatment_date) : undefined,
      stopReason: apiItem.end_reason || '',
      dateCreated: getDate(apiItem.dateCreated) || new Date(),
      extra: apiItem.extra || {}
    };
  };

  // Fetch routine items from API
  const fetchRoutineItems = async (isRefresh: boolean = false): Promise<void> => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await getRoutineItems() as ApiResponse;

      if (response.success && response.data) {
        const transformedItems = response.data.map((item: ApiItem) => transformApiItem(item));
        // Filter only stopped items (exclude all treatments)
        const stoppedItems = transformedItems.filter((item: TransformedRoutineItem) => {
          const isTreatment = item.type && (
            item.type === 'Treatment / Facial' ||
            item.type === 'Treatment / Injection' ||
            item.type === 'Treatment / Other'
          );

          // Exclude all treatments from archived routines
          if (isTreatment) {
            return false;
          } else {
            // For non-treatments, only include stopped items
            if (item.dateStopped) {
              const stoppedDate = typeof item.dateStopped === 'string' ? new Date(item.dateStopped) : item.dateStopped;
              return stoppedDate <= new Date();
            }
            return false;
          }
        });
        setRoutineItems(stoppedItems);
      } else {
        setRoutineItems([]);
      }

      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('🔴 ArchivedRoutines: Error fetching routine items:', err);
      setError(err?.message || 'Failed to load archived routine items.');
      setRoutineItems([]);
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Skeleton Component – mirrors routine screen: header, section headers, separate item cards
  const RoutineSkeleton = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* List header – same as routine screen */}
      <View style={styles.skeletonListHeader}>
        <SkeletonPlaceholder borderRadius={4}>
          <SkeletonPlaceholder.Item flexDirection="row" justifyContent="space-between" alignItems="center">
            <SkeletonPlaceholder.Item width={160} height={14} />
            <SkeletonPlaceholder.Item width={110} height={14} />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      </View>

      {/* Section placeholder */}
      <View style={styles.skeletonSectionHeader}>
        <SkeletonPlaceholder borderRadius={4}>
          <SkeletonPlaceholder.Item width={80} height={12} />
        </SkeletonPlaceholder>
      </View>

      {[1, 2, 3, 4, 5].map((i) => (
        <View key={`archived-skeleton-${i}`} style={styles.skeletonItemCard}>
          <SkeletonPlaceholder borderRadius={4}>
            <SkeletonPlaceholder.Item flexDirection="row" alignItems="center">
              <SkeletonPlaceholder.Item width={40} height={40} borderRadius={20} marginRight={12} />
              <SkeletonPlaceholder.Item flex={1}>
                <SkeletonPlaceholder.Item width="60%" height={16} marginBottom={6} />
                <SkeletonPlaceholder.Item width="40%" height={12} />
              </SkeletonPlaceholder.Item>
              <SkeletonPlaceholder.Item width={20} height={20} borderRadius={10} />
            </SkeletonPlaceholder.Item>
          </SkeletonPlaceholder>
        </View>
      ))}
    </ScrollView>
  );

  useEffect(() => {
    fetchRoutineItems();
  }, []);

  // Refetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      clearPendingRequests();
      fetchRoutineItems();
    }, [])
  );

  const handleRefresh = (): void => {
    fetchRoutineItems(true);
  };

  const handleMenuPress = (): void => {
    navigation.goBack();
  };

  // Flatten items into single array (no grouping)
  const archivedItems = useMemo((): TransformedRoutineItem[] => {
    if (!routineItems || routineItems.length === 0) {
      return [];
    }

    // Sort all items by date (most recent first)
    const sortedItems = [...routineItems].sort((a: TransformedRoutineItem, b: TransformedRoutineItem) => {
      // For treatment types, use treatment date; for others, use stop date
      const isTreatmentA = a.type && (
        a.type === 'Treatment / Facial' ||
        a.type === 'Treatment / Injection' ||
        a.type === 'Treatment / Other'
      );
      const isTreatmentB = b.type && (
        b.type === 'Treatment / Facial' ||
        b.type === 'Treatment / Injection' ||
        b.type === 'Treatment / Other'
      );

      const dateA = isTreatmentA ?
        (a.treatmentDate ? new Date(a.treatmentDate) : new Date(0)) :
        (a.dateStopped ? new Date(a.dateStopped) : new Date(0));
      const dateB = isTreatmentB ?
        (b.treatmentDate ? new Date(b.treatmentDate) : new Date(0)) :
        (b.dateStopped ? new Date(b.dateStopped) : new Date(0));

      return dateB.getTime() - dateA.getTime();
    });

    return sortedItems;
  }, [routineItems]);

  // Render individual archived routine item
  const renderArchivedItem = ({ item }: { item: TransformedRoutineItem }) => {
    // Determine display usage
    let displayUsage = item.usage;
    if (item.usage === 'AM + PM') displayUsage = 'AM/PM';

    // Format date info
    let startDateStr = '';
    let stopDateStr = '';

    if (item.dateStarted) {
      const startDate = typeof item.dateStarted === 'string' ? new Date(item.dateStarted) :
        item.dateStarted instanceof Date ? item.dateStarted :
          item.dateStarted.toDate();
      startDateStr = startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    if (item.dateStopped) {
      const stopDate = typeof item.dateStopped === 'string' ? new Date(item.dateStopped) :
        item.dateStopped instanceof Date ? item.dateStopped :
          (item.dateStopped as any).toDate();
      stopDateStr = stopDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    const brandName = item.extra?.brand || 'CERAVE';
    const stopReason = item.stopReason || 'No reason specified';

    return (
      <TouchableOpacity
        style={styles.routineItemCard}
        onPress={() => { }} // No detail navigation for archived items
        activeOpacity={0.9}
      >
        <View style={styles.itemContentContainer}>
          <Text style={styles.brandText}>{brandName}</Text>
          <Text style={styles.itemNameText}>{item.name}</Text>

          <Text style={styles.usageText}>
            Used <Text style={styles.usageBoldText}>{item.frequency} / {displayUsage}</Text> from <Text style={styles.usageBoldText}>{startDateStr || 'N/A'}</Text> to <Text style={styles.usageBoldText}>{stopDateStr || 'N/A'}</Text>
          </Text>

          {/* <View style={styles.effectivenessContainer}>
            <Text style={styles.effectivenessText}>
              STOPPED <Text style={styles.effectivenessStatus}>{stopReason}</Text>
            </Text>
          </View> */}
        </View>

        {/* <View style={styles.chevronContainer}>
          <ChevronRight size={20} color="#D6D3D1" />
        </View> */}
      </TouchableOpacity>
    );
  };

  // Render section header

  // Enhanced Loading Component
  const LoadingState = () => (
    <RoutineSkeleton />
  );

  // Enhanced Error Component
  const ErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        <View style={styles.errorIconContainer}>
          <AlertCircle size={48} color={colors.error} />
        </View>
        <Text style={styles.errorText}>Unable to load archived routines</Text>
        <Text style={styles.errorSubtext}>
          {typeof error === 'string' ? error : (error as any)?.message || 'Something went wrong while loading your archived routines'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchRoutineItems()}>
          <RotateCcw size={16} color={colors.textOnPrimary} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Enhanced Empty State Component
  const EmptyState = () => (
    <View style={styles.noDataContainer}>
      <View style={styles.emptyContent}>
        <LinearGradient
          colors={[colors.primary + '15', colors.primary + '05']}
          style={styles.emptyIconContainer}
        >
          <Archive size={48} color={colors.primary} />
        </LinearGradient>
        <Text style={styles.noDataText}>No Archived Routines</Text>
        <Text style={styles.noDataSubtext}>
          Items you stop using will appear here
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* <TabHeader
        title="Archived Routines"
        onMenuPress={handleMenuPress}
        showBack={true}
      /> */}
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <View style={styles.iconContainer}>
              <ChevronLeft size={30} color="#44403C" />
            </View>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Archived Routines</Text>
          </View>
          <View style={styles.rightContainer} />
        </View>
        <View style={styles.shadowLine} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : archivedItems.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            style={styles.sectionsList}
            data={archivedItems}
            renderItem={renderArchivedItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContentContainer,
              { paddingBottom: insets.bottom + 20 }
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </View>
    </View>
  );

};

export default ArchivedRoutines;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    marginTop: 100, // Space for header
    // marginBottom: 100, // Space for bottom nav
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: 105,
    backgroundColor: colors.background,
    borderBottomWidth: 0.4,
    justifyContent: 'flex-end',
    borderBottomColor: '#E5E5E5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingBottom: 10,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rightContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadowLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionsList: {
    flex: 1,
  },
  listContentContainer: {
    paddingTop: spacing.lg,
    paddingHorizontal: 0,
  },
  sectionHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  sectionHeaderText: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
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
  archivedItemContainer: {
    marginHorizontal: 18,
  },
  routineItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemContentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#57534E',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: fontFamily.semiBold,
  },
  itemNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 4,
    lineHeight: 22,
    fontFamily: fontFamily.bold,
  },
  usageText: {
    fontSize: 13,
    color: '#78716C',
    marginBottom: 12,
    fontFamily: fontFamily.regular,
  },
  usageBoldText: {
    fontWeight: '700',
    color: '#78716C',
    fontFamily: fontFamily.bold,
  },
  effectivenessContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  effectivenessText: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '500',
    textTransform: 'uppercase',
    fontFamily: fontFamily.medium,
  },
  effectivenessStatus: {
    color: '#57534E',
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },
  chevronContainer: {
    justifyContent: 'flex-start',
    paddingLeft: 8,
    paddingTop: 0,
  },

  // Skeleton Styles
  skeletonListHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  skeletonSectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  skeletonItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E9EAEB',
  },
});
