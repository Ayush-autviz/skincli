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
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, ChevronLeft, ArrowUp, ArrowDown, X } from 'lucide-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fontSize, spacing, borderRadius, shadows, fontFamily } from '../styles';
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

  // Get score indicator color
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#22C55E'; // Green
    if (score >= 50) return '#EAB308'; // Yellow
    return '#EF4444'; // Red
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
              // console.error('Error stopping tracking:', error);
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
              <ChevronLeft size={30} color={"#00839B"} />
            </View>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Effectiveness Dashboard</Text>
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
        {params.productData?.product_name && (
          <View style={[styles.productCard, { marginTop: 105 }]}>
            <View style={styles.productCardContainer}>
              {/* Product Image Placeholder */}
              <View style={styles.productImageContainer}>
                {params.productData.image_url ? (
                  <Image
                    source={{ uri: params.productData.image_url }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Icon name="bottle-tonic-outline" size={40} color={colors.textSecondary} />
                  </View>
                )}
              </View>

              {/* Product Info */}
              <View style={styles.productInfoContainer}>
                {params.productData.brand && (
                  <Text style={styles.brandNameNew}>
                    {params.productData.brand.toUpperCase()}
                  </Text>
                )}
                <Text style={styles.productNameNew}>{params.productData.product_name}</Text>
              </View>
            </View>
          </View>
        )}
        <View style={[styles.content]}>
          {/* Product Info */}
          {/* Product Info */}


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
                    // console.error('Error rating effectiveness:', error);
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
                    // console.error('Error rating effectiveness:', error);
                    Alert.alert(
                      'Error',
                      'Failed to rate effectiveness. Please try again.',
                      [{ text: 'OK' }]
                    );
                  }
                };

                const handleContinueTracking = () => {
                  // TODO: Implement continue tracking
                  // console.log('Continue tracking:', tracking.concern_name);
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
                    {/* Header Row: Concern Name + Score Badge */}
                    <View style={styles.concernHeaderRow}>
                      <Text style={styles.concernName}>
                        {formatConcernName(tracking.concern_name)}
                      </Text>

                      {currentScore !== null && (
                        <View style={styles.scoreBadge}>
                          {/* Change indicator with arrow */}
                          {scoreDifference !== null && scoreDifference !== 0 ? (
                            <View style={styles.changeIndicator}>
                              {scoreDifference > 0 ? (
                                <ArrowUp size={12} color="#44403C" />
                              ) : (
                                <ArrowDown size={12} color="#44403C" />
                              )}
                              <Text style={styles.changeValue}>
                                {Math.abs(Math.round(scoreDifference))}
                              </Text>
                            </View>
                          ) : scoreDifference === 0 ? (
                            <Text style={styles.noChangeText}>No change</Text>
                          ) : null}

                          {/* Score with color indicator */}
                          <View style={styles.scoreIndicatorContainer}>
                            <View style={[styles.scoreIndicator, { backgroundColor: getScoreColor(currentScore) }]} />
                            <Text style={styles.concernValue}>{currentScore}</Text>
                          </View>
                        </View>
                      )}
                    </View>

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
            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <View style={styles.modalCloseIconContainer}>
                <X size={18} color={colors.textPrimary} />
              </View>
            </TouchableOpacity>

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
    height: 105,
    backgroundColor: colors.white,
    borderBottomWidth: 0.4,
    borderBottomColor: "#E5E5E5",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 55,
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
    // fontWeight: '500', 
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
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
    backgroundColor: '#00839B',
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
    paddingHorizontal: spacing.lg,
  },
  productCard: {
    marginBottom: spacing.lg,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, // Match ProductDetail section
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#E9EAEB",
    backgroundColor: "#fff",
    borderRadius: borderRadius.md,
  },
  productInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  brandNameNew: {
    fontSize: fontSize.sm,
    // fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  productNameNew: {
    fontSize: fontSize.lg,
    // fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  usageResponseContainer: {
    backgroundColor: '#E9EAEB',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  usageResponseText: {
    fontSize: fontSize.sm,
    color: '#364152',
    // fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    lineHeight: 20,
  },
  stopTrackingLink: {
    color: '#00839B',
    // fontWeight: '600',
    fontFamily: fontFamily.semiBold,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    // padding: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md, // Match ProductDetail section
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    // ...shadows.sm,
  },
  concernName: {
    fontSize: fontSize.lg,
    // fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  concernHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: 8,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7E5E4',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 8,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeValue: {
    fontSize: 14,
    // fontWeight: '500',
    fontFamily: fontFamily.medium,
    color: '#00839B',
  },
  noChangeText: {
    fontSize: 14,
    color: '#A8A29E',
  },
  scoreIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  scoreIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  concernValue: {
    fontSize: 14,
    // fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
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
    // fontWeight: '500',
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },
  toggleContainer: {
    marginTop: spacing.xs,
  },
  toggleLabel: {
    fontSize: fontSize.md,
    // fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  toggleGroup: {
    flexDirection: 'row',
    // backgroundColor: '#E7E5E4',
    // borderRadius: 12,
    // padding: 4,
    // borderWidth: 1,
    // borderColor: '#E5E7EB',
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 2,
    borderColor: '#00839B',
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
    borderColor: '#00839B',
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
    // fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
  },
  toggleTextSelected: {
    // fontWeight: '700',
    fontFamily: fontFamily.bold,
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
    borderColor: '#00839B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueTrackingText: {
    fontSize: fontSize.sm,
    // fontWeight: '600',
    fontFamily: fontFamily.semiBold,
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
    // fontWeight: '500',
    fontFamily: fontFamily.medium,
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
    // fontWeight: '700',
    fontFamily: fontFamily.bold,
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
    paddingTop: 55,
    padding: 25,
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
    fontSize: fontSize.lg,
    // fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalButton: {
    backgroundColor: '#00839B',
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  modalButtonText: {
    fontSize: fontSize.md,
    // fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.white,
    letterSpacing: 0.3,
  },
});

export default TrackingReviewScreen;

