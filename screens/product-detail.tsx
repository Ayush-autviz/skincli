// product-detail.tsx
// Product detail screen for scanned products

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
import {
  ArrowLeft,
  Edit,
  X,
  FlaskConical,
  CheckCircle,
} from 'lucide-react-native';
import { colors, fontSize, spacing, typography, borderRadius, shadows } from '../styles';
import { searchProductByUPC, deleteRoutineItem } from '../utils/newApiService';

interface ProductDetailParams {
  itemId: string;
  productData: any;
  routineData: any;
  upc?: string; // UPC code for fetching fresh product data
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isFetchingProduct, setIsFetchingProduct] = useState<boolean>(false);

  // Fetch fresh product data from API using UPC code
  useEffect(() => {
    const fetchProductData = async () => {
      // If we have a UPC code, fetch fresh product data
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
          // Continue with stored product data if API call fails
        } finally {
          setIsFetchingProduct(false);
        }
      }
    };

    fetchProductData();
  }, [params.upc]);

  // Calculate usage duration
  const calculateUsageDuration = () => {
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
    if (usage === 'am') return 'in the mornings';
    if (usage === 'pm') return 'in the evenings';
    if (usage === 'both' || usage === 'am + pm') return 'in the mornings and evenings';
    if (usage === 'as_needed') return 'as needed';
    
    return usage;
  };

  // Handle edit button press
  const handleEdit = () => {
    // Navigate to update routine screen
    (navigation as any).navigate('UpdateRoutine', {
      itemId: params.itemId,
      itemData: JSON.stringify(routineData)
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
    return ingredient
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Format good_for items for display
  const formatGoodForItem = (item: string) => {
    return item
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Loading indicator for product data */}
        {isFetchingProduct && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading product details...</Text>
          </View>
        )}

        {/* Product Title */}
        <View style={styles.titleSection}>
          <Text style={styles.productTitle}>{productData.product_name || 'Unknown Product'}</Text>
          <Text style={styles.brandName}>{productData.brand?.toUpperCase() || 'UNKNOWN BRAND'}</Text>
        </View>

        {/* Usage Information */}
        <View style={styles.usageSection}>
          <Text style={styles.usageText}>
            Using for <Text style={styles.usageDuration}>{calculateUsageDuration()}</Text> {getUsageTimeDescription()}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
              <Edit size={16} color={colors.textPrimary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRemove} style={styles.removeButton} disabled={isDeleting}>
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <>
                  <X size={16} color={colors.textPrimary} />
                  <Text style={styles.removeButtonText}>Remove from routine</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Product Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>
            A rich, non-greasy, fast-absorbing moisturizer with three essential ceramides and hyaluronic acid to help restore the protective skin barrier and provide 24-hour hydration.
          </Text>
        </View>

        {/* Good For Section */}
        {productData.good_for && productData.good_for.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Good For</Text>
            <View style={styles.tagsContainer}>
              {productData.good_for.map((item: string, index: number) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{formatGoodForItem(item)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Key Ingredients Section */}
        {productData.ingredients && productData.ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Ingredients</Text>
            <View style={styles.tagsContainer}>
              {productData.ingredients.slice(0, 8).map((ingredient: any, index: number) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>
                    {formatIngredientName(ingredient.ingredient_name)}
                  </Text>
                </View>
              ))}
              {productData.ingredients.length > 8 && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>
                    +{productData.ingredients.length - 8} more
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  backButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  titleSection: {
    marginBottom: spacing.lg,
  },
  productTitle: {
    fontSize: typography.h2.fontSize,
    lineHeight: typography.h2.lineHeight,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  brandName: {
    fontSize: fontSize.sm,
    lineHeight: typography.body.lineHeight,
    color: colors.textSecondary,
  },
  usageSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  usageText: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  usageDuration: {
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editButtonText: {
    fontSize: fontSize.sm,
    lineHeight: typography.body.lineHeight,
    color: colors.textPrimary,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  removeButtonText: {
    fontSize: fontSize.sm,
    lineHeight: typography.body.lineHeight,
    color: colors.textPrimary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    lineHeight: typography.h2.lineHeight,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontSize: typography.body.fontSize,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  tagText: {
    fontSize: fontSize.sm,
    lineHeight: typography.body.lineHeight,
    color: colors.textSecondary,
  },
  bottomPadding: {
    height: spacing.xl,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.sm,
    lineHeight: typography.body.lineHeight,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});

export default ProductDetailScreen;
