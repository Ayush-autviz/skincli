// ActivityList.tsx
// Component to display user activity timeline

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getComparisonSummaries } from '../../utils/newApiService';
import { colors, spacing, typography } from '../../styles';
import { 
  FlaskConical, 
  Plane, 
  CheckCircle, 
  User, 
  PlusCircle, 
  ChevronRight, 
  Clock 
} from 'lucide-react-native';

interface JournalSummaryItem {
  skin_result_id: string;
  image_id: string;
  created_at: string;
  summary: string;
}

// Mock activity data - in a real app, this would come from an API
// No mock data; we fetch real summaries from the API

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

  const getIconColor = (): string => colors.primary;

  const getIconComponent = (): React.ComponentType<any> => FlaskConical;

  const handlePress = useCallback((item: JournalSummaryItem) => {
    (navigation as any).navigate('ThreadChat', {
      chatType: 'snapshot_feedback',
      imageId: item.image_id,
      initialMessage: item.summary,
    });
  }, [navigation]);

  const renderSummaryItem: ListRenderItem<JournalSummaryItem> = ({ item }): React.JSX.Element => {
    const IconComponent = getIconComponent();
    const createdAt = new Date(item.created_at);
    const dateLabel = createdAt.toLocaleString();
    
    return (
      <TouchableOpacity style={styles.activityItem} onPress={() => handlePress(item)}>
        <View style={styles.activityIconContainer}>
          <IconComponent
            size={24}
            color={getIconColor()}
          />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityTitle} numberOfLines={2}>{item.summary}</Text>
          <View style={styles.activitySourceContainer}>
            <Text style={styles.activitySource}>{dateLabel}</Text>
            <ChevronRight
              size={16}
              color={colors.textSecondary}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (): React.JSX.Element => (
    <View style={styles.emptyContainer}>
      <Clock
        size={64}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyTitle}>No Activity Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your activity will appear here as you use the app
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading activity...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={summaries}
        renderItem={renderSummaryItem}
        keyExtractor={(item) => item.skin_result_id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityContent: {
    flex: 1,
    justifyContent: 'center',
  },
  activityTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  activitySourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  activitySource: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  activityTimestamp: {
    ...typography.caption,
    color: colors.textMicrocopy,
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64, // Align with content (48px icon + 16px margin)
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Removed coming soon overlay and faded content to enable interaction
});

export default ActivityList;
