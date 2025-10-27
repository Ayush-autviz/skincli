// ProductSearchModal.tsx
// Bottom sheet modal for product search with suggestions

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Keyboard,
} from 'react-native';
import {
  Search,
  X,
  MapPin,
  Building,
  Flag,
  Car,
  AlertCircle,
  Sparkles
} from 'lucide-react-native';
import { colors, fontSize, spacing, typography, borderRadius, shadows } from '../styles';
import { searchProducts } from '../utils/newApiService';

interface ProductSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onProductSelect: (product: any) => Promise<void>;
  onError?: (message: string) => void;
}

const { height: screenHeight } = Dimensions.get('window');

const ProductSearchModal: React.FC<ProductSearchModalProps> = ({
  visible,
  onClose,
  onProductSelect,
  onError,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const searchTimeoutRef = useRef<number | null>(null);

  // Handle search with debouncing
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(async () => {
      await performSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (query.length < 3) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const result = await searchProducts(query);
      console.log('🔍 Search result:', result);
      
      if ((result as any).success && (result as any).data && (result as any).data.products && Array.isArray((result as any).data.products)) {
        // Limit to 20 results as requested
        const limitedResults = (result as any).data.products.slice(0, 20);
        console.log('🔍 Limited results:', limitedResults.length);
        setSearchResults(limitedResults);
      } else {
        console.log('🔍 No products found or invalid response structure');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('🔴 Error searching products:', error);
      setSearchResults([]);
      if (onError) {
        onError('Failed to search products. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleProductSelect = async (product: any) => {
    try {
      // Show loading state while processing
      setIsSearching(true);

      // Call the parent's onProductSelect function (which will handle UPC fetching)
      await onProductSelect(product);

      // Add a small delay to show loading feedback before closing
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (error) {
      console.error('🔴 Error selecting product:', error);
      // Still close modal even if there's an error
      onClose();
    } finally {
      setIsSearching(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setIsSearching(false); // Reset loading state when closing
    onClose();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };


  const getProductIcon = (product: any) => {
    // Dynamic icon based on product name or category
    const productName = product.product_name?.toLowerCase() || '';

    if (productName.includes('cream') || productName.includes('lotion') || productName.includes('moisturizer')) {
      return <Building size={22} color={colors.primary} />;
    } else if (productName.includes('serum') || productName.includes('treatment')) {
      return <Sparkles size={22} color={colors.primary} />;
    } else if (productName.includes('cleanser') || productName.includes('wash')) {
      return <Building size={22} color={colors.primary} />;
    } else {
      return <Building size={22} color={colors.primary} />;
    }
  };

  const renderProductItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => handleProductSelect(item)}
      activeOpacity={0.7}
    >
      {/* <View style={styles.productIcon}>
        {getProductIcon(item)}
      </View> */}
      <View style={styles.productContent}>
        <Text style={styles.productName} >
          {item.product_name}
        </Text>
        <Text style={styles.productBrand} numberOfLines={1}>
          {item.brand?.toUpperCase() || 'Unknown Brand'}
        </Text>
      </View>
      {/* <View style={styles.productArrow}>
        <X size={18} color={colors.primary} style={{ transform: [{ rotate: '45deg' }] }} />
      </View> */}
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (!hasSearched) {
      return (
        <View style={styles.emptyState}>

          {/* <Text style={styles.emptyTitle}>Search Products</Text> */}
          <Text style={styles.emptySubtitle}>
          Start typing a product name until you find your product. Then click on the product name to add it to your Routine.
          </Text>
        </View>
      );
    }

    if (isSearching) {
      return (
        <View style={styles.emptyState}>
          {/* <View style={styles.emptyStateIcon}>
            <Sparkles size={32} color={colors.primary} />
          </View> */}
          <Text style={styles.emptyTitle}>
            {searchQuery.length >= 3 ? 'Loading product details...' : 'Searching...'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery.length >= 3 ?
              'Fetching complete product information' :
              'Looking for products in our database'
            }
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        {/* <View style={styles.emptyStateIcon}>
          <AlertCircle size={32} color={colors.textSecondary} />
        </View> */}
        <Text style={styles.emptyTitle}>No Products Found</Text>
        <Text style={styles.emptySubtitle}>
          This product is not in our database.{'\n'}You can add it manually in the text box above.
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Custom backdrop overlay for better visual appeal */}
      <View style={styles.backdrop}>
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.dragHandle} />
              <View style={styles.headerContent}>
                <View style={styles.searchContainer}>
                  <View style={styles.searchIconContainer}>
                    {isSearching ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Search size={18} color={colors.primary} />
                    )}
                  </View>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search for skincare products..."
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    returnKeyType="search"
                    onSubmitEditing={() => performSearch(searchQuery)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    spellCheck={false}
                  />
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                   <X size={18} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {searchResults.length > 0 ? (
                <>
                  {/* Results Counter */}
                  {/* <View style={styles.resultsHeader}>
                    <Text style={styles.resultsCount}>
                      {searchResults.length} product{searchResults.length !== 1 ? 's' : ''} found
                    </Text>
                  </View> */}
                  <FlatList
                    data={searchResults}
                    renderItem={renderProductItem}
                    keyExtractor={(item, index) => `${item.product_name}-${index}`}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                </>
              ) : (
                renderEmptyState()
              )}
            </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: colors.white,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 115, 85, 0.1)',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(139, 115, 85, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 115, 85, 0.08)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(139, 115, 85, 0.15)',
  },
  searchIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    //backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  clearButtonBackground: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 115, 85, 0.8)',
    borderRadius: 22,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: colors.white,
  },
  resultsHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 115, 85, 0.1)',
    backgroundColor: colors.white,
  },
  resultsCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.1)',
    ...shadows.sm,
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.15)',
  },
  productContent: {
    flex: 1,
  },
  productName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  productBrand: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  productArrow: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
  },
  separator: {
    height: 0,
    marginVertical: spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    //justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: 20,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(139, 115, 85, 0.15)',
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
    fontWeight: '400',
  },
  emptyStateGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(139, 115, 85, 0.02)',
  },
});

export default ProductSearchModal;
