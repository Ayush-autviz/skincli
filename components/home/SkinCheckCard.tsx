import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, MessageSquareText } from 'lucide-react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { colors, spacing, typography, fontFamily } from '../../styles';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface Expert {
  expert_name: string;
  expert_email: string;
  shared_at: string;
}

interface Comment {
  id: string;
  comment_text: string;
  author_name: string;
  created_at: string;
}

interface Report {
  report_id: string;
  status: string;
  created_at: string;
  shared_with: Expert[];
  comments: Comment[];
}

interface SkinCheckCardProps {
  reports: Report[];
  loading: boolean;
  onPress?: () => void;
}

const SkinCheckCard: React.FC<SkinCheckCardProps> = ({ reports, loading, onPress }) => {
  console.log("🔵 Reports in SkinCheckCard:", reports);
  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonPlaceholder borderRadius={4}>
          <SkeletonPlaceholder.Item padding={20}>
            <SkeletonPlaceholder.Item flexDirection="row" justifyContent="space-between" alignItems="center">
              <SkeletonPlaceholder.Item>
                <SkeletonPlaceholder.Item width={120} height={24} borderRadius={4} />
                <SkeletonPlaceholder.Item width={200} height={16} marginTop={8} borderRadius={4} />
              </SkeletonPlaceholder.Item>
              <SkeletonPlaceholder.Item width={24} height={24} borderRadius={12} />
            </SkeletonPlaceholder.Item>
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      </View>
    );
  }

  const formatDistance = (dateString: string) => {
    try {
      return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
    } catch (e) {
      return '';
    }
  };

  const renderReport = (report: Report, index: number) => {
    const hasComments = report.comments && report.comments.length > 0;
    const isShared = report.shared_with && report.shared_with.length > 0;

    if (hasComments) {
      const latestComment = report.comments[0];
      const expert = report.shared_with[0];
      return (
        <View key={report.report_id} style={[styles.commentCard, index > 0 && styles.reportSpacing]}>
          <View style={styles.commentHeader}>
            <View style={styles.expertInfoRow}>
              <View style={styles.iconContainer}>
                <MessageSquareText size={20} color="#6B7280" />
              </View>
              <View style={styles.expertNameColumn}>
                <Text style={styles.expertName}>{expert?.expert_name}</Text>
              </View>
            </View>
            <Text style={styles.timeAgo}>{formatDistance(latestComment.created_at)}</Text>
          </View>
          <Text style={styles.commentText} numberOfLines={3}>
            {latestComment.comment_text}
          </Text>
        </View>
      );
    }

    if (isShared) {
      const expert = report.shared_with[0];
      const sharedAt = expert.shared_at || report.created_at;
      return (
        <View key={report.report_id} style={[styles.sentStatusCard, index > 0 && styles.reportSpacing]}>
          <Text style={styles.sentText}>Sent to {expert.expert_name || 'Expert'}</Text>
          <Text style={styles.timeAgo}>{formatDistance(sharedAt)}</Text>
        </View>
      );
    }

    return null;
  };

  const validReports = reports.filter(r => (r.comments && r.comments.length > 0) || (r.shared_with && r.shared_with.length > 0));

  if (validReports.length === 0) {
    return (
      <TouchableOpacity style={styles.container} activeOpacity={0.9} onPress={onPress}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>SkinCheck</Text>
          <ChevronRight size={24} color="#D1D5DB" />
        </View>
        <Text style={styles.subtitle}>Send your skin scan, and your routine to your skin health professional.</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>SkinCheck</Text>
          <ChevronRight size={24} color="#D1D5DB" />
        </View>
        <Text style={styles.subtitle}>Send your skin scan, and your routine to your skin health professional.</Text>
      </View>

      <View style={styles.reportsList}>
        {validReports.map((report, index) => renderReport(report, index))}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: fontFamily.bold,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: fontFamily.regular,
    lineHeight: 20,
    paddingRight: 40,
  },
  reportsList: {
    marginTop: 4,
  },
  reportSpacing: {
    marginTop: 12,
  },
  // Sent Status Style
  sentStatusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  sentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    fontFamily: fontFamily.semiBold,
  },
  // Comment Card Style
  commentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  expertInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  expertNameColumn: {
    justifyContent: 'center',
  },
  expertName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: fontFamily.bold,
  },
  businessName: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: fontFamily.regular,
    marginTop: 1,
  },
  timeAgo: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: fontFamily.regular,
  },
  commentText: {
    fontSize: 14,
    color: '#4B5563',
    fontFamily: fontFamily.regular,
    lineHeight: 20,
  },
});

export default SkinCheckCard;
