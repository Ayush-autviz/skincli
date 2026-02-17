// ActivityList.tsx
// Journal tab – displays user activity / snapshot summaries
// Layout and theme aligned with Routine and Ingredients tabs

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getComparisonSummaries } from '../../utils/newApiService';
import { colors, spacing, fontFamily } from '../../styles';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {
  BookOpen,
  ChevronRight,
  Clock,
  NotebookPen,
} from 'lucide-react-native';

interface JournalSummaryItem {
  skin_result_id: string;
  image_id: string;
  created_at: string;
  updated_at: string;
  summary: string;
}

const formatJournalTimestamp = (timestamp: string): string => {
  if (!timestamp) return '';
  try {
    let utcTimestamp = timestamp;
    if (!timestamp.endsWith('Z') && !timestamp.includes('+') && !timestamp.includes('-', 10)) {
      utcTimestamp = timestamp + 'Z';
    }
    const date = new Date(utcTimestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

// Skeleton loading – same card layout as Ingredients tab
const JournalSkeleton = (): React.JSX.Element => (
  <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
    <View style={styles.mainCard}>
      <SkeletonPlaceholder borderRadius={4}>
        <SkeletonPlaceholder.Item flexDirection="row" alignItems="center" gap={8} marginBottom={6}>
          <SkeletonPlaceholder.Item width={20} height={20} borderRadius={10} />
          <SkeletonPlaceholder.Item width={120} height={16} />
        </SkeletonPlaceholder.Item>
        <SkeletonPlaceholder.Item width={260} height={12} marginBottom={20} />
      </SkeletonPlaceholder>
      {[1, 2, 3, 4].map((row) => (
        <SkeletonPlaceholder key={row} borderRadius={4}>
          <SkeletonPlaceholder.Item flexDirection="row" alignItems="center" paddingVertical={14}>
            {/* <SkeletonPlaceholder.Item width={48} height={48} borderRadius={24} marginRight={12} /> */}
            <SkeletonPlaceholder.Item flex={1}>
              <SkeletonPlaceholder.Item width="90%" height={14} marginBottom={6} />
              <SkeletonPlaceholder.Item width={140} height={12} />
            </SkeletonPlaceholder.Item>
            <SkeletonPlaceholder.Item width={18} height={18} borderRadius={9} />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      ))}
    </View>
    <View style={styles.bottomSpacer} />
  </ScrollView>
);

const ActivityList: React.FC = (): React.JSX.Element => {
  const navigation = useNavigation();
  const [summaries, setSummaries] = useState<JournalSummaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSummaries = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        const res = await getComparisonSummaries();
        if (res.success) {
          setSummaries(res.data || []);
        } else {
          setSummaries([]);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load summaries');
        setSummaries([]);
      } finally {
        setLoading(false);
      }
    };
    loadSummaries();
  }, []);

  const handlePress = useCallback((item: JournalSummaryItem) => {
    (navigation as any).navigate('ThreadChat', {
      chatType: 'snapshot_feedback',
      imageId: item.image_id,
      initialMessage: item.summary,
      fromJournal: true,
      journalSummary: item.summary,
    });
  }, [navigation]);

  if (loading) {
    return <JournalSkeleton />;
  }

  // Empty state – same UX as Ingredients no-data (centered, icon + text)
  if (!summaries || summaries.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noDataContainer}>
          <View style={styles.noDataContent}>
            <View style={styles.noDataIconContainer}>
              <Clock size={40} color={colors.primary} />
            </View>
            <Text style={styles.noDataTitle}>No activity yet</Text>
            <Text style={styles.noDataText}>Your snapshot summaries and feedback will appear here</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.mainCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderRow}>
            <NotebookPen size={20} color="#414651" />
            <Text style={styles.cardHeaderTitle}>Journal</Text>
          </View>
          <Text style={styles.cardHeaderSubtitle}>Your snapshot summaries and feedback</Text>
        </View>
        {summaries.map((item, index) => {
          const dateLabel = formatJournalTimestamp(item.updated_at || item.created_at);
          const isLast = index === summaries.length - 1;
          return (
            <TouchableOpacity
              key={item.skin_result_id}
              style={[styles.journalRow, !isLast && styles.journalRowBorder]}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              {/* <View style={styles.journalIconContainer}>
                <BookOpen size={24} color={colors.primary} />
              </View> */}
              <View style={styles.journalContent}>
                <Text style={styles.journalTitle} numberOfLines={2}>{item.summary}</Text>
                <Text style={styles.journalDate}>{dateLabel}</Text>
              </View>
              <ChevronRight size={18} color="#D6D3D1" />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: '#1C1917',
  },
  cardHeaderSubtitle: {
    fontSize: 13,
    color: '#78716C',
    marginTop: 2,
  },
  journalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  journalRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  journalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  journalContent: {
    flex: 1,
    justifyContent: 'center',
  },
  journalTitle: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    color: '#1C1917',
    marginBottom: 2,
    lineHeight: 20,
  },
  journalDate: {
    fontSize: 13,
    color: '#78716C',
  },
  bottomSpacer: {
    height: 100,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  noDataContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  noDataIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    color: '#1C1917',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 15,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ActivityList;
