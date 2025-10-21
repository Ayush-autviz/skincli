// create-routine.tsx
// Single scrollable screen for creating routine items

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  FlaskConical,
  Sun,
  Moon,
  Calendar,
  CalendarX,
  CheckCircle,
  CalendarDays,
  HelpCircle,
  ArrowLeft,
  Save,
  Camera,
  X
} from 'lucide-react-native';
import { colors, fontSize, spacing, typography, borderRadius, shadows } from '../styles';
import TabHeader from '../components/ui/TabHeader';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { createRoutineItem, searchProducts, searchProductByUPC } from '../utils/newApiService';

interface CreateRoutineParams {
  frequency?: string;
}

// Define concerns options
const concernsOptions = [
  'Breakouts',
  'Evenness',
  'Redness', 
  'Visible Pores',
  'Lines',
  'Eye Area Condition',
  'Pigmentation',
  'Dewiness',
  'Anti-Aging (Face)',
  'Anti-Aging (Eyes)'
];

// Define stop reasons
const stopReasons = [
  'Not effective',
  'Doesn\'t feel right',
  'Allergy',
  'Too expensive',
  'Other'
];

const CreateRoutineScreen = (): React.JSX.Element => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as CreateRoutineParams || {};
  
  // Form state
  const [itemName, setItemName] = useState<string>('');
  const [itemType, setItemType] = useState<string>('Product');
  const [itemUsage, setItemUsage] = useState<string[]>(['AM']);
  const [itemFrequency, setItemFrequency] = useState<string>('Daily');
  const [itemConcerns, setItemConcerns] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date()); // Default to today's date
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [treatmentDate, setTreatmentDate] = useState<Date>(new Date()); // For treatment types
  const [isStopped, setIsStopped] = useState<boolean>(false);
  const [stopReason, setStopReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Barcode scanning state
  const [upcCode, setUpcCode] = useState<string>('');
  const [scannedProductData, setScannedProductData] = useState<any>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState<boolean>(false);
  const [isProductCrossed, setIsProductCrossed] = useState<boolean>(false);
  const [showAllGoodFor, setShowAllGoodFor] = useState<boolean>(false);
  const [showAllIngredients, setShowAllIngredients] = useState<boolean>(false);
  const [showAllFreeOf, setShowAllFreeOf] = useState<boolean>(false);
  
  // Autocomplete states
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isFetchingProduct, setIsFetchingProduct] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState<boolean>(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState<boolean>(false);
  const [showTreatmentDatePicker, setShowTreatmentDatePicker] = useState<boolean>(false);

  // Handle frequency parameter from navigation
  useEffect(() => {
    if (params.frequency) {
      setItemFrequency(params.frequency);
    }
  }, [params.frequency]);

  // Set end date to today when user checks "Stopped Using It"
  useEffect(() => {
    if (isStopped && !endDate) {
      setEndDate(new Date());
    }
  }, [isStopped]);

  // Handle barcode scanning
  const handleBarcodeScan = () => {
    setShowBarcodeModal(true);
  };

  // Handle product scanned from modal
  const handleProductScanned = (productData: any) => {
    console.log('🔍 Product scanned:', productData);
    setScannedProductData(productData);
    setItemName(productData.product_name || '');
    setUpcCode(productData.upc || '');
    setIsProductCrossed(false); // Reset crossed state when new product is scanned
    setShowAllGoodFor(false); // Reset show all states
    setShowAllIngredients(false);
    setShowAllFreeOf(false);
    
    // Auto-populate concerns based on good_for data
    if (productData.good_for && Array.isArray(productData.good_for)) {
      const mappedConcerns = productData.good_for.map((concern: string) => {
        // Map API concerns to our concerns options
        const concernMapping: { [key: string]: string } = {
          'dry_skin': 'Dry Skin',
          'oily_skin': 'Oily Skin',
          'combination_skin': 'Combination Skin',
          'normal_skin': 'Normal Skin',
          'sensitive_skin': 'Sensitive Skin',
          'acne_prone': 'Acne Prone',
          'aging': 'Anti-Aging (Face)',
          'hydration': 'Hydration',
          'brightening': 'Brightening',
          'pore_minimizing': 'Visible Pores'
        };
        return concernMapping[concern] || concern;
      }).filter(Boolean);
      
      setItemConcerns(mappedConcerns);
    }
  };

  // Handle error from barcode modal
  const handleBarcodeError = (message: string) => {
    Alert.alert(
      'Product Not Found',
      message,
      [
        {
          text: 'Try Again',
          onPress: () => {
            setShowBarcodeModal(true);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  // Handle search for products
  const handleSearchProducts = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await searchProducts(query, 5);
      
      if ((response as any).success && (response as any).data.products) {
        setSearchResults((response as any).data.products);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('🔴 Error searching products:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle closing search results when tapping outside
  const handleCloseSearchResults = () => {
    setShowSearchResults(false);
  };

  // Handle crossing out the product
  const handleCrossProduct = () => {
    setIsProductCrossed(true);
    setItemName('');
    setUpcCode('');
    setScannedProductData(null);
    setShowAllGoodFor(false); // Reset show all states
    setShowAllIngredients(false);
    setShowAllFreeOf(false);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchQuery('');
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

  // Handle product selection from search results
  const handleProductSelect = async (product: any) => {
    try {
      setIsFetchingProduct(true);
      setShowSearchResults(false);
      setSearchQuery('');
      
      // Fetch full product details using UPC
      const response = await searchProductByUPC(product.upc);
      
      if ((response as any).success && (response as any).data) {
        setScannedProductData((response as any).data);
        setItemName((response as any).data.product_name || '');
        setUpcCode((response as any).data.upc || '');
        setIsProductCrossed(false); // Reset crossed state when new product is selected
        setShowAllGoodFor(false); // Reset show all states
        setShowAllIngredients(false);
        setShowAllFreeOf(false);
        
        // Auto-populate concerns based on good_for data
        if ((response as any).data.good_for && Array.isArray((response as any).data.good_for)) {
          const mappedConcerns = (response as any).data.good_for.map((concern: string) => {
            const concernMapping: { [key: string]: string } = {
              'dry_skin': 'Dry Skin',
              'oily_skin': 'Oily Skin',
              'combination_skin': 'Combination Skin',
              'normal_skin': 'Normal Skin',
              'sensitive_skin': 'Sensitive Skin',
              'acne_prone': 'Acne Prone',
              'aging': 'Anti-Aging (Face)',
              'hydration': 'Hydration',
              'brightening': 'Brightening',
              'pore_minimizing': 'Visible Pores'
            };
            return concernMapping[concern] || concern;
          }).filter(Boolean);
          
          setItemConcerns(mappedConcerns);
        }
      }
    } catch (error) {
      console.error('🔴 Error fetching product details:', error);
      Alert.alert('Error', 'Failed to load product details. Please try again.');
    } finally {
      setIsFetchingProduct(false);
    }
  };

  // Handle text input change for search
  const handleNameChange = (text: string) => {
    setItemName(text);
    setSearchQuery(text);
    
    // Only search if we're not showing product details (i.e., manual input mode)
    if (!(upcCode && scannedProductData && !isProductCrossed)) {
      if (text.trim().length > 0) {
        handleSearchProducts(text);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }
  };

  // Toggle logic for AM/PM usage - only allow one selection
  const handleUsageToggle = (tappedUsage: string): void => {
    setItemUsage(currentUsage => {
      const isSelected = currentUsage.includes(tappedUsage);
      if (isSelected) {
        return []; // Deselect if already selected
      } else {
        return [tappedUsage]; // Select only the tapped option
      }
    });
  };

  // Toggle logic for concerns selection
  const handleConcernToggle = (concern: string): void => {
    setItemConcerns(currentConcerns => {
      const isSelected = currentConcerns.includes(concern);
      if (isSelected) {
        return currentConcerns.filter(c => c !== concern);
      } else {
        return [...currentConcerns, concern];
      }
    });
  };

  // Date picker handlers
  const handleStartDateChange = (event: any, selectedDate?: Date): void => {
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date): void => {
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleTreatmentDateChange = (event: any, selectedDate?: Date): void => {
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setTreatmentDate(selectedDate);
    }
  };

  // Check if current type is a treatment type
  const isTreatmentType = (): boolean => {
    return Boolean(itemType && typeof itemType === 'string' && (
      itemType === 'Treatment / Facial' || 
      itemType === 'Treatment / Injection' || 
      itemType === 'Treatment / Other'
    ));
  };

  // Format parameters for backend
  const formatParameter = (value: string): string => {
    console.log('🟡 CreateRoutine: Formatting parameter:', value);
    if (!value) return value;
    // Handle frequency
    if (value === 'Daily' || value === 'Weekly' || value === 'As needed') {
      return value === 'As needed' ? 'as_needed' : value.toLowerCase();
    }
    // Handle usage
    if (value === 'AM' || value === 'PM' || value === 'AM + PM' || value === 'As needed') {
      return value === 'AM + PM' ? 'both' : value === 'As needed' ? 'as_needed' : value.toLowerCase();
    }
    // Handle type
    if (value === 'Product' || value === 'Activity' || value === 'Nutrition') {
      return value.toLowerCase();
    }
    if (value === 'Treatment / Facial') return 'treatment_facial';
    if (value === 'Treatment / Injection') return 'treatment_injection';
    if (value === 'Treatment / Other') return 'treatment_other';
    return value;
  };

  // Save routine item
  const handleSave = async (): Promise<void> => {
    // Validation with better UX
    if (!itemName.trim()) {
      Alert.alert('Missing Information', 'Please enter a name for your routine item.');
      return;
    }

    if (!itemType.trim()) {
      Alert.alert('Missing Information', 'Please select what type of item this is.');
      return;
    }

    if (itemConcerns.length === 0) {
      Alert.alert('Missing Information', 'Please select at least one concern to help track your progress.');
      return;
    }

    // For treatment types, validate treatment date
    if (isTreatmentType()) {
      if (!treatmentDate) {
        Alert.alert('Missing Information', 'Please select the treatment date.');
        return;
      }
      
      // Validate treatment date is not in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedTreatmentDate = new Date(treatmentDate);
      selectedTreatmentDate.setHours(0, 0, 0, 0);
      
      if (selectedTreatmentDate > today) {
        Alert.alert('Invalid Date', 'Cannot select future date for treatment date.');
        return;
      }
    } else {
      // For non-treatment types, validate usage and frequency
      if (itemUsage.length === 0) {
        Alert.alert('Missing Information', 'Please select a time of day.');
        return;
      }
      
      if (!itemFrequency) {
        Alert.alert('Missing Information', 'Please select a usage frequency.');
        return;
      }
      
      // For non-treatment types, validate start date
      if (!startDate) {
        Alert.alert('Missing Information', 'Please select when you started using this item.');
        return;
      }

      // Validate start date is not in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedStartDate = new Date(startDate);
      selectedStartDate.setHours(0, 0, 0, 0);
      
      if (selectedStartDate > today) {
        Alert.alert('Invalid Date', 'Cannot select future date for start date.');
        return;
      }

      // Validate end date is not in the future (if present)
      if (endDate) {
        const selectedEndDate = new Date(endDate);
        selectedEndDate.setHours(0, 0, 0, 0);
        
        if (selectedEndDate > today) {
          Alert.alert('Invalid Date', 'Cannot select future date for end date.');
          return;
        }
      }

      // Validate dates if both are present
      if (startDate && endDate && endDate < startDate) {
        Alert.alert('Invalid Date', 'The end date cannot be before the start date.');
        return;
      }
    }

    // Prepare data for API
    const apiItemData: any = {
      name: itemName.trim(),
      type: formatParameter(itemType),
      concern: itemConcerns,
      extra: {
        dateCreated: new Date().toISOString()
      }
    };

    // Add UPC code and product data if product was scanned
    if (upcCode && scannedProductData) {
      apiItemData.upc = upcCode;
      apiItemData.extra = {
        ...apiItemData.extra,
        brand: scannedProductData.brand,
        ingredients: scannedProductData.ingredients || [],
        good_for: scannedProductData.good_for || [],
        product_id: scannedProductData.product_id,
        total_ingredients: scannedProductData.total_ingredients
      };
    }

    // Add usage and frequency only for non-treatment types
    if (!isTreatmentType()) {
      let finalUsage = 'AM';
      const includesAM = itemUsage.includes('AM');
      const includesPM = itemUsage.includes('PM');
      const includesAMPM = itemUsage.includes('AM & PM');
      
      if (includesAMPM) finalUsage = 'both';
      else if (includesAM && includesPM) finalUsage = 'both';
      else if (includesPM) finalUsage = 'pm';
      else if (includesAM) finalUsage = 'am';
      else if (itemUsage.includes('As needed')) finalUsage = 'as_needed';
      
      apiItemData.usage = finalUsage;
      apiItemData.frequency = formatParameter(itemFrequency);
    }

    // Add date fields based on type
    if (isTreatmentType()) {
      apiItemData.treatment_date = treatmentDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      apiItemData.extra.treatmentDate = treatmentDate?.toISOString();
    } else {
      apiItemData.start_date = startDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      apiItemData.end_date = endDate ? endDate.toISOString().split('T')[0] : '';
      apiItemData.extra.dateStarted = startDate?.toISOString();
      apiItemData.extra.dateStopped = endDate?.toISOString();
      apiItemData.extra.stopReason = stopReason;
    }

    console.log('🟡 CreateRoutine: API Item Data:', apiItemData);

    setIsSaving(true);
    try {
      const response = await createRoutineItem(apiItemData);
      console.log('🟡 CreateRoutine: Create response:', response);
      
      if ((response as any).success) {
        Alert.alert('Success!', 'Your routine item has been added successfully.', [
          {
            text: 'Continue',
            onPress: () => (navigation as any).goBack()
          }
        ]);
      }
    } catch (err: any) {
      console.error('🔴 CreateRoutine: Error saving item:', err);
      Alert.alert('Error', err.message || 'Failed to save item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (navigation as any).goBack()}
          >
            <View style={styles.iconContainer}>
              <ArrowLeft size={22} color={colors.primary} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Add to your routine</Text>
            <View style={styles.titleUnderline} />
          </View>
          
          <View style={styles.rightContainer} />
        </View>
        <View style={styles.shadowContainer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.scrollContainer}>
          <TouchableWithoutFeedback onPress={handleCloseSearchResults}>
            <View style={styles.touchableArea}>
              <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle2}>Indicate if Product</Text>
          <View style={styles.chipSelectorContainer}>
            {[
              { name: 'Product', icon: FlaskConical, color: '#8B7355' },
              { name: 'Treatment / Facial', icon: FlaskConical, color: '#8B7355' },
              { name: 'Treatment / Injection', icon: FlaskConical, color: '#8B7355' },
              { name: 'Treatment / Other', icon: FlaskConical, color: '#8B7355' }
            ].map(({ name, icon: Icon, color }) => {
              const isActive = itemType === name;
              
              return (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.chipButton,
                    isActive && styles.chipButtonActive
                  ]}
                  onPress={() => setItemType(name)}
                >
                  <Icon 
                    size={20} 
                    color={isActive ? '#FFFFFF' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.chipButtonText,
                    isActive && styles.chipButtonTextActive
                  ]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Name Input */}
        <View style={[styles.section, { zIndex: 10000 }]}>
          {/* Only show title when not displaying product details */}
          {!(upcCode && scannedProductData && !isProductCrossed) && (
            <Text style={styles.sectionTitle2}>Name</Text>
          )}
          
          {/* Show product details if UPC exists and product is not crossed */}
          {upcCode && scannedProductData && !isProductCrossed ? (
            <View style={styles.productDetailsContent}>
              {/* Product Title and Brand */}
              <View style={styles.productTitleContainer}>
                <Text style={styles.productName}>
                  {scannedProductData.product_name || 'Unknown Product'}
                </Text>
                <Text style={styles.brandName}>
                  {scannedProductData.brand?.toUpperCase() || 'UNKNOWN BRAND'}
                </Text>
              </View>

              {/* Good For Section */}
              {scannedProductData.good_for && scannedProductData.good_for.length > 0 && (
                <View style={styles.productSection}>
                  <Text style={styles.productSectionTitle}>Good For</Text>
                  <View style={styles.chipSelectorContainer}>
                    {(showAllGoodFor ? scannedProductData.good_for : scannedProductData.good_for.slice(0, 5)).map((item: string, index: number) => (
                      <View key={index} style={styles.chipButton}>
                        <Text style={styles.chipButtonText}>{formatGoodForItem(item)}</Text>
                      </View>
                    ))}
                  </View>
                  {scannedProductData.good_for.length > 5 && (
                    <TouchableOpacity 
                      style={styles.showAllButton}
                      onPress={() => setShowAllGoodFor(!showAllGoodFor)}
                    >
                      <Text style={styles.showAllButtonText}>
                        {showAllGoodFor ? 'Show Less' : `Show All (${scannedProductData.good_for.length})`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Key Ingredients Section */}
              {scannedProductData.ingredients && scannedProductData.ingredients.length > 0 && (
                <View style={styles.productSection}>
                  <Text style={styles.productSectionTitle}>Key Ingredients</Text>
                  <View style={styles.chipSelectorContainer}>
                    {(showAllIngredients ? scannedProductData.ingredients : scannedProductData.ingredients.slice(0, 5)).map((ingredient: any, index: number) => (
                      <View key={index} style={styles.chipButton}>
                        <Text style={styles.chipButtonText}>
                          {formatIngredientName(ingredient.ingredient_name)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {scannedProductData.ingredients.length > 5 && (
                    <TouchableOpacity 
                      style={styles.showAllButton}
                      onPress={() => setShowAllIngredients(!showAllIngredients)}
                    >
                      <Text style={styles.showAllButtonText}>
                        {showAllIngredients ? 'Show Less' : `Show All (${scannedProductData.ingredients.length})`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Free Of Section */}
              {scannedProductData.ingredients && scannedProductData.ingredients.some((ingredient: any) => ingredient.free_of && ingredient.free_of.length > 0) && (
                <View style={styles.productSection}>
                  <Text style={styles.productSectionTitle}>Free Of</Text>
                  <View style={styles.chipSelectorContainer}>
                    {(() => {
                      const freeOfItems = Array.from(new Set(
                        scannedProductData.ingredients
                          .flatMap((ingredient: any) => ingredient.free_of || [])
                          .filter(Boolean)
                      ));
                      const displayItems = showAllFreeOf ? freeOfItems : freeOfItems.slice(0, 5);
                      
                      return displayItems.map((freeOfItem: any, index: number) => (
                        <View key={index} style={styles.chipButton}>
                          <Text style={styles.chipButtonText}>
                            {formatFreeOfItem(freeOfItem)}
                          </Text>
                        </View>
                      ));
                    })()}
                  </View>
                  {(() => {
                    const freeOfItems = Array.from(new Set(
                      scannedProductData.ingredients
                        .flatMap((ingredient: any) => ingredient.free_of || [])
                        .filter(Boolean)
                    ));
                    return freeOfItems.length > 5 && (
                      <TouchableOpacity 
                        style={styles.showAllButton}
                        onPress={() => setShowAllFreeOf(!showAllFreeOf)}
                      >
                        <Text style={styles.showAllButtonText}>
                          {showAllFreeOf ? 'Show Less' : `Show All (${freeOfItems.length})`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              )}

              {/* Cross button */}
              <TouchableOpacity 
                style={styles.crossButton}
                onPress={handleCrossProduct}
              >
                <X size={20} color={colors.error} />
                <Text style={styles.crossButtonText}>Not this product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Regular input when no UPC or product is crossed */
            <View style={styles.inputWrapper}>
              <FlaskConical 
                size={20} 
                color="#6B7280" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.textInput}
                placeholder={isTreatmentType() ? "Enter treatment name" : `Enter ${itemType?.toLowerCase() || 'item'} name`}
                value={itemName}
                onChangeText={handleNameChange}
                placeholderTextColor="#9CA3AF"
                returnKeyType="next"
              />
              {/* Camera icon for barcode scanning - only show for Product type and when not treatment */}
              {!isTreatmentType() && (
                <TouchableOpacity 
                  onPress={handleBarcodeScan}
                  style={styles.cameraButton}
                >
                  <Camera size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Scan instruction text - only show for Product type and when not treatment and not showing product details */}
          {!isTreatmentType() && !(upcCode && scannedProductData && !isProductCrossed) && (
            <Text style={styles.scanInstructionText}>or scan barcode</Text>
          )}
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && !isTreatmentType() && (
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.searchResultsContainer}>
                <ScrollView 
                  style={styles.searchResultsScrollView}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {searchResults.map((product, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResultItem}
                      onPress={() => handleProductSelect(product)}
                    >
                      <View style={styles.searchResultContent}>
                        <Text style={styles.searchResultName}>{product.product_name}</Text>
                        <Text style={styles.searchResultBrand}>{product.brand?.toUpperCase()}</Text>
                      </View>
                      {isSearching && (
                        <ActivityIndicator size="small" color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          )}
        </View>

        {/* Concerns Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Concerns</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          <View style={styles.chipSelectorContainer}>
            {concernsOptions.map((concern) => {
              const isActive = itemConcerns.includes(concern);
              
              return (
                <TouchableOpacity
                  key={concern}
                  style={[
                    styles.chipButton,
                    isActive && styles.chipButtonActive
                  ]}
                  onPress={() => handleConcernToggle(concern)}
                >
                  <Text style={[
                    styles.chipButtonText,
                    isActive && styles.chipButtonTextActive
                  ]}>
                    {concern}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Frequency Selection - Only show for non-treatment types */}
        {!isTreatmentType() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Usage Frequency</Text>
            <Text style={styles.sectionSubtitle}>Select One</Text>
            <View style={styles.chipSelectorContainer}>
              {[
                { name: 'Daily', icon: CheckCircle, color: '#10B981' },
                { name: 'Weekly', icon: CalendarDays, color: '#3B82F6' },
                { name: 'As needed', icon: HelpCircle, color: '#8B5CF6' }
              ].map(({ name, icon: Icon, color }) => {
                const isActive = itemFrequency === name;
                
                return (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.chipButton,
                      isActive && styles.chipButtonActive
                    ]}
                    onPress={() => setItemFrequency(name)}
                  >
                    <Icon 
                      size={20} 
                      color={isActive ? '#FFFFFF' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.chipButtonText,
                      isActive && styles.chipButtonTextActive
                    ]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Time of Day Selection - Only show for non-treatment types */}
        {!isTreatmentType() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time of Day</Text>
            <Text style={styles.sectionSubtitle}>Select One</Text>
            <View style={styles.chipSelectorContainer}>
              {[
                { name: 'AM', icon: Sun, color: '#F59E0B' },
                { name: 'PM', icon: Moon, color: '#6366F1' },
                { name: 'AM & PM', icon: HelpCircle, color: '#8B5CF6' },
                { name: 'As needed', icon: HelpCircle, color: '#8B5CF6' }
              ].map(({ name, icon: Icon, color }) => {
                const isActive = itemUsage.includes(name);
                
                return (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.chipButton,
                      isActive && styles.chipButtonActive
                    ]}
                    onPress={() => handleUsageToggle(name)}
                  >
                    <Icon 
                      size={20} 
                      color={isActive ? '#FFFFFF' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.chipButtonText,
                      isActive && styles.chipButtonTextActive
                    ]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Date Selection - Different for treatment vs non-treatment types */}
        {isTreatmentType() ? (
          /* Treatment Date */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Treatment Date</Text>
            <Text style={styles.sectionSubtitle}>When did you receive this treatment?</Text>
            
            <TouchableOpacity onPress={() => setShowTreatmentDatePicker(!showTreatmentDatePicker)} style={styles.inputWrapper}>
              <Calendar 
                size={20} 
                color="#6B7280" 
                style={styles.inputIcon} 
              />
              <TouchableOpacity
                style={styles.dateInputButton}
                onPress={() => setShowTreatmentDatePicker(!showTreatmentDatePicker)}
              >
                <Text style={[styles.dateText, !treatmentDate && styles.dateTextPlaceholder]}>
                  {treatmentDate ? treatmentDate.toDateString() : 'Select treatment date'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {showTreatmentDatePicker && (
              <DateTimePicker
                value={treatmentDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTreatmentDateChange}
                minimumDate={new Date(new Date().getFullYear() - 10, 0, 1)}
                textColor={Platform.OS === 'ios' ? colors.textPrimary : colors.white}
                style={Platform.OS === 'ios' ? { backgroundColor: colors.white } : undefined}
                themeVariant="light"
              />
            )}
          </View>
        ) : (
          /* Start Date for non-treatment types */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Start Date</Text>
            <Text style={styles.sectionSubtitle}>Required for Efficacy Validation</Text>
            
            <TouchableOpacity onPress={() => setShowStartDatePicker(!showStartDatePicker)} style={styles.inputWrapper}>
              <Calendar 
                size={20} 
                color="#6B7280" 
                style={styles.inputIcon} 
              />
              <TouchableOpacity
                style={styles.dateInputButton}
                onPress={() => setShowStartDatePicker(!showStartDatePicker)}
              >
                <Text style={[styles.dateText, !startDate && styles.dateTextPlaceholder]}>
                  {startDate ? startDate.toDateString() : 'Select start date'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartDateChange}
                minimumDate={new Date(new Date().getFullYear() - 10, 0, 1)}
                textColor={Platform.OS === 'ios' ? colors.textPrimary : colors.white}
                style={Platform.OS === 'ios' ? { backgroundColor: colors.white } : undefined}
                themeVariant="light"
              />
            )}
          </View>
        )}

        {/* Stopped Checkbox - Only show for non-treatment types */}
        {!isTreatmentType() && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsStopped(!isStopped)}
            >
              <View style={[styles.checkbox, isStopped && styles.checkboxChecked]}>
                {isStopped && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Stopped Using It?</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* End Date - Only show if stopped and not treatment type */}
        {!isTreatmentType() && isStopped && (
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>For Efficacy Validation Please Provide</Text>
            <TouchableOpacity onPress={() => setShowEndDatePicker(!showEndDatePicker)} style={styles.inputWrapper}>
              <CalendarX 
                size={20} 
                color="#6B7280" 
                style={styles.inputIcon} 
              />
              <TouchableOpacity
                style={styles.dateInputButton}
                onPress={() => setShowEndDatePicker(!showEndDatePicker)}
              >
                <Text style={[styles.dateText, !endDate && styles.dateTextPlaceholder]}>
                  {endDate ? endDate.toDateString() : 'Select stop date'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {showEndDatePicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndDateChange}
                minimumDate={startDate || new Date(new Date().getFullYear() - 10, 0, 1)}
                textColor={Platform.OS === 'ios' ? colors.textPrimary : colors.white}
                style={Platform.OS === 'ios' ? { backgroundColor: colors.white } : undefined}
                themeVariant="light"
              />
            )}
          </View>
        )}

        {/* Stop Reason - Only show if stopped and not treatment type */}
        {!isTreatmentType() && isStopped && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle2}>Why did you stop using it?</Text>
            <View style={styles.chipSelectorContainer}>
              {stopReasons.map((reason) => {
                const isActive = stopReason === reason;
                
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.chipButton,
                      isActive && styles.chipButtonActive
                    ]}
                    onPress={() => setStopReason(reason)}
                  >
                    <Text style={[
                      styles.chipButtonText,
                      isActive && styles.chipButtonTextActive
                    ]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButtonBottom, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save to Routine</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom padding for scroll */}
        <View style={styles.bottomPadding} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </KeyboardAvoidingView>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        onProductScanned={handleProductScanned}
        onError={handleBarcodeError}
      />
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
  rightContainer: {
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
  keyboardContainer: {
    flex: 1,
    marginTop: 120,
  },
  scrollContainer: {
    flex: 1,
  },
  touchableArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionTitle2: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
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
  chipButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.sm,
  },
  chipButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipButtonTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,

    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontFamily: 'Inter',
  },
  dateInputButton: {
    flex: 1,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontFamily: 'Inter',
  },
  dateTextPlaceholder: {
    color: colors.textSecondary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontFamily: 'Inter',
  },
  bottomPadding: {
    height: 100,
  },
  saveButtonContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
  },
  saveButtonBottom: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 50,
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  cameraButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  scanInstructionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  searchResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    maxHeight: 200,
    zIndex: 1000,
    marginHorizontal: spacing.lg,
    ...shadows.md,
  },
  searchResultsScrollView: {
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  searchResultBrand: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  productDetailsContent: {
    marginTop: spacing.sm,
  },
  productTitleContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  productSection: {
    marginBottom: spacing.md,
  },
  productSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  crossButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
    marginTop: spacing.md,
  },
  crossButtonText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  showAllButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  showAllButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default CreateRoutineScreen;