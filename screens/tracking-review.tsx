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
  Modal,
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

  // Modal state
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

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
            <Text style={styles.headerTitle}>Effectiveness Dashboard</Text>
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
        <View style={[styles.content, { paddingTop: 150 }]}>
          {/* Product Info */}
          {params.productData?.product_name && (
            <View style={styles.productInfoSection}>
              {params.productData.brand && (
                <Text style={styles.productBrand}>
                  {params.productData.brand.toUpperCase()}
                </Text>
              )}
              <Text style={styles.productName}>{params.productData.product_name}</Text>
            </View>
          )}

          {/* Usage Response Text */}
          {getUsageResponseText() && (
            <TouchableOpacity
              style={styles.usageResponseContainer}
              onPress={usageResponse === 'no' ? handleStopTracking : undefined}
              activeOpacity={usageResponse === 'no' ? 0.7 : 1}
              disabled={usageResponse !== 'no'}
            >
              <Text style={styles.usageResponseText}>
                {getUsageResponseText()}
              </Text>
              {usageResponse === 'no' && (
                <Text style={styles.stopTrackingLink}>Tap to stop tracking</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Concern Tracking Cards - Only show completed concerns */}
          {concernTracking.filter((tracking: any) => tracking.is_completed === true).length > 0 ? (
            concernTracking
              .filter((tracking: any) => tracking.is_completed === true)
              .map((tracking: any, index: number) => {
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

                  // Show success modal
                  setShowSuccessModal(true);
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

                  // Show success modal
                  setShowSuccessModal(true);
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
              
              // Calculate score difference
              const scoreDifference = baselineScore !== null && currentScore !== null
                ? currentScore - baselineScore
                : null;
              
              // Determine score change text color
              const getScoreChangeTextColor = () => {
                if (scoreDifference === null) return colors.textSecondary;
                if (scoreDifference > 0) return '#10B981'; // Green for improvement
                if (scoreDifference < 0) return '#EF4444'; // Red for decline
                return colors.textSecondary; // Gray for no change
              };

              // Determine score change border color
              const getScoreChangeBorderColor = () => {
                if (scoreDifference === null) return colors.border;
                if (scoreDifference > 0) return '#10B981'; // Green for improvement
                if (scoreDifference < 0) return '#EF4444'; // Red for decline
                return colors.border; // Gray for no change
              };

              return (
                <View key={index} style={styles.trackingCard}>
                  {/* Concern Name */}
                  <Text style={styles.concernName}>
                    {formatConcernName(tracking.concern_name)}
                  </Text>

                  {/* Score Change Section - Dashboard Style */}
                  {scoreChangeText && (
                    <View style={styles.scoreChangeSection}>
                      <View style={styles.scoreBox}>
                        <Text style={styles.scoreLabel}>Baseline</Text>
                        <Text style={styles.scoreValue}>{baselineScore}</Text>
                      </View>
                      <View style={styles.scoreArrowContainer}>
                        <Text style={styles.scoreArrow}>→</Text>
                      </View>
                      <View style={styles.scoreBox}>
                        <Text style={styles.scoreLabel}>Current</Text>
                        <Text style={[styles.scoreValue, { color: getScoreChangeTextColor() }]}>
                          {currentScore}
                        </Text>
                      </View>
                      {scoreDifference !== null && (
                        <View style={[styles.scoreDifferenceBox, { borderColor: getScoreChangeBorderColor() }]}>
                          <Text style={[styles.scoreDifferenceText, { color: getScoreChangeTextColor() }]}>
                            {scoreDifference > 0 ? '+' : ''}{scoreDifference}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Review Status */}
                  <View style={styles.reviewStatusContainer}>
                    <Text style={styles.reviewStatus}>
                      {reviewStatusText}
                    </Text>
                  </View>

                  {/* Toggle/Radio Button Group */}
                  <View style={styles.toggleContainer}>
                    <Text style={styles.toggleLabel}>Was this product effective?</Text>
                    <View style={styles.toggleGroup}>
                      <TouchableOpacity
                        style={[
                          styles.toggleOption,
                          styles.toggleOptionLeft,
                          isEffectiveSelected && styles.toggleOptionSelected,
                          isEffectiveSelected && styles.toggleOptionEffective,
                          !isCompleted && styles.toggleOptionDisabled
                        ]}
                        onPress={isCompleted && !isEffectiveSelected ? handleEffective : undefined}
                        activeOpacity={isCompleted && !isEffectiveSelected ? 0.7 : 1}
                        disabled={!isCompleted || isEffectiveSelected}
                      >
                        <View style={styles.toggleContent}>
                          <View style={[
                            styles.toggleRadio,
                            isEffectiveSelected && styles.toggleRadioSelected,
                            isEffectiveSelected && styles.toggleRadioEffective
                          ]}>
                            {isEffectiveSelected && (
                              <View style={[styles.toggleRadioInner, styles.toggleRadioInnerEffective]} />
                            )}
                          </View>
                          <Text style={[
                            styles.toggleText,
                            isEffectiveSelected && styles.toggleTextSelected,
                            isEffectiveSelected && styles.toggleTextEffective,
                            !isCompleted && styles.toggleTextDisabled
                          ]}>
                            Effective
                          </Text>
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.toggleOption,
                          styles.toggleOptionRight,
                          isNotEffectiveSelected && styles.toggleOptionSelected,
                          isNotEffectiveSelected && styles.toggleOptionNotEffective,
                          !isCompleted && styles.toggleOptionDisabled
                        ]}
                        onPress={isCompleted && !isNotEffectiveSelected ? handleNotEffective : undefined}
                        activeOpacity={isCompleted && !isNotEffectiveSelected ? 0.7 : 1}
                        disabled={!isCompleted || isNotEffectiveSelected}
                      >
                        <View style={styles.toggleContent}>
                          <View style={[
                            styles.toggleRadio,
                            isNotEffectiveSelected && styles.toggleRadioSelected,
                            isNotEffectiveSelected && styles.toggleRadioNotEffective
                          ]}>
                            {isNotEffectiveSelected && (
                              <View style={[styles.toggleRadioInner, styles.toggleRadioInnerNotEffective]} />
                            )}
                          </View>
                          <Text style={[
                            styles.toggleText,
                            isNotEffectiveSelected && styles.toggleTextSelected,
                            isNotEffectiveSelected && styles.toggleTextNotEffective,
                            !isCompleted && styles.toggleTextDisabled
                          ]}>
                            Not Effective
                          </Text>
                        </View>
                      </TouchableOpacity>
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

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Your effectiveness rating has been recorded.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                // Navigate back to product detail screen with refresh flag
                (navigation as any).navigate('ProductDetail', {
                  itemId: params.itemId,
                  productData: params.productData,
                  routineData: params.routineData,
                  upc: params.productData?.upc,
                  refresh: true, // Flag to trigger API refresh
                }, { replace: true });
              }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 18,
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
    alignItems: 'center',
  },
  productBrand: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  productName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  usageResponseContainer: {
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginTop: 20,
  },
  usageResponseText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
    lineHeight: 20,
  },
  stopTrackingLink: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
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
  concernName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  scoreChangeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    minWidth: 80,
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scoreArrowContainer: {
    paddingHorizontal: spacing.xs,
  },
  scoreArrow: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scoreDifferenceBox: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.pill || 12,
    backgroundColor: colors.background,
    borderWidth: 2,
  },
  scoreDifferenceText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  reviewStatusContainer: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  reviewStatus: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  toggleContainer: {
    marginTop: spacing.xs,
  },
  toggleLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  toggleOptionLeft: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  toggleOptionRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  toggleOptionSelected: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  toggleOptionEffective: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  toggleOptionNotEffective: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  toggleOptionDisabled: {
    opacity: 0.5,
    backgroundColor: colors.background,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  toggleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRadioSelected: {
    borderWidth: 2,
  },
  toggleRadioEffective: {
    borderColor: '#10B981',
  },
  toggleRadioNotEffective: {
    borderColor: '#EF4444',
  },
  toggleRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  toggleRadioInnerEffective: {
    backgroundColor: '#10B981',
  },
  toggleRadioInnerNotEffective: {
    backgroundColor: '#EF4444',
  },
  toggleText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextSelected: {
    fontWeight: '700',
  },
  toggleTextEffective: {
    color: '#10B981',
  },
  toggleTextNotEffective: {
    color: '#EF4444',
  },
  toggleTextDisabled: {
    color: colors.textSecondary,
    opacity: 0.6,
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
    alignItems: 'center',
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  modalButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
});

export default TrackingReviewScreen;

