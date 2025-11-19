// tracking-review.tsx
// Screen to review effectiveness tracking data

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { colors, fontSize, spacing, borderRadius, shadows } from '../styles';
import { updateRoutineItem, rateEffectiveness } from '../utils/newApiService';

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
  const itemId = params.itemId;
  
  // Track which concerns have been rated
  const [ratedConcerns, setRatedConcerns] = useState<Set<string>>(new Set());

  // Get usage response text
  const getUsageResponseText = () => {
    if (usageResponse === 'yes') {
      return "Yes, I've been using it consistently - Missing once or twice is okay";
    } else if (usageResponse === 'no') {
      return "No, I haven't been using it consistently - I've missed multiple times per week";
    }
    return null;
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

  const handleStopTracking = async () => {
    Alert.alert(
      'Stop Tracking',
      'Are you sure you want to stop tracking this product?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Stop Tracking',
          style: 'destructive',
          onPress: async () => {
            try {
              const routineData = params.routineData || {};
              const itemId = params.itemId;
              
              if (!itemId) {
                Alert.alert('Error', 'Item ID not found');
                return;
              }

              const today = new Date().toISOString().split('T')[0];
              
              // Format type for API
              const formatType = (type: string): string => {
                if (!type) return 'product';
                const typeLower = type.toLowerCase();
                if (typeLower === 'product') return 'product';
                if (typeLower === 'activity') return 'activity';
                if (typeLower === 'nutrition') return 'nutrition';
                if (typeLower.includes('treatment')) {
                  if (typeLower.includes('facial')) return 'treatment_facial';
                  if (typeLower.includes('injection')) return 'treatment_injection';
                  return 'treatment_other';
                }
                return 'product';
              };

              // Format usage for API
              const formatUsage = (usage: string): string => {
                if (!usage) return 'am';
                const usageLower = usage.toLowerCase();
                if (usageLower === 'am' || usageLower === 'pm') return usageLower;
                if (usageLower.includes('both') || usageLower.includes('am + pm')) return 'both';
                if (usageLower.includes('as needed')) return 'as_needed';
                return 'am';
              };

              // Format frequency for API
              const formatFrequency = (frequency: string): string => {
                if (!frequency) return 'daily';
                const freqLower = frequency.toLowerCase();
                if (freqLower === 'daily' || freqLower === 'weekly') return freqLower;
                if (freqLower.includes('as needed')) return 'as_needed';
                return 'daily';
              };

              const updateData: any = {
                name: routineData.name || '',
                type: formatType(routineData.type || 'Product'),
                usage: formatUsage(routineData.usage || 'AM'),
                frequency: formatFrequency(routineData.frequency || 'Daily'),
                concern: routineData.concerns || [],
                end_date: today,
                extra: {
                  ...routineData.extra,
                  dateStopped: new Date().toISOString(),
                  stopReason: 'Not using consistently'
                }
              };

              if (routineData.upc) {
                updateData.upc = routineData.upc;
              }

              await updateRoutineItem(itemId, updateData);
              
              Alert.alert(
                'Tracking Stopped',
                'Product tracking has been stopped.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } catch (error) {
              console.error('Error stopping tracking:', error);
              Alert.alert(
                'Error',
                'Failed to stop tracking. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
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

          {/* Concern Tracking Cards */}
          {concernTracking.length > 0 ? (
            concernTracking.map((tracking: any, index: number) => {
              const weeksCompleted = tracking.weeks_completed || 0;
              const totalWeeks = tracking.total_weeks || 0;
              const isCompleted = tracking.is_completed || false;
              const baselineScore = tracking.scores?.baseline_score;
              const currentScore = tracking.scores?.current_score;
              
              // Determine review status text
              const reviewStatusText = isCompleted 
                ? `Review complete week ${weeksCompleted}/${totalWeeks}`
                : `Review Incomplete week ${weeksCompleted}/${totalWeeks}`;
              
              // Score change display
              const scoreChangeText = baselineScore !== null && currentScore !== null
                ? `${baselineScore} -> ${currentScore}`
                : null;

              const handleEffective = async () => {
                if (!itemId || ratedConcerns.has(tracking.concern_name)) {
                  return;
                }

                try {
                  await rateEffectiveness(itemId, [
                    {
                      concern_name: tracking.concern_name,
                      is_effective: true
                    }
                  ]);
                  
                  setRatedConcerns(prev => new Set(prev).add(tracking.concern_name));
                  Alert.alert(
                    'Success',
                    `${formatConcernName(tracking.concern_name)} marked as effective`,
                    [{ text: 'OK' }]
                  );
                } catch (error: any) {
                  console.error('Error rating effectiveness:', error);
                  Alert.alert(
                    'Error',
                    'Failed to rate effectiveness. Please try again.',
                    [{ text: 'OK' }]
                  );
                }
              };

              const handleNotEffective = async () => {
                if (!itemId || ratedConcerns.has(tracking.concern_name)) {
                  return;
                }

                try {
                  await rateEffectiveness(itemId, [
                    {
                      concern_name: tracking.concern_name,
                      is_effective: false
                    }
                  ]);
                  
                  setRatedConcerns(prev => new Set(prev).add(tracking.concern_name));
                  Alert.alert(
                    'Success',
                    `${formatConcernName(tracking.concern_name)} marked as not effective`,
                    [{ text: 'OK' }]
                  );
                } catch (error: any) {
                  console.error('Error rating effectiveness:', error);
                  Alert.alert(
                    'Error',
                    'Failed to rate effectiveness. Please try again.',
                    [{ text: 'OK' }]
                  );
                }
              };

              const handleContinueTracking = () => {
                // TODO: Implement continue tracking
                console.log('Continue tracking:', tracking.concern_name);
              };
              
              return (
                <View key={index} style={styles.trackingCard}>
                  {/* Section Header */}
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderLabel}>Concern</Text>
                    <Text style={styles.sectionHeaderLabel}>Score Change</Text>
                  </View>

                  {/* Concern Name */}
                  <Text style={styles.concernName}>
                    {formatConcernName(tracking.concern_name)}
                  </Text>

                  {/* Review Status and Score Change Row */}
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewStatus}>
                      {reviewStatusText}
                    </Text>
                    {scoreChangeText && (
                      <Text style={styles.scoreChange}>
                        {scoreChangeText}
                      </Text>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton, 
                        styles.effectiveButton,
                        (!isCompleted || ratedConcerns.has(tracking.concern_name)) && styles.disabledButton
                      ]}
                      onPress={isCompleted && !ratedConcerns.has(tracking.concern_name) ? handleEffective : undefined}
                      activeOpacity={isCompleted && !ratedConcerns.has(tracking.concern_name) ? 0.7 : 1}
                      disabled={!isCompleted || ratedConcerns.has(tracking.concern_name)}
                    >
                      <Text style={[
                        styles.effectiveButtonText,
                        (!isCompleted || ratedConcerns.has(tracking.concern_name)) && styles.disabledButtonText
                      ]}>
                        {ratedConcerns.has(tracking.concern_name) ? 'Rated' : 'Effective'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton, 
                        styles.notEffectiveButton,
                        (!isCompleted || ratedConcerns.has(tracking.concern_name)) && styles.disabledButton
                      ]}
                      onPress={isCompleted && !ratedConcerns.has(tracking.concern_name) ? handleNotEffective : undefined}
                      activeOpacity={isCompleted && !ratedConcerns.has(tracking.concern_name) ? 0.7 : 1}
                      disabled={!isCompleted || ratedConcerns.has(tracking.concern_name)}
                    >
                      <Text style={[
                        styles.notEffectiveButtonText,
                        (!isCompleted || ratedConcerns.has(tracking.concern_name)) && styles.disabledButtonText
                      ]}>
                        {ratedConcerns.has(tracking.concern_name) ? 'Rated' : 'Not Effective'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Continue Tracking Button (only for incomplete reviews) */}
                  {/* {!isCompleted && (
                    <TouchableOpacity
                      style={styles.continueTrackingButton}
                      onPress={handleContinueTracking}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.continueTrackingText}>Continue tracking</Text>
                    </TouchableOpacity>
                  )} */}
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

      {/* Stop Tracking Button - Show when user selected "no" */}
      {usageResponse === 'no' && (
        <View style={styles.footerContainer}>
          <TouchableOpacity 
            style={styles.stopTrackingButton}
            onPress={handleStopTracking}
            activeOpacity={0.8}
          >
            <Text style={styles.stopTrackingButtonText}>Stop Tracking</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: spacing.xl + 100, // Extra padding for footer button when visible
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionHeaderLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  concernName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reviewStatus: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scoreChange: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  effectiveButton: {
    backgroundColor: colors.white,
    borderColor: '#10B981',
  },
  notEffectiveButton: {
    backgroundColor: colors.white,
    borderColor: '#EF4444',
  },
  effectiveButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#10B981',
  },
  notEffectiveButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#EF4444',
  },
  disabledButton: {
    opacity: 0.5,
    borderColor: colors.border,
  },
  disabledButtonText: {
    color: colors.textSecondary,
  },
  continueTrackingButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueTrackingText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
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
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...shadows.md,
  },
  stopTrackingButton: {
    backgroundColor: '#EF4444',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  stopTrackingButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
});

export default TrackingReviewScreen;

