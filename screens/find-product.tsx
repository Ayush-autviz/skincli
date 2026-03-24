// find-product.tsx
// Screen for searching and selecting products to add to routine

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    Image,
    Alert,
    Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
    Search,
    ChevronLeft,
} from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { colors, fontSize, spacing, typography, borderRadius, shadows } from '../styles';
import { searchProducts } from '../utils/newApiService';
// import ProductImageScannerModal from '../components/ProductImageScannerModal'; // Removed
// import { useCameraPermission } from 'react-native-vision-camera'; // Removed

// Custom barcode/scanner icon SVG
const barcodeScannerSvg = `
<svg width="48" height="48" viewBox="0 0 44 37" fill="none" xmlns="http://www.w3.org/2000/svg">
<g style="mix-blend-mode:multiply">
<path d="M24.2582 5.66669C24.6791 5.66668 25.0922 5.78054 25.4537 5.9962C25.8152 6.21185 26.1116 6.52128 26.3116 6.89169L26.8786 7.94169C27.0785 8.3121 27.3749 8.62152 27.7364 8.83718C28.0979 9.05284 28.511 9.16669 28.9319 9.16669H31.2617C31.8806 9.16669 32.474 9.41252 32.9116 9.8501C33.3492 10.2877 33.5951 10.8812 33.5951 11.5V22C33.5951 22.6189 33.3492 23.2124 32.9116 23.6499C32.474 24.0875 31.8806 24.3334 31.2617 24.3334H12.5951C11.9762 24.3334 11.3827 24.0875 10.9451 23.6499C10.5076 23.2124 10.2617 22.6189 10.2617 22V11.5C10.2617 10.8812 10.5076 10.2877 10.9451 9.8501C11.3827 9.41252 11.9762 9.16669 12.5951 9.16669H14.9249C15.3454 9.16671 15.7581 9.0531 16.1193 8.83788C16.4805 8.62266 16.7769 8.31382 16.9771 7.94402L17.5476 6.88935C17.7477 6.51955 18.0441 6.21072 18.4053 5.99549C18.7665 5.78027 19.1792 5.66666 19.5997 5.66669H24.2582Z" stroke="#9AA4B2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M21.9284 19.6667C23.8614 19.6667 25.4284 18.0997 25.4284 16.1667C25.4284 14.2337 23.8614 12.6667 21.9284 12.6667C19.9954 12.6667 18.4284 14.2337 18.4284 16.1667C18.4284 18.0997 19.9954 19.6667 21.9284 19.6667Z" stroke="#9AA4B2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<mask id="mask0_18704_15442" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="4" y="3" width="36" height="27">
<rect x="4.75" y="3.90234" width="33.8984" height="24.9941" rx="3.25" stroke="black" stroke-width="1.5"/>
</mask>
<g mask="url(#mask0_18704_15442)">
<rect x="2.59473" y="0.773438" width="9.2334" height="31.5117" fill="#9AA4B2"/>
<rect x="32.4805" y="-5.24805" width="8.65234" height="42.1504" fill="#9AA4B2"/>
</g>
</g>
</svg>
`;

interface SearchResult {
    product_name: string;
    brand?: string;
    upc?: string;
    [key: string]: any;
}

const ProductSkeletonItem = () => (
    <View style={styles.productItem}>
        <SkeletonPlaceholder borderRadius={4}>
            <SkeletonPlaceholder.Item>
                <SkeletonPlaceholder.Item width={80} height={12} marginBottom={8} />
                <SkeletonPlaceholder.Item width={160} height={16} />
            </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
    </View>
);

const FindProductScreen = (): React.JSX.Element => {
    const navigation = useNavigation();

    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [hasSearched, setHasSearched] = useState<boolean>(false);
    const [searchTimeoutRef] = [useRef<ReturnType<typeof setTimeout> | null>(null)];
    const inputRef = useRef<TextInput>(null);

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
        if (query.trim().length < 3) return;

        setIsSearching(true);
        setHasSearched(true);

        try {
            const result = await searchProducts(query);
            console.log('🔍 Search result:', result);

            if ((result as any).success && (result as any).data?.products && Array.isArray((result as any).data.products)) {
                const limitedResults = (result as any).data.products.slice(0, 20);
                setSearchResults(limitedResults);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('🔴 Error searching products:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleProductSelect = (product: SearchResult) => {
        // Navigate immediately; Product Detail will fetch full data and show its own skeleton
        (navigation as any).navigate('ProductDetail', {
            productData: product,
            upc: product.upc,
            mode: 'add',
        });
    };

    const handleProductScanned = async (productData: any) => {
        // setShowScannerModal(false);

        // Navigate to ProductDetail in "add" mode
        (navigation as any).navigate('ProductDetail', {
            productData: productData,
            upc: productData.upc,
            mode: 'add',
        });
    };

    const handleBack = () => {
        navigation.goBack();
    };

    /* // Removed handleCameraPress
    const handleCameraPress = async () => {
        ...
    };
    */

    const renderProductItem = ({ item }: { item: SearchResult }) => (
        <TouchableOpacity
            style={styles.productItem}
            onPress={() => handleProductSelect(item)}
            activeOpacity={0.7}
        >
            <View style={styles.productContent}>
                <Text style={styles.productBrand}>
                    {item.brand?.toUpperCase() || 'UNKNOWN BRAND'}
                </Text>
                <Text style={styles.productName}>
                    {item.product_name}
                </Text>
            </View>
        </TouchableOpacity>
    );



    const renderEmptyState = () => {
        if (!hasSearched) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptySubtitle}>
                        Start typing a product name to search our database.
                    </Text>
                </View>
            );
        }

        if (isSearching) {
            return (
                <FlatList
                    data={[1, 2, 3, 4, 5, 6, 7, 8]}
                    renderItem={() => <ProductSkeletonItem />}
                    keyExtractor={(item) => item.toString()}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            );
        }

        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptySubtitle}>
                    Product not found in our database.
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header - same as Product Detail */}
            <View style={styles.headerContainer}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                    >
                        <View style={styles.iconContainer}>
                            <ChevronLeft size={30} color={"#44403C"} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.titleContainer}>
                        <Text style={styles.headerTitle}>Find Product</Text>
                    </View>

                    <View style={styles.rightContainer} />
                </View>
                <View style={styles.shadowContainer} />
            </View>

            {/* Search Input - below fixed header */}
            <View style={[styles.searchSection, { marginTop: 40 }]}>
                <View style={styles.searchContainer}>
                    <View style={styles.searchIconContainer}>
                        {isSearching ? (
                            <ActivityIndicator size="small" color={colors.textSecondary} />
                        ) : (
                            <Search size={20} color={'#A4A7AE'} />
                        )}
                    </View>
                    <TextInput
                        ref={inputRef}
                        style={styles.searchInput}
                        placeholder="Search products..."
                        placeholderTextColor={colors.textTertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                        returnKeyType="search"
                        autoCapitalize="words"
                        autoCorrect={false}
                    />
                </View>
                {/* Camera Button Removed */}
            </View>

            {/* Content */}
            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {searchResults.length > 0 ? (
                    <FlatList
                        data={searchResults}
                        renderItem={renderProductItem}
                        keyExtractor={(item, index) => `${item.product_name}-${index}`}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContainer}
                        keyboardShouldPersistTaps="handled"
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                    />
                ) : (
                    renderEmptyState()
                )}
            </KeyboardAvoidingView>

            {/* Product Scanner Modal Removed */}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
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
        justifyContent: 'flex-end',
        borderBottomColor: '#E5E5E5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // paddingTop: 55,
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
        fontWeight: '500',
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
    searchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        // borderBottomWidth: 1,
        // borderBottomColor: '#F5F5F4',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#D5D7DA',
    },
    searchIconContainer: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1C1917',
        paddingVertical: 0,
    },
    cameraButton: {
        width: 58,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#D5D7DA',
    },
    content: {
        flex: 1,
    },
    listContainer: {
        paddingHorizontal: 16,
        //paddingVertical: 8,
    },
    productItem: {
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#E9EAEB',
        backgroundColor: '#FFFFFF',
    },
    productContent: {
        flex: 1,
    },
    productBrand: {
        fontSize: 12,
        fontWeight: '600',
        color: '#78716C',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1917',
    },
    separator: {
        height: 0,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1917',
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#78716C',
        textAlign: 'center',
        lineHeight: 22,
    },
    cameraIcon: {
        width: 30,
        height: 30,
    },
    skeletonContainer: {
        paddingHorizontal: 0,
    },
});

export default FindProductScreen;
