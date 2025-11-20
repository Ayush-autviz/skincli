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
import { updateRoutineItem, rateEffectiveness, toggleTracking } from '../utils/newApiService';

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
  
  // Track effectiveness ratings - initialize from API data
  const [effectivenessRatings, setEffectivenessRatings] = useState<Map<string, boolean | null>>(() => {
    const ratings = new Map<string, boolean | null>();
    concernTracking.forEach((tracking: any) => {
      if (tracking.concern_name) {
        ratings.set(tracking.concern_name, tracking.is_effective);
      }
    });
    return ratings;
  });

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
              const itemId = params.itemId;
              
              if (!itemId) {
                Alert.alert('Error', 'Item ID not found');
                return;
              }

              // Use toggle-tracking API to pause tracking
              await toggleTracking(itemId, 'pause');
              
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
            } catch (error: any) {
              console.error('Error stopping tracking:', error);
              Alert.alert(
                'Error',
                error.message || 'Failed to stop tracking. Please try again.',
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

              // Get current rating from state or API data
              const currentRating = effectivenessRatings.get(tracking.concern_name) ?? tracking.is_effective;
              const isEffectiveSelected = currentRating === true;
              const isNotEffectiveSelected = currentRating === false;
              const isRatingNull = currentRating === null || currentRating === undefined;

              const handleEffective = async () => {
                if (!itemId || !isCompleted || isEffectiveSelected) {
                  return;
                }

                try {
                  await rateEffectiveness(itemId, [
                    {
                      concern_name: tracking.concern_name,
                      is_effective: true
                    }
                  ]);
                  
                  // Update local state
                  setEffectivenessRatings(prev => {
                    const newMap = new Map(prev);
                    newMap.set(tracking.concern_name, true);
                    return newMap;
                  });
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
                if (!itemId || !isCompleted || isNotEffectiveSelected) {
                  return;
                }

                try {
                  await rateEffectiveness(itemId, [
                    {
                      concern_name: tracking.concern_name,
                      is_effective: false
                    }
                  ]);
                  
                  // Update local state
                  setEffectivenessRatings(prev => {
                    const newMap = new Map(prev);
                    newMap.set(tracking.concern_name, false);
                    return newMap;
                  });
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
                        !isCompleted && styles.disabledButton,
                        isEffectiveSelected && styles.selectedButton
                      ]}
                      onPress={isCompleted && !isEffectiveSelected ? handleEffective : undefined}
                      activeOpacity={isCompleted && !isEffectiveSelected ? 0.7 : 1}
                      disabled={!isCompleted || isEffectiveSelected}
                    >
                      <Text style={[
                        styles.effectiveButtonText,
                        !isCompleted && styles.disabledButtonText,
                        isEffectiveSelected && styles.selectedButtonText
                      ]}>
                        Effective
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton, 
                        styles.notEffectiveButton,
                        !isCompleted && styles.disabledButton,
                        isNotEffectiveSelected && styles.selectedButton
                      ]}
                      onPress={isCompleted && !isNotEffectiveSelected ? handleNotEffective : undefined}
                      activeOpacity={isCompleted && !isNotEffectiveSelected ? 0.7 : 1}
                      disabled={!isCompleted || isNotEffectiveSelected}
                    >
                      <Text style={[
                        styles.notEffectiveButtonText,
                        !isCompleted && styles.disabledButtonText,
                        isNotEffectiveSelected && styles.selectedButtonText
                      ]}>
                        Not Effective
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
  selectedButton: {
    backgroundColor: colors.primary + '15',
    borderWidth: 2,
  },
  selectedButtonText: {
    fontWeight: '700',
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

