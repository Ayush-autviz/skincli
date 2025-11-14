// tracking-review.tsx
// Screen to review effectiveness tracking data

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, CheckCircle, TrendingDown, TrendingUp, Minus, AlertCircle, X, Check } from 'lucide-react-native';
import { colors, fontSize, spacing, borderRadius, shadows } from '../styles';

interface TrackingReviewParams {
  itemId: string;
  routineData: any;
  productData: any;
  concernTracking: any[];
}

const TrackingReviewScreen = (): React.JSX.Element => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as TrackingReviewParams || {};
  
  const concernTracking = params.concernTracking || [];
  
  // State for first visit modal
  const [showUsageModal, setShowUsageModal] = useState<boolean>(true);
  const [usageResponse, setUsageResponse] = useState<string | null>(null);

  // Helper function to get improvement status
  const getImprovementStatus = (status: string | null | undefined) => {
    if (!status) {
      return {
        label: 'No Data',
        icon: AlertCircle,
        color: '#9CA3AF'
      };
    }
    
    const statusMap: { [key: string]: { label: string; icon: any; color: string } } = {
      'improved': {
        label: 'Improved',
        icon: TrendingUp,
        color: '#22C55E'
      },
      'worsened': {
        label: 'Worsened',
        icon: TrendingDown,
        color: '#EF4444'
      },
      'no_change': {
        label: 'No Data',
        icon: AlertCircle,
        color: '#9CA3AF'
      },
      'insufficient_data': {
        label: 'Insufficient Data',
        icon: AlertCircle,
        color: '#F59E0B'
      }
    };
    
    return statusMap[status] || {
      label: 'No Data',
      icon: AlertCircle,
      color: '#9CA3AF'
    };
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

  // Format usage and frequency for display
  const getUsageInfo = () => {
    const routineData = params.routineData || {};
    const usage = routineData.usage || '';
    const frequency = routineData.frequency || '';
    const concerns = routineData.concerns || [];
    
    // Format usage
    let usageText = '';
    if (usage === 'am') usageText = 'AM';
    else if (usage === 'pm') usageText = 'PM';
    else if (usage === 'both') usageText = 'AM / PM';
    else if (usage === 'as_needed') usageText = 'As needed';
    else usageText = usage;
    
    // Format frequency
    let frequencyText = '';
    if (frequency === 'daily') frequencyText = 'Daily';
    else if (frequency === 'weekly') frequencyText = 'Weekly';
    else if (frequency === 'monthly') frequencyText = 'Monthly';
    else frequencyText = frequency;
    
    // Format concerns
    const concernsText = concerns.length > 0 
      ? concerns.map((c: string) => c.toLowerCase()).join(', ')
      : '';
    
    if (usage === 'as_needed') {
      return `Using ${usageText} / ${frequencyText}${concernsText ? ` for ${concernsText}` : ''}`;
    }
    return `Using ${usageText} / ${frequencyText}${concernsText ? ` for ${concernsText}` : ''}`;
  };

  const handleUsageResponse = (response: 'yes' | 'no') => {
    setUsageResponse(response);
    setShowUsageModal(false);
  };

  return (
    <View style={styles.container}>
      {/* Usage Modal - Shows on first visit */}
      <Modal
        visible={showUsageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUsageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowUsageModal(false)}
            >
              <View style={styles.modalCloseIconContainer}>
                <X size={18} color={colors.textPrimary} />
              </View>
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.modalTitle}>Review Effectiveness</Text>

            {/* Product Info */}
            {params.productData?.product_name && (
              <View style={styles.modalProductInfo}>
                <Text style={styles.modalProductName}>
                  {params.productData.product_name}
                </Text>
                <Text style={styles.modalUsageInfo}>
                  {getUsageInfo()}
                </Text>
              </View>
            )}

            {/* Question */}
            <Text style={styles.modalQuestion}>
              Have you been using this product as needed?
            </Text>

            {/* Response Options */}
            <View style={styles.modalOptionsContainer}>
              {/* Yes Option */}
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  usageResponse === 'yes' && styles.modalOptionSelected
                ]}
                onPress={() => handleUsageResponse('yes')}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.modalOptionIcon,
                  usageResponse === 'yes' && styles.modalOptionIconSelected
                ]}>
                  <Check size={16} color={usageResponse === 'yes' ? colors.white : colors.textSecondary} />
                </View>
                <View style={styles.modalOptionTextContainer}>
                  <Text style={[
                    styles.modalOptionText,
                    usageResponse === 'yes' && styles.modalOptionTextSelected
                  ]}>
                    Yes, I've been using it consistently
                  </Text>
                  <Text style={styles.modalOptionSubtext}>
                    Missing once or twice is okay
                  </Text>
                </View>
              </TouchableOpacity>

              {/* No Option */}
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  usageResponse === 'no' && styles.modalOptionSelected
                ]}
                onPress={() => handleUsageResponse('no')}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.modalOptionIcon,
                  usageResponse === 'no' && styles.modalOptionIconSelected
                ]}>
                  <X size={16} color={usageResponse === 'no' ? colors.white : colors.textSecondary} />
                </View>
                <View style={styles.modalOptionTextContainer}>
                  <Text style={[
                    styles.modalOptionText,
                    usageResponse === 'no' && styles.modalOptionTextSelected
                  ]}>
                    No, I haven't been using it consistently
                  </Text>
                  <Text style={styles.modalOptionSubtext}>
                    I've missed multiple times per week
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

          {/* Tracking Subtitle */}
          <Text style={styles.trackingSubtitle}>
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
              
              // Determine score box background color based on current score
              const getScoreBgColor = (score: number | null) => {
                if (score === null) return '#f5f5f5';
                if (score >= 70) return '#4CAF5015'; // Light green
                if (score >= 50) return '#FF980015'; // Light orange
                return '#F4433615'; // Light red
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

                  {/* Scores Row - Similar to metricDetail design */}
                  {tracking.scores && (tracking.scores.baseline_score !== null || tracking.scores.current_score !== null) && (
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalCloseButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  modalCloseIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalProductInfo: {
    marginBottom: spacing.xl,
  },
  modalProductName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalUsageInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalQuestion: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  modalOptionsContainer: {
    gap: spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: colors.white,
  },
  modalOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}05`,
  },
  modalOptionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  modalOptionIconSelected: {
    backgroundColor: colors.primary,
  },
  modalOptionTextContainer: {
    flex: 1,
  },
  modalOptionText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalOptionTextSelected: {
    color: colors.primary,
  },
  modalOptionSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default TrackingReviewScreen;

