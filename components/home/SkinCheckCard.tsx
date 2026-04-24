import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, MessageSquareText } from 'lucide-react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { colors, spacing, typography, fontFamily } from '../../styles';
import { format, parseISO, isToday } from 'date-fns';

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
  scanned_date?: string; // Add optional scanned_date
  shared_with: Expert[];
  comments: Comment[];
}

interface SkinCheckCardProps {
  reports: Report[];
  loading: boolean;
  onPress?: () => void;
}

const SkinCheckCard: React.FC<SkinCheckCardProps> = ({
  reports,
  loading,
  onPress,
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonPlaceholder borderRadius={4}>
          <SkeletonPlaceholder.Item padding={20}>
            <SkeletonPlaceholder.Item
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <SkeletonPlaceholder.Item>
                <SkeletonPlaceholder.Item
                  width={120}
                  height={24}
                  borderRadius={4}
                />
                <SkeletonPlaceholder.Item
                  width={200}
                  height={16}
                  marginTop={8}
                  borderRadius={4}
                />
              </SkeletonPlaceholder.Item>
              <SkeletonPlaceholder.Item
                width={24}
                height={24}
                borderRadius={12}
              />
            </SkeletonPlaceholder.Item>
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      </View>
    );
  }

  const parseUTCDate = (dateString: string) => {
    if (!dateString) return null;
    let normalized = dateString;
    // Handled in other parts of the app (e.g. snapshot.tsx, threadChat.tsx)
    // If no timezone indicator, append Z to treat it as UTC
    if (
      !normalized.endsWith('Z') &&
      !normalized.includes('+') &&
      !normalized.includes('-', 10)
    ) {
      normalized = normalized + 'Z';
    }
    return parseISO(normalized);
  };

  const formatTime = (dateString: string) => {
    try {
      const date = parseUTCDate(dateString);
      return date ? format(date, 'h:mm a MMM d') : '';
    } catch (e) {
      return '';
    }
  };

  const formatRepliedTime = (dateString: string) => {
    try {
      const date = parseUTCDate(dateString);
      if (!date) return '';
      if (isToday(date)) {
        return `Replied ${format(date, 'h:mm a')} Today`;
      }
      return `Replied ${format(date, 'h:mm a MMM d')}`;
    } catch (e) {
      return '';
    }
  };

  const report = reports && reports.length > 0 ? reports[0] : null;

  if (!report) {
    return (
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.9}
        onPress={onPress}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Request a SkinCheck</Text>
          <ChevronRight size={24} color="#D1D5DB" />
        </View>
        <Text style={styles.subtitle}>
          Send this scan, your scores, and your routine to your skin health
          professional.
        </Text>
      </TouchableOpacity>
    );
  }

  const expert =
    report.shared_with && report.shared_with.length > 0
      ? report.shared_with[0]
      : null;
  const comment =
    report.comments && report.comments.length > 0 ? report.comments[0] : null;
  const sentTime = expert
    ? expert.shared_at || report.created_at
    : report.created_at;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.titleRow}
        activeOpacity={0.9}
        onPress={onPress}
      >
        <Text style={styles.title}>SkinCheck</Text>
        <ChevronRight size={24} color="#D1D5DB" />
      </TouchableOpacity>

      <View style={styles.innerBox}>
        {/* Sent info */}
        <View style={styles.sentInfoRow}>
          <Text style={styles.sentToText}>
            Sent to {expert?.expert_name || 'Expert'}
          </Text>
          <Text style={styles.sentTimeText}>{formatTime(sentTime)}</Text>
        </View>
        <Text style={styles.scanDateLabel}>
          Scan date -{' '}
          <Text style={styles.scanDateValue}>
            {formatTime(report.scanned_date || report.created_at)}
          </Text>
        </Text>

        {/* Reply info */}
        {comment && (
          <View style={styles.replySection}>
            <View style={styles.replyHeader}>
              <View style={styles.replyExpertRow}>
                <View style={styles.expertIconContainer}>
                  <MessageSquareText size={18} color="#4B5563" />
                </View>
                <View>
                  <Text style={styles.replyExpertName}>
                    {expert?.expert_name || 'Expert'}
                  </Text>
                  {/* <Text style={styles.replyExpertRole}>Professional</Text> */}
                </View>
              </View>
              <Text style={styles.sentTimeText}>
                {formatRepliedTime(comment.created_at)}
              </Text>
            </View>
            <Text style={styles.commentText}>{comment.comment_text}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1917',
    fontFamily: fontFamily.bold,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: fontFamily.regular,
    lineHeight: 20,
    paddingRight: 10,
  },
  innerBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  sentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sentToText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
    fontFamily: fontFamily.bold,
  },
  sentTimeText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: fontFamily.regular,
  },
  scanDateLabel: {
    fontSize: 14,
    color: '#4B5563',
    fontFamily: fontFamily.medium,
  },
  scanDateValue: {
    color: '#00839B',
    fontFamily: fontFamily.semiBold,
  },
  replySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  replyExpertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expertIconContainer: {
    marginRight: 10,
    //  backgroundColor: '#E5E7EB',
    //padding: 6,
    borderRadius: 8,
  },
  replyExpertName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1917',
    fontFamily: fontFamily.bold,
  },
  replyExpertRole: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: fontFamily.regular,
  },
  repliedTimeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: fontFamily.regular,
  },
  commentText: {
    fontSize: 14,
    color: '#4B5563',
    fontFamily: fontFamily.regular,
    lineHeight: 20,
    marginLeft: 30,
  },
});

export default SkinCheckCard;
