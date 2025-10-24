// product-detail.tsx
// Product detail screen for scanned products - Redesigned to match mockup

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Edit, Trash2, X } from 'lucide-react-native';
import { colors, fontSize, spacing, typography, borderRadius, shadows } from '../styles';
import { searchProductByUPC, deleteRoutineItem } from '../utils/newApiService';

interface ProductDetailParams {
  itemId: string;
  productData: any;
  routineData: any;
  upc?: string;
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
  const [routineData, setRoutineData] = useState<any>(params.routineData || {});
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isFetchingProduct, setIsFetchingProduct] = useState<boolean>(false);

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

  // Calculate usage duration
  const calculateUsageDuration = () => {
    console.log('🔍 Routine data:', routineData);
    if (!routineData.dateStarted) return 'Unknown duration';
    
    const startDate = new Date(routineData.dateStarted);
    const endDate = routineData.dateStopped ? new Date(routineData.dateStopped) : new Date();
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffMonths / 12);
    
    if (diffYears > 0) {
      const remainingMonths = diffMonths % 12;
      return remainingMonths > 0 
        ? `${diffYears} year${diffYears !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
        : `${diffYears} year${diffYears !== 1 ? 's' : ''}`;
    } else if (diffMonths > 0) {
      return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  };

  // Get usage time description
  const getUsageTimeDescription = () => {
    if (!routineData.usage) return 'Unknown time';
    
    const usage = routineData.usage.toLowerCase();
    if (usage === 'am') return 'the mornings';
    if (usage === 'pm') return 'the evenings';
    if (usage === 'both' || usage === 'am + pm') return 'the mornings and evenings';
    if (usage === 'as_needed') return 'as needed';
    
    return usage;
  };

  // Handle edit button press
  const handleEdit = () => {
    // Prepare the item data with the current product data
    const itemData = {
      name: productData.product_name || routineData.name || '',
      type: 'Product',
      usage: routineData.usage || 'AM',
      frequency: routineData.frequency || 'Daily',
      concerns: [], // Will be populated from product data
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
      }
    };

    (navigation as any).navigate('UpdateRoutine', {
      itemId: params.itemId,
      itemData: JSON.stringify(itemData)
    });
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
          {/* Product Title and Brand */}
          <View style={styles.productTitleContainer}>
            <Text style={styles.productName}>
              {productData.product_name || 'Unknown Product'}
            </Text>
            <Text style={styles.brandName}>
              {productData.brand?.toUpperCase() || 'UNKNOWN BRAND'}
            </Text>
          </View>

          {/* Usage Card */}
          <View style={styles.section}>
            {/* <Text style={styles.sectionTitle}>Usage Information</Text> */}
            <Text style={styles.usageText}>
              Using for <Text style={styles.usageBold}>{calculateUsageDuration()}</Text> in {getUsageTimeDescription()}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleEdit} style={styles.actionButton}>
                <Edit size={16} color={colors.textSecondary} />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleRemove} 
                style={styles.actionButton}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <>
                    <X size={16} color={colors.textSecondary} />
                    <Text style={styles.actionText}>Remove from routine</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Product Description */}


          {/* Good For Section */}
          {productData.good_for && productData.good_for.length > 0 && (
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

          {/* Key Ingredients Section */}
          {productData.ingredients && productData.ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Ingredients</Text>
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

          {/* Free Of Section */}
          {productData.ingredients && productData.ingredients.some((ingredient: any) => ingredient.free_of && ingredient.free_of.length > 0) && (
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
    marginBottom: spacing.sm,
  },
  brandName: {
    fontSize: fontSize.sm,
    fontWeight: '400',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  usageText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  usageBold: {
    fontWeight: '700',
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
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
});

export default ProductDetailScreen;