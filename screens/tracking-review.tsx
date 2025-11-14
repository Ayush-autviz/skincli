// tracking-review.tsx
// Screen to review effectiveness tracking data

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, CheckCircle, TrendingDown, TrendingUp, Minus, AlertCircle, Camera } from 'lucide-react-native';
import { colors, fontSize, spacing, borderRadius, shadows } from '../styles';

interface TrackingReviewParams {
  itemId: string;
  routineData: any;
  productData: any;
  concernTracking: any[];
  usageResponse?: 'yes' | 'no' | null;
}

const TrackingReviewScreen = (): React.JSX.Element => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as TrackingReviewParams || {};
  
  const concernTracking = params.concernTracking || [];
  const usageResponse = params.usageResponse || null;

  // Get usage response text
  const getUsageResponseText = () => {
    if (usageResponse === 'yes') {
      return "Yes, I've been using it consistently - Missing once or twice is okay";
    } else if (usageResponse === 'no') {
      return "No, I haven't been using it consistently - I've missed multiple times per week";
    }
    return null;
  };

  // Helper function to get improvement status
  const getImprovementStatus = (status: string | null | undefined) => {
    switch (status) {
      case 'improving':
        return { icon: TrendingUp, color: '#10B981', label: 'Improving' };
      case 'declining':
        return { icon: TrendingDown, color: '#EF4444', label: 'Declining' };
      case 'stable':
        return { icon: Minus, color: '#6B7280', label: 'Stable' };
      default:
        return { icon: AlertCircle, color: '#9CA3AF', label: 'No Data' };
    }
  };

  // Helper function to format concern names
  const formatConcernName = (name: string): string => {
    if (!name) return '';
    // Convert snake_case to Title Case
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <View style={styles.iconContainer}>
              <ArrowLeft size={22} color={colors.primary} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Effectiveness Tracking</Text>
            <View style={styles.titleUnderline} />
          </View>
          
          <View style={styles.rightContainer} />
        </View>
        <View style={styles.shadowContainer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, { paddingTop: 120 }]}>
          {/* Product Info */}
          {/* {params.productData?.product_name && (
            <View style={styles.productInfoSection}>
              <Text style={styles.productName}>{params.productData.product_name}</Text>
              {params.productData.brand && (
                <Text style={styles.productBrand}>{params.productData.brand}</Text>
              )}
            </View>
          )} */}

          {/* Usage Response Text */}
          {getUsageResponseText() && (
            <View style={styles.usageResponseContainer}>
              <Text style={styles.usageResponseText}>
                {getUsageResponseText()}
              </Text>
            </View>
          )}

          {/* Tracking Subtitle */}
          <Text style={[styles.trackingSubtitle, !getUsageResponseText() && { marginTop: 20 }]}>
            Track your progress for each concern
          </Text>

          {/* Concern Tracking Cards */}
          {concernTracking.length > 0 ? (
            concernTracking.map((tracking: any, index: number) => {
              const statusInfo = getImprovementStatus(tracking.scores?.improvement_status);
              const StatusIcon = statusInfo.icon;
              const progressPercentage = tracking.total_weeks > 0 
                ? (tracking.weeks_completed / tracking.total_weeks) * 100 
                : 0;
              
              // Check if completed but all scores are null
              const isCompletedWithNullScores = tracking.is_completed && 
                tracking.scores?.baseline_score === null && 
                tracking.scores?.current_score === null && 
                tracking.scores?.score_difference === null && 
                tracking.scores?.improvement_status === null;
              
              // Determine score box background color based on current score
              const getScoreBgColor = (score: number | null) => {
                if (score === null) return '#f5f5f5';
                if (score >= 70) return '#4CAF5015'; // Light green
                if (score >= 50) return '#FF980015'; // Light orange
                return '#F4433615'; // Light red
              };

              const handleTakePhoto = () => {
                (navigation as any).navigate('Camera');
              };
              
              return (
                <View key={index} style={styles.trackingCard}>
                  {/* Header with Concern Name and Status */}
                  <View style={styles.trackingHeader}>
                    <View style={styles.trackingHeaderLeft}>
                      <Text style={styles.trackingConcernName}>
                        {formatConcernName(tracking.concern_name)}
                      </Text>
                      {tracking.is_completed && (
                        <View style={styles.completedBadge}>
                          <CheckCircle size={12} color="#10B981" />
                          <Text style={styles.completedText}>Completed</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}15` }]}>
                      <StatusIcon size={12} color={statusInfo.color} />
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* Show Take Photo button if completed but scores are null */}
                  {isCompletedWithNullScores ? (
                    <View style={styles.takePhotoSection}>
                      <Text style={styles.takePhotoText}>
                        Take a photo to see your results
                      </Text>
                      <TouchableOpacity 
                        style={styles.takePhotoButton}
                        onPress={handleTakePhoto}
                        activeOpacity={0.8}
                      >
                        <Camera size={16} color={colors.white} style={styles.takePhotoButtonIcon} />
                        <Text style={styles.takePhotoButtonText}>Take a Photo</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Scores Row - Similar to metricDetail design */
                    tracking.scores && (tracking.scores.baseline_score !== null || tracking.scores.current_score !== null) && (
                      <View style={styles.scoresRow}>
                        {tracking.scores.baseline_score !== null && (
                          <View style={[styles.scoreBox, { backgroundColor: getScoreBgColor(tracking.scores.baseline_score) }]}>
                            <Text style={styles.scoreBoxLabel}>Baseline</Text>
                            <Text style={styles.scoreBoxValue}>
                              {tracking.scores.baseline_score}
                            </Text>
                          </View>
                        )}
                        {tracking.scores.current_score !== null && (
                          <View style={[styles.scoreBox, { backgroundColor: getScoreBgColor(tracking.scores.current_score) }]}>
                            <Text style={styles.scoreBoxLabel}>Current</Text>
                            <Text style={styles.scoreBoxValue}>
                              {tracking.scores.current_score}
                            </Text>
                          </View>
                        )}
                        {tracking.scores.score_difference !== null && (
                          <View style={[
                            styles.changeBox,
                            tracking.scores.score_difference > 0 
                              ? styles.positiveChange 
                              : tracking.scores.score_difference < 0 
                              ? styles.negativeChange 
                              : styles.neutralChange
                          ]}>
                            <Text style={styles.changeBoxLabel}>Change</Text>
                            <View style={styles.changeValueContainer}>
                              {tracking.scores.score_difference !== 0 && (
                                <StatusIcon 
                                  size={14} 
                                  color={tracking.scores.score_difference > 0 ? '#22C55E' : '#EF4444'} 
                                />
                              )}
                              <Text style={[
                                styles.changeBoxValue,
                                { 
                                  color: tracking.scores.score_difference > 0 
                                    ? '#22C55E' 
                                    : tracking.scores.score_difference < 0 
                                    ? '#EF4444' 
                                    : '#6B7280'
                                }
                              ]}>
                                {tracking.scores.score_difference > 0 ? '+' : ''}
                                {tracking.scores.score_difference}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )
                  )}

                  {/* Progress Section */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Progress</Text>
                      <Text style={styles.progressPercentage}>
                        {Math.round(progressPercentage)}%
                      </Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              width: `${progressPercentage}%`,
                              backgroundColor: tracking.is_completed ? '#10B981' : colors.primary
                            }
                          ]} 
                        />
                      </View>
                    </View>
                    <Text style={styles.progressText}>
                      {tracking.weeks_completed} of {tracking.total_weeks} weeks completed
                    </Text>
                  </View>

                  {/* Footer Info */}
                  <View style={styles.trackingFooter}>
                    <View style={styles.footerItem}>
                      <Text style={styles.footerLabel}>Required Days</Text>
                      <Text style={styles.footerValue}>{tracking.required_days}</Text>
                    </View>
                    <View style={styles.footerDivider} />
                    <View style={styles.footerItem}>
                      <Text style={styles.footerLabel}>Status</Text>
                      <View style={[styles.statusDot, { backgroundColor: tracking.is_active ? '#10B981' : '#9CA3AF' }]} />
                      <Text style={[styles.footerValue, { color: tracking.is_active ? '#10B981' : '#9CA3AF' }]}>
                        {tracking.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No tracking data available</Text>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: 120,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 15,
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
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
    opacity: 0.8,
  },
  rightContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadowContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  content: {
    padding: spacing.lg,
  },
  productInfoSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  productBrand: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  usageResponseContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.sm,
  },
  usageResponseText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
    lineHeight: 20,
  },
  trackingSubtitle: {
    marginTop: 20,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  trackingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...shadows.sm,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  trackingHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trackingConcernName: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#10B98115',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill || 12,
  },
  completedText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#10B981',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill || 12,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  scoresRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  scoreBoxLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  scoreBoxValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  changeBox: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  positiveChange: {
    backgroundColor: '#22C55E15',
  },
  negativeChange: {
    backgroundColor: '#EF444415',
  },
  neutralChange: {
    backgroundColor: '#6B728015',
  },
  changeBoxLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  changeValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeBoxValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressSection: {
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressPercentage: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarContainer: {
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: borderRadius.pill || 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.pill || 5,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  trackingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    marginRight: 4,
  },
  footerValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginHorizontal: spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 40,
  },
  takePhotoSection: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  takePhotoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontWeight: '500',
  },
  takePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  takePhotoButtonIcon: {
    marginRight: 2,
  },
  takePhotoButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
});

export default TrackingReviewScreen;

