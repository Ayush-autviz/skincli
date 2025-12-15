// product-detail.tsx
// Product detail screen for scanned products - Redesigned to match mockup

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Edit, Trash2, X, TrendingUp, ArrowRight, CheckCircle, TrendingDown, Minus, AlertCircle, Check, ChevronRight, Calendar } from 'lucide-react-native';
import { colors, fontSize, spacing, typography, borderRadius, shadows } from '../styles';
import { searchProductByUPC, deleteRoutineItem, toggleTracking, getRoutineItems } from '../utils/newApiService';

interface ProductDetailParams {
  itemId: string;
  productData: any;
  routineData: any;
  upc?: string;
  refresh?: boolean;
}

interface ApiResponse {
  success: boolean;
  data: any;
}

const ProductDetailScreen = (): React.JSX.Element => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as ProductDetailParams || {};
  
  const [productData, setProductData] = useState<any>(params.productData || {});
  const [routineData, setRoutineData] = useState<any>({
    ...(params.routineData || {}),
    is_tracking_paused: params.routineData?.is_tracking_paused
  });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isFetchingProduct, setIsFetchingProduct] = useState<boolean>(false);
  const [isFetchingRoutine, setIsFetchingRoutine] = useState<boolean>(false);
  const [showUsageModal, setShowUsageModal] = useState<boolean>(false);
  const [usageResponse, setUsageResponse] = useState<string | null>(null);

  // Fetch fresh routine data from API
  const fetchRoutineData = useCallback(async () => {
    if (!params.itemId) return;

    try {
      setIsFetchingRoutine(true);
      console.log('🔍 Fetching fresh routine data for itemId:', params.itemId);
      
      const response = await getRoutineItems() as ApiResponse;
      
      if (response.success && response.data) {
        // Find the specific item by itemId
        const item = response.data.find((item: any) => item.id === params.itemId);
        
        if (item) {
          console.log('✅ Fresh routine data fetched:', item);
          
          // Transform the API item to match routineData format
          const transformedData = {
            name: item.name,
            type: item.type,
            usage: item.usage,
            frequency: item.frequency,
            concerns: item.concern || [],
            concern_tracking: item.concern_tracking || [],
            dateStarted: item.start_date ? new Date(item.start_date) : null,
            dateStopped: item.end_date ? new Date(item.end_date) : null,
            stopReason: item.end_reason || '',
            extra: item.extra || {},
            is_tracking_paused: item.is_tracking_paused
          };
          
          setRoutineData(transformedData);
        } else {
          console.log('⚠️ Item not found in routine data');
        }
      } else {
        console.log('⚠️ No routine data found');
      }
    } catch (error) {
      console.error('🔴 Error fetching fresh routine data:', error);
    } finally {
      setIsFetchingRoutine(false);
    }
  }, [params.itemId]);

  // Fetch fresh product data from API using UPC code
  useEffect(() => {
    const fetchProductData = async () => {
      if (params.upc) {
        try {
          setIsFetchingProduct(true);
          console.log('🔍 Fetching fresh product data for UPC:', params.upc);
          
          const response = await searchProductByUPC(params.upc) as ApiResponse;
          
          if (response.success && response.data) {
            console.log('✅ Fresh product data fetched:', response.data);
            setProductData(response.data);
          } else {
            console.log('⚠️ No fresh product data found, using stored data');
          }
        } catch (error) {
          console.error('🔴 Error fetching fresh product data:', error);
        } finally {
          setIsFetchingProduct(false);
        }
      }
    };

    fetchProductData();
  }, [params.upc]);

  // Refetch routine data when refresh param is true (on mount or param change)
  useEffect(() => {
    if (params.refresh === true) {
      console.log('🔄 ProductDetail: Refreshing routine data after rating...');
      fetchRoutineData();
    }
  }, [params.refresh, fetchRoutineData]);

  // Also refetch when screen comes into focus with refresh flag
  useFocusEffect(
    useCallback(() => {
      // Only refresh if explicitly requested via refresh param
      if (params.refresh === true) {
        console.log('🔄 ProductDetail: Screen focused, refreshing routine data...');
        fetchRoutineData();
      }
    }, [params.refresh, fetchRoutineData])
  );

  // Check if product is manually added (no UPC means manually added)
  const isManuallyAdded = !params.upc;

  // Get usage date info (without AM/PM)
  const getUsageDateInfo = () => {
    console.log('🔍 Routine data:', routineData);
    if (!routineData.dateStarted) return '';
    
    const startDate = new Date(routineData.dateStarted);
    const formattedDate = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    if (routineData.dateStopped) {
      const stopDate = new Date(routineData.dateStopped);
      const formattedStopDate = stopDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return `You started using this product on ${formattedDate} and stopped on ${formattedStopDate}`;
    }
    
    return `You started using this product on ${formattedDate}`;
  };

  // Get usage pills (AM/PM)
  const getUsagePills = () => {
    const usage = routineData.usage || '';
    const pills: string[] = [];
    
    if (usage === 'am') {
      pills.push('AM');
    } else if (usage === 'pm') {
      pills.push('PM');
    } else if (usage === 'both') {
      pills.push('AM', 'PM');
    } else if (usage === 'as_needed') {
      pills.push('As needed');
    } else if (usage) {
      pills.push(usage);
    }
    
    return pills;
  };

  // Get frequency pills
  const getFrequencyPills = () => {
    const frequency = routineData.frequency || '';
    const pills: string[] = [];
    
    if (frequency === 'daily') {
      pills.push('Daily');
    } else if (frequency === 'weekly') {
      pills.push('Weekly');
    } else if (frequency === 'monthly') {
      pills.push('Monthly');
    } else if (frequency) {
      pills.push(frequency);
    }
    
    return pills;
  };

  // Get completed concerns for modal
  const getCompletedConcerns = () => {
    if (!routineData.concern_tracking || routineData.concern_tracking.length === 0) {
      return [];
    }
    return routineData.concern_tracking
      .filter((tracking: any) => tracking.is_completed === true)
      .map((tracking: any) => tracking.concern_name);
  };

  // Handle edit button press
  const handleEdit = () => {
    // Prepare the item data with the current product data
    const itemData = {
      name: productData.product_name || routineData.name || '',
      type: routineData.type || 'Product',
      usage: routineData.usage || 'AM',
      frequency: routineData.frequency || 'Daily',
      concerns: routineData.concerns || [], // Use concerns from routineData
      dateStarted: routineData.dateStarted || null,
      dateStopped: routineData.dateStopped || null,
      stopReason: routineData.stopReason || '',
      dateCreated: new Date().toISOString(),
      upc: params.upc || null,
      productData: {
        product_name: productData.product_name,
        brand: productData.brand,
        upc: params.upc,
        ingredients: productData.ingredients || [],
        good_for: productData.good_for || []
      },
      extra: routineData.extra || {} // Include extra data
    };

    (navigation as any).navigate('UpdateRoutine', {
      itemId: params.itemId,
      itemData: JSON.stringify(itemData)
    });
  };

  // Handle start tracking button press
  const handleStartTracking = async () => {
    if (!params.itemId) {
      Alert.alert('Error', 'Item ID not found');
      return;
    }

    try {
      await toggleTracking(params.itemId, 'resume');
      
      Alert.alert(
        'Tracking Started',
        'Product tracking has been started.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Refresh the screen or navigate back
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error starting tracking:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to start tracking. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Format usage and frequency for display in modal
  const getUsageInfo = () => {
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

  // Handle usage response and navigate to tracking review
  const handleUsageResponse = (response: 'yes' | 'no') => {
    setUsageResponse(response);
    setShowUsageModal(false);
    // Navigate to tracking review screen after response
    (navigation as any).navigate('TrackingReview', {
      itemId: params.itemId,
      routineData: routineData,
      productData: productData,
      concernTracking: routineData.concern_tracking || [],
      usageResponse: response
    });
  };

  // Handle review tracking button press
  const handleReviewTracking = () => {
    // Show the usage modal first
    setShowUsageModal(true);
  };

  // Check if concern tracking can open modal
  const canOpenModal = (tracking: any) => {
    // If not completed, can't open modal
    if (!tracking.is_completed) {
      return false;
    }
    // If effective status is set (true or false), can't open modal
    if (tracking.is_effective !== null) {
      return false;
    }
    // If completed and is_effective is null, can open modal (ready to review)
    return true;
  };

  // Get status text for concern tracking
  const getTrackingStatusText = (tracking: any) => {
    if (!tracking.is_completed) {
      return null; // Show progress
    }
    if (tracking.is_effective === null) {
      return 'Ready to Review';
    }
    if (tracking.is_effective === true) {
      return 'Proven';
    }
    if (tracking.is_effective === false) {
      return 'Unproven';
    }
    return null;
  };

  // Handle concern tracking item click - opens the usage modal only if allowed
  const handleConcernClick = (tracking: any) => {
    if (canOpenModal(tracking)) {
      setShowUsageModal(true);
    }
  };

  // Handle remove button press
  const handleRemove = () => {
    Alert.alert(
      'Remove Product',
      'Are you sure you want to remove this product from your routine?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteRoutineItem(params.itemId);
              Alert.alert(
                'Product Removed',
                'The product has been removed from your routine.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } catch (error) {
              console.error('🔴 Error removing product:', error);
              Alert.alert(
                'Error',
                'Failed to remove the product. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Handle back button press
  const handleBack = () => {
    navigation.goBack();
  };

  // Format ingredient name for display
  const formatIngredientName = (ingredient: string) => {
    const specialCases: { [key: string]: string } = {
      'aqua/water': 'Water (Aqua)',
      'glycerin': 'Glycerin',
      'coco-caprylate/caprate': 'Caprylic/Capric Triglyceride',
      'dimethicone': 'Dimethicone',
      'ceramide np': 'Ceramide NP',
      'ceramide ap': 'Ceramide AP',
      'sodium hyaluronate': 'Sodium Hyaluronate',
      'petrolatum': 'Petrolatum',
    };
    
    const lowerIngredient = ingredient.toLowerCase();
    if (specialCases[lowerIngredient]) {
      return specialCases[lowerIngredient];
    }
    
    return ingredient
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Format good_for items for display
  const formatGoodForItem = (item: string) => {
    const specialCases: { [key: string]: string } = {
      'dry_skin': 'Dry Skin',
      'oily_skin': 'Oily Skin',
      'combination_skin': 'Combination Skin',
      'normal_skin': 'Normal Skin',
      'sensitive_skin': 'Sensitive Skin',
      'hydration': 'Hydration',
      'fine_lines': 'Fine Lines',
      'anti_aging': 'Anti-Aging',
    };
    
    const lowerItem = item.toLowerCase();
    if (specialCases[lowerItem]) {
      return specialCases[lowerItem];
    }
    
    return item
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get improvement status icon and color
  const getImprovementStatus = (status: string | null) => {
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

  // Format concern name for display
  const formatConcernName = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Format free_of items for display
  const formatFreeOfItem = (item: string) => {
    const specialCases: { [key: string]: string } = {
      'maybe vegan': 'Maybe Vegan',
      'silicone free': 'Silicone Free',
      'oil free': 'Oil Free',
      'non comedogenic': 'Non-Comedogenic',
      'fragrance free': 'Fragrance Free',
      'paraben free': 'Paraben Free',
      'sulfate free': 'Sulfate Free',
    };
    
    const lowerItem = item.toLowerCase();
    if (specialCases[lowerItem]) {
      return specialCases[lowerItem];
    }
    
    return item
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };


  console.log('🔍 Routine data:', routineData);

  return (
    <View style={styles.container}>
      {/* Usage Modal - Shows when Review Effective Tracking is clicked */}
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

            {/* Title with underline */}
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>Review Effectiveness</Text>
              <View style={styles.modalTitleUnderline} />
            </View>

            {/* Brand Name */}
            {!isManuallyAdded && productData.brand && (
              <Text style={styles.modalBrandName}>
                {productData.brand.toUpperCase()}
              </Text>
            )}

            {/* Product Name */}
            {productData.product_name && (
              <Text style={styles.modalProductName}>
                {productData.product_name}
              </Text>
            )}

            {/* Using Section */}
            <Text style={styles.modalSectionHeading}>Using</Text>
            <View style={styles.modalChipContainer}>
              {/* AM/PM Pills */}
              {getUsagePills().map((pill: string, index: number) => (
                <View key={`usage-${index}`} style={styles.modalChip}>
                  <Text style={styles.modalChipText}>{pill}</Text>
                </View>
              ))}
              {/* Frequency Pills */}
              {getFrequencyPills().map((pill: string, index: number) => (
                <View key={`frequency-${index}`} style={styles.modalChip}>
                  <Text style={styles.modalChipText}>{pill}</Text>
                </View>
              ))}
            </View>

            {/* Concerns Reviewed Section */}
            {getCompletedConcerns().length > 0 && (
              <>
                <Text style={styles.modalSectionHeading}>Concerns Reviewed</Text>
                <View style={styles.modalChipContainer}>
                  {getCompletedConcerns().map((concern: string, index: number) => (
                    <View key={index} style={styles.modalChip}>
                      <Text style={styles.modalChipText}>
                        {formatConcernName(concern)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
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
            <Text style={styles.headerTitle}>Product Detail</Text>
            <View style={styles.titleUnderline} />
          </View>
          
          <View style={styles.rightContainer} />
        </View>
        <View style={styles.shadowContainer} />
      </View>

      {isFetchingProduct ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading product details...</Text>
            <Text style={styles.loadingSubtext}>This may take a moment</Text>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 1. First Card: Brand Name, Product Name, and Usage Date */}
          <View style={styles.section}>
            {!isManuallyAdded && productData.brand && (
              <Text style={styles.brandName}>
                {productData.brand?.toUpperCase()}
              </Text>
            )}
            <Text style={styles.productName}>
              {productData.product_name || routineData.name || 'Unknown Product'}
            </Text>
            {getUsageDateInfo() !== '' && (
              <Text style={styles.usageText}>
                {getUsageDateInfo()}
              </Text>
            )}
          </View>

          {/* 2. Combined Card: Usage (AM/PM and Daily/Weekly), Your Concerns, and Edit */}
          <View style={styles.section}>
            {/* Usage Pills (AM/PM and Frequency) */}
            {(getUsagePills().length > 0 || getFrequencyPills().length > 0) && (
              <View style={styles.usageSection}>
                <Text style={styles.sectionTitle}>Usage</Text>
                <View style={styles.chipSelectorContainer}>
                  {/* AM/PM Pills */}
                  {getUsagePills().map((pill: string, index: number) => (
                    <View key={`usage-${index}`} style={styles.chipButton}>
                      <Text style={styles.chipButtonText}>
                        {pill}
                      </Text>
                    </View>
                  ))}
                  {/* Frequency Pills */}
                  {getFrequencyPills().map((pill: string, index: number) => (
                    <View key={`frequency-${index}`} style={styles.chipButton}>
                      <Text style={styles.chipButtonText}>
                        {pill}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Your Concerns */}
            {routineData.concerns && routineData.concerns.length > 0 && (
              <View style={styles.concernsSection}>
                <Text style={styles.sectionTitle}>Your Concerns</Text>
                <View style={styles.chipSelectorContainer}>
                  {routineData.concerns.map((concern: string, index: number) => (
                    <View key={index} style={styles.chipButton}>
                      <Text style={styles.chipButtonText}>
                        {formatConcernName(concern)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Edit Button */}
            <View style={styles.editSection}>
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={handleEdit} style={styles.actionButton}>
                  <Edit size={16} color={colors.primary} />
                  <Text style={styles.actionText}>Edit/Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 6. Effectiveness Tracking Status */}
          {/* <View style={styles.section}>
            <Text style={styles.sectionTitle}>Effectiveness Tracking Status</Text>
            {(!routineData.concern_tracking || routineData.concern_tracking.length === 0 || routineData.is_tracking_paused) ? (
              <TouchableOpacity
                style={styles.startTrackingButton}
                onPress={handleStartTracking}
                activeOpacity={0.8}
              >
                <View style={styles.startTrackingContent}>
                  <TrendingUp size={18} color={colors.white} style={styles.startTrackingIcon} />
                  <Text style={styles.startTrackingText}>Start Tracking</Text>
                  <ArrowRight size={16} color={colors.white} style={styles.startTrackingArrow} />
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={styles.trackingStatusText}>
                Tracking in progress
              </Text>
            )}
          </View> */}

          {/* 7. Effectiveness Tracking Status */}
          {(!routineData.concern_tracking || routineData.concern_tracking.length === 0 || routineData.is_tracking_paused) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Effectiveness Tracking Status</Text>
              <TouchableOpacity
                style={styles.startTrackingButton}
                onPress={handleStartTracking}
                activeOpacity={0.8}
              >
                <View style={styles.startTrackingContent}>
                  <TrendingUp size={18} color={colors.white} style={styles.startTrackingIcon} />
                  <Text style={styles.startTrackingText}>Start Tracking</Text>
                  <ArrowRight size={16} color={colors.white} style={styles.startTrackingArrow} />
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Effectiveness Tracking Status</Text>
              <View style={styles.concernTrackingContainer}>
                {routineData.concern_tracking.map((tracking: any, index: number) => {
                  const weeksCompleted = tracking.weeks_completed || 0;
                  const totalWeeks = tracking.total_weeks || 0;
                  const progressPercentage = totalWeeks > 0 ? (weeksCompleted / totalWeeks) * 100 : 0;
                  const canOpen = canOpenModal(tracking);
                  const statusText = getTrackingStatusText(tracking);
                  
                  const ConcernItem = canOpen ? TouchableOpacity : View;
                  
                  return (
                    <ConcernItem
                      key={index}
                      style={styles.concernTrackingItem}
                      onPress={() => handleConcernClick(tracking)}
                      activeOpacity={0.7}
                      disabled={!canOpen}
                    >
                      <View style={styles.concernTrackingLeft}>
                        <View style={styles.concernTrackingIconContainer}>
                          <Calendar size={18} color={colors.primary} />
                        </View>
                        <View style={styles.concernTrackingContent}>
                          <Text style={styles.concernTrackingName}>
                            {formatConcernName(tracking.concern_name || 'Unknown Concern')}
                          </Text>
                          {!tracking.is_completed && (
                            <View style={styles.concernTrackingProgressBarContainer}>
                              <View style={styles.concernTrackingProgressBar}>
                                <View 
                                  style={[
                                    styles.concernTrackingProgressFill,
                                    { width: `${progressPercentage}%` }
                                  ]} 
                                />
                              </View>
                            </View>
                          )}
                          {statusText && (
                            <Text style={[
                              styles.trackingStatusBadge,
                              tracking.is_effective === true && styles.trackingStatusProven,
                              tracking.is_effective === false && styles.trackingStatusUnproven,
                              tracking.is_effective === null && styles.trackingStatusReady
                            ]}>
                              {statusText}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.concernTrackingRight}>
                        {!tracking.is_completed ? (
                          <View style={styles.concernTrackingWeeksContainer}>
                            <Text style={styles.concernTrackingWeeks}>
                              {weeksCompleted}/{totalWeeks}
                            </Text>
                            <Text style={styles.concernTrackingWeeksLabel}>weeks</Text>
                          </View>
                        ) : (
                          <View style={styles.concernTrackingWeeksContainer}>
                            <Text style={styles.concernTrackingWeeks}>
                              {totalWeeks}/{totalWeeks}
                            </Text>
                            <Text style={styles.concernTrackingWeeksLabel}>weeks</Text>
                          </View>
                        )}
                        {canOpen && <ChevronRight size={20} color={colors.textSecondary} />}
                      </View>
                    </ConcernItem>
                  );
                })}
              </View>
            </View>
          )}

          {/* 8. Good For (only if not manually added) */}
          {!isManuallyAdded && productData.good_for && productData.good_for.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Good For</Text>
              <View style={styles.chipSelectorContainer}>
                {productData.good_for.map((item: string, index: number) => (
                  <View key={index} style={styles.chipButton}>
                    <Text style={styles.chipButtonText}>{formatGoodForItem(item)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 9. Key Ingredients (only if not manually added) */}
          {!isManuallyAdded && productData.ingredients && productData.ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <View style={styles.chipSelectorContainer}>
                {productData.ingredients.map((ingredient: any, index: number) => (
                  <View key={index} style={styles.chipButton}>
                    <Text style={styles.chipButtonText}>
                      {formatIngredientName(ingredient.ingredient_name)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 10. Free Of (only if not manually added) */}
          {!isManuallyAdded && productData.ingredients && productData.ingredients.some((ingredient: any) => ingredient.free_of && ingredient.free_of.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Free Of</Text>
              <View style={styles.chipSelectorContainer}>
                {(() => {
                  const freeOfItems = Array.from(new Set(
                    productData.ingredients
                      .flatMap((ingredient: any) => ingredient.free_of || [])
                      .filter(Boolean)
                  ));
                  
                  return freeOfItems.map((freeOfItem: any, index: number) => (
                    <View key={index} style={styles.chipButton}>
                      <Text style={styles.chipButtonText}>
                        {formatFreeOfItem(freeOfItem)}
                      </Text>
                    </View>
                  ));
                })()}
              </View>
            </View>
          )}

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
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
  scrollContent: {
    flex: 1,
   // paddingHorizontal: spacing.lg,
    marginTop: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: 120, // Account for header height
  },
  loadingContent: {
    alignItems: 'center',
    maxWidth: 320,
    paddingHorizontal: spacing.md,
  },
  loadingText: {
    fontSize: 18,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    textAlign: 'center',
    fontWeight: '600',
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  productTitleContainer: {
    marginTop: spacing.lg,
    marginBottom: 0,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
  },
  productName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  brandName: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  usageSection: {
    marginBottom: spacing.sm,
  },
  usageText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  concernsSection: {
    marginTop: spacing.xs,
  },
  editSection: {
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border || '#E5E7EB',
    marginVertical: spacing.md,
    opacity: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: 14,
    color: '#666666',
  },
  actionText: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
  startTrackingButton: {
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#915F6D',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    // ...shadows.md,
    // borderWidth: 1,
    // borderColor: 'rgba(255, 255, 255, 0.2)',
    // elevation: 4,
  },
  reviewTrackingButton: {
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#915F6D',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startTrackingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  startTrackingIcon: {
    marginRight: 2,
  },
  startTrackingText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
  startTrackingArrow: {
    marginLeft: 2,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  chipSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
    minHeight: 40,
  },
  chipButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 40,
  },
  trackingSubtitle: {
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
    // letterSpacing: 0.5,
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
    paddingTop:55,
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
  modalTitleContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalTitleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  modalProductInfo: {
    // marginBottom: spacing.sm,
  },
  modalProductName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalBrandName: {
    fontSize: fontSize.md,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  modalSectionHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  modalChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
    minHeight: 40,
  },
  modalChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modalUsageInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    // lineHeight: 22,
    textAlign: 'center',
  },
  modalConcernTrackingSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalConcernTrackingTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalConcernTrackingList: {
    gap: spacing.xs,
  },
  modalConcernTrackingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    backgroundColor: `${colors.primary}08`,
    borderRadius: borderRadius.sm || 8,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  modalConcernTrackingName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  modalConcernTrackingWeeks: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  modalQuestion: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  modalOptionsContainer: {
    gap: spacing.sm,
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
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
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
    marginBottom: 2,
  },
  modalOptionTextSelected: {
    color: colors.primary,
  },
  modalOptionSubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  concernTrackingContainer: {
    gap: spacing.md,
  },
  concernTrackingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
   // paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  concernTrackingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  concernTrackingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  concernTrackingContent: {
    flex: 1,
    gap: spacing.xs,
  },
  concernTrackingName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  concernTrackingProgressBarContainer: {
    marginTop: spacing.xs,
  },
  concernTrackingProgressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: borderRadius.pill || 3,
    overflow: 'hidden',
  },
  concernTrackingProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill || 3,
  },
  concernTrackingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.md,
  },
  concernTrackingWeeksContainer: {
    alignItems: 'flex-end',
  },
  concernTrackingWeeks: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 24,
  },
  concernTrackingWeeksLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: -2,
  },
  trackingStatusText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  trackingStatusBadge: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill || 12,
    alignSelf: 'flex-start',
  },
  trackingStatusProven: {
    backgroundColor: '#10B98115',
    color: '#10B981',
  },
  trackingStatusUnproven: {
    backgroundColor: '#EF444415',
    color: '#EF4444',
  },
  trackingStatusReady: {
    backgroundColor: `${colors.primary}15`,
    color: colors.primary,
  },
});

export default ProductDetailScreen;