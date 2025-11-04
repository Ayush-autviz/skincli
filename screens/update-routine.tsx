// update-routine.tsx
// Single scrollable screen for updating routine items

import React, { useState, useEffect, useRef } from 'react';
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
  Trash2,
  X,
  Camera,
  ChevronRight,
  Search
} from 'lucide-react-native';
import { colors, fontSize, spacing, typography, borderRadius, shadows } from '../styles';
import TabHeader from '../components/ui/TabHeader';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import ProductSearchModal from '../components/ProductSearchModal';
import { updateRoutineItem, deleteRoutineItem, searchProductByUPC, searchProducts } from '../utils/newApiService';

interface UpdateRoutineParams {
  itemData?: string;
  itemId?: string;
}

interface RoutineItem {
  id: string;
  name: string;
  type: string;
  usage: string;
  frequency: string;
  concerns: string[];
  dateStarted: Date | null;
  dateStopped: Date | null;
  treatmentDate: Date | null;
  stopReason: string;
  extra: any;
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

const UpdateRoutineScreen = (): React.JSX.Element => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as UpdateRoutineParams || {};

  console.log('🔍 UpdateRoutine: Initial params:', params);
  
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
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [itemId, setItemId] = useState<string>('');
  
  // UPC and product data states
  const [upcCode, setUpcCode] = useState<string>('');
  const [productData, setProductData] = useState<any>(null);
  const [isProductCrossed, setIsProductCrossed] = useState<boolean>(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState<boolean>(false);
  const [showProductSearchModal, setShowProductSearchModal] = useState<boolean>(false);
  const [isFetchingProduct, setIsFetchingProduct] = useState<boolean>(false);
  const [showAllGoodFor, setShowAllGoodFor] = useState<boolean>(false);
  const [showAllIngredients, setShowAllIngredients] = useState<boolean>(false);
  const [showAllFreeOf, setShowAllFreeOf] = useState<boolean>(false);
  
  // Search states (now only used for the modal)
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState<boolean>(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState<boolean>(false);
  const [showTreatmentDatePicker, setShowTreatmentDatePicker] = useState<boolean>(false);

  // Initialize form with existing data
  useEffect(() => {
    if (params.itemData) {
      try {
        const itemData: any = JSON.parse(params.itemData);
        setItemId(itemData.id || '');
        setItemName(itemData.name || '');
        setItemType(itemData.type || 'Product');
        
        // Handle UPC and product data
        if (itemData.upc) {
          setUpcCode(itemData.upc);
          setProductData(itemData.productData || null);
        }
        
        // Handle usage conversion
        if (itemData.usage === 'both' || itemData.usage === 'AM + PM' || itemData.usage === 'Both') {
          setItemUsage(['AM & PM']);
        } else if (itemData.usage === 'as_needed' || itemData.usage === 'As needed') {
          setItemUsage(['As needed']);
        } else if (itemData.usage === 'am' || itemData.usage === 'AM') {
          setItemUsage(['AM']);
        } else if (itemData.usage === 'pm' || itemData.usage === 'PM') {
          setItemUsage(['PM']);
        } else if (itemData.usage) {
          setItemUsage([itemData.usage]);
        }
        
        // Handle frequency conversion
        if (itemData.frequency === 'as_needed' || itemData.frequency === 'As needed') {
          setItemFrequency('As needed');
        } else if (itemData.frequency === 'daily' || itemData.frequency === 'Daily') {
          setItemFrequency('Daily');
        } else if (itemData.frequency === 'weekly' || itemData.frequency === 'Weekly') {
          setItemFrequency('Weekly');
        } else if (itemData.frequency) {
          setItemFrequency(itemData.frequency);
        }
        
        setItemConcerns(itemData.concerns || []);
        
        // Handle dates
        if (itemData.dateStarted) {
          setStartDate(new Date(itemData.dateStarted));
        }
        if (itemData.dateStopped) {
          setEndDate(new Date(itemData.dateStopped));
          setIsStopped(true);
        }
        if (itemData.treatmentDate) {
          setTreatmentDate(new Date(itemData.treatmentDate));
        }
        
        setStopReason(itemData.stopReason || '');
      } catch (error) {
        console.error('Error parsing item data:', error);
        Alert.alert('Error', 'Failed to load routine item data');
      }
    }
    
    if (params.itemId) {
      setItemId(params.itemId);
    }
  }, [params]);

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

  // Handle product search modal
  const handleProductSearch = () => {
    setShowProductSearchModal(true);
  };

  // Handle product scanned from modal
  const handleProductScanned = (scannedProductData: any) => {
    console.log('🔍 Product scanned:', scannedProductData);
    setProductData(scannedProductData);
    setItemName(scannedProductData.product_name || '');
    setUpcCode(scannedProductData.upc || '');
    setIsProductCrossed(false); // Reset crossed state when new product is scanned
    setShowAllGoodFor(false); // Reset show all states
    setShowAllIngredients(false);
    setShowAllFreeOf(false);
    
    // Auto-populate concerns based on good_for data
    if (scannedProductData.good_for && Array.isArray(scannedProductData.good_for)) {
      const mappedConcerns = scannedProductData.good_for.map((concern: string) => {
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
      'This product is not in our database. Please add it manually in the text box and our research team will work on this.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Close the barcode modal instead of navigating back
            setShowBarcodeModal(false);
          }
        }
      ]
    );
  };

  // Handle crossing out the product
  const handleCrossProduct = () => {
    setIsProductCrossed(true);
    setItemName('');
    setUpcCode(null as any);
    setProductData(null);
    setShowAllGoodFor(false); // Reset show all states
    setShowAllIngredients(false);
    setShowAllFreeOf(false);
  };


  // Search functionality is now handled by the ProductSearchModal

  // Handle product selection from search modal
  const handleProductSelectFromModal = async (product: any) => {
    try {
      console.log('🔍 Product selected from modal:', product);

      // Fetch full product details using UPC (like the old implementation)
      if (product.upc) {
        setIsFetchingProduct(true);
        const response = await searchProductByUPC(product.upc);

        if ((response as any).success && (response as any).data) {
          const fullProductData = (response as any).data;
          console.log('🔍 Full product data fetched:', fullProductData);

          setProductData(fullProductData);
          setItemName(fullProductData.product_name || product.product_name || '');
          setUpcCode(fullProductData.upc || product.upc || '');

          // Auto-populate concerns based on good_for data
          if (fullProductData.good_for && Array.isArray(fullProductData.good_for)) {
            const mappedConcerns = fullProductData.good_for.map((concern: string) => {
              // Map API concerns to our concerns options
              const concernMapping: { [key: string]: string } = {
                'dry_skin': 'Dry Skin',
                'oily_skin': 'Oily Skin',
                'combination_skin': 'Combination Skin',
                'normal_skin': 'Normal Skin',
                'sensitive_skin': 'Sensitive Skin',
                'hydration': 'Hydration',
                'fine_lines': 'Fine Lines',
                'anti_aging': 'Anti-Aging',
              };
              return concernMapping[concern] || concern;
            }).filter(Boolean);

            setItemConcerns(mappedConcerns);
          }
        } else {
          // Fallback to basic product data if UPC fetch fails
          console.log('⚠️ UPC fetch failed, using basic product data');
          setProductData(product);
          setItemName(product.product_name || '');
          setUpcCode(product.upc || '');

          // Auto-populate concerns based on good_for data
          if (product.good_for && Array.isArray(product.good_for)) {
            const mappedConcerns = product.good_for.map((concern: string) => {
              // Map API concerns to our concerns options
              const concernMapping: { [key: string]: string } = {
                'dry_skin': 'Dry Skin',
                'oily_skin': 'Oily Skin',
                'combination_skin': 'Combination Skin',
                'normal_skin': 'Normal Skin',
                'sensitive_skin': 'Sensitive Skin',
                'hydration': 'Hydration',
                'fine_lines': 'Fine Lines',
                'anti_aging': 'Anti-Aging',
              };
              return concernMapping[concern] || concern;
            }).filter(Boolean);

            setItemConcerns(mappedConcerns);
          }
        }
      } else {
        // No UPC available, use basic product data
        console.log('⚠️ No UPC available, using basic product data');
        setProductData(product);
        setItemName(product.product_name || '');
        setUpcCode(product.upc || '');

        // Auto-populate concerns based on good_for data
        if (product.good_for && Array.isArray(product.good_for)) {
          const mappedConcerns = product.good_for.map((concern: string) => {
            // Map API concerns to our concerns options
            const concernMapping: { [key: string]: string } = {
              'dry_skin': 'Dry Skin',
              'oily_skin': 'Oily Skin',
              'combination_skin': 'Combination Skin',
              'normal_skin': 'Normal Skin',
              'sensitive_skin': 'Sensitive Skin',
              'hydration': 'Hydration',
              'fine_lines': 'Fine Lines',
              'anti_aging': 'Anti-Aging',
            };
            return concernMapping[concern] || concern;
          }).filter(Boolean);

          setItemConcerns(mappedConcerns);
        }
      }

      // Reset display states
      setIsProductCrossed(false);
      setShowAllGoodFor(false);
      setShowAllIngredients(false);
      setShowAllFreeOf(false);

      setShowProductSearchModal(false);
    } catch (error) {
      console.error('🔴 Error fetching full product details:', error);
      // Fallback to basic product data
      setProductData(product);
      setItemName(product.product_name || '');
      setUpcCode(product.upc || '');
      setIsProductCrossed(false);
      setShowAllGoodFor(false);
      setShowAllIngredients(false);
      setShowAllFreeOf(false);

      // Auto-populate concerns based on good_for data
      if (product.good_for && Array.isArray(product.good_for)) {
        const mappedConcerns = product.good_for.map((concern: string) => {
          // Map API concerns to our concerns options
          const concernMapping: { [key: string]: string } = {
            'dry_skin': 'Dry Skin',
            'oily_skin': 'Oily Skin',
            'combination_skin': 'Combination Skin',
            'normal_skin': 'Normal Skin',
            'sensitive_skin': 'Sensitive Skin',
            'hydration': 'Hydration',
            'fine_lines': 'Fine Lines',
            'anti_aging': 'Anti-Aging',
          };
          return concernMapping[concern] || concern;
        }).filter(Boolean);

        setItemConcerns(mappedConcerns);
      }

      setShowProductSearchModal(false);
    } finally {
      setIsFetchingProduct(false);
    }
  };


  // Handle text input change
  const handleNameChange = (text: string) => {
    setItemName(text);
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

    if (!itemId) {
      Alert.alert('Error', 'Item ID is missing. Cannot update.');
      return;
    }

    // For treatment types, validate treatment date
    if (isTreatmentType()) {
      if (!treatmentDate) {
        Alert.alert('Missing Information', 'Please select the treatment date.');
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
    }

    // Prepare data for API
    const apiItemData: any = {
      name: itemName.trim(),
      type: formatParameter(itemType),
      concern: itemConcerns,
      extra: {
        dateUpdated: new Date().toISOString()
      }
    };

    // Add UPC code and product data if product was scanned
    if (upcCode && productData && !isProductCrossed) {
      apiItemData.upc = upcCode;
      apiItemData.extra = {
        ...apiItemData.extra,
        brand: productData.brand,
        ingredients: productData.ingredients || [],
        good_for: productData.good_for || [],
        product_id: productData.product_id,
        total_ingredients: productData.total_ingredients
      };
    } else {
      // Explicitly set empty UPC for manually entered products
      apiItemData.upc = null as any;
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
      apiItemData.treatment_date = treatmentDate.toISOString().split('T')[0];
      apiItemData.extra.treatmentDate = treatmentDate?.toISOString();
    } else {
      apiItemData.start_date = startDate.toISOString().split('T')[0];
      apiItemData.end_date = endDate ? endDate.toISOString().split('T')[0] : '';
      apiItemData.extra.dateStarted = startDate?.toISOString();
      apiItemData.extra.dateStopped = endDate?.toISOString();
      apiItemData.extra.stopReason = stopReason;
    }

    console.log('🔍 API Item Data:', apiItemData);

    setIsSaving(true);
    try {
      const response = await updateRoutineItem(itemId, apiItemData);
      
      if ((response as any).success) {
        Alert.alert('Success!', 'Your routine item has been updated successfully.', [
          {
            text: 'Continue',
            onPress: () => (navigation as any).goBack()
          }
        ]);
      }
    } catch (err: any) {
      console.error('🔴 UpdateRoutine: Error saving item:', err);
      Alert.alert('Error', err.message || 'Failed to save item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete routine item
  const handleDelete = async (): Promise<void> => {
    if (!itemId) {
      Alert.alert('Error', 'Item ID is missing. Cannot delete.');
      return;
    }

    Alert.alert(
      'Delete Routine Item',
      `Are you sure you want to permanently delete "${itemName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await deleteRoutineItem(itemId);
              
              if ((response as any).success) {
                Alert.alert('Success!', 'Routine item deleted successfully.', [
                  {
                    text: 'Continue',
                    onPress: () => (navigation as any).goBack()
                  }
                ]);
              } else {
                Alert.alert('Error', 'Failed to delete routine item');
              }
            } catch (err: any) {
              console.error('🔴 UpdateRoutine: Error deleting item:', err);
              Alert.alert('Error', err.message || 'Failed to delete item. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
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
            onPress={() => (navigation as any).goBack()}
          >
            <View style={styles.iconContainer}>
              <ArrowLeft size={22} color={colors.primary} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Edit Routine Item</Text>
            <View style={styles.titleUnderline} />
          </View>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
        <View style={styles.shadowContainer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
              <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle2}>Type</Text>
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
          {!(upcCode && productData && !isProductCrossed) && (
            <Text style={styles.sectionTitle2}>Name</Text>
          )}
          
          {/* Show product details if UPC exists and product is not crossed */}
          {upcCode && productData && !isProductCrossed ? (
            <View style={styles.productDetailsContent}>
              {/* Product Title and Brand */}
              <View style={styles.productTitleContainer}>
                <Text style={styles.productName}>
                  {productData.product_name || 'Unknown Product'}
                </Text>
                <Text style={styles.brandName}>
                  {productData.brand?.toUpperCase() || 'UNKNOWN BRAND'}
                </Text>
              </View>

              {/* Good For Section */}
              {productData.good_for && productData.good_for.length > 0 && (
                <View style={styles.productSection}>
                  <Text style={styles.productSectionTitle}>Good For</Text>
                  <View style={styles.chipSelectorContainer}>
                    {(showAllGoodFor ? productData.good_for : productData.good_for.slice(0, 5)).map((item: string, index: number) => (
                      <View key={index} style={styles.chipButton}>
                        <Text style={styles.chipButtonText}>{formatGoodForItem(item)}</Text>
                      </View>
                    ))}
                  </View>
                  {productData.good_for.length > 5 && (
                    <TouchableOpacity 
                      style={styles.showAllButton}
                      onPress={() => setShowAllGoodFor(!showAllGoodFor)}
                    >
                      <Text style={styles.showAllButtonText}>
                        {showAllGoodFor ? 'Show Less' : `Show All (${productData.good_for.length})`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

{productData.ingredients && productData.ingredients.some((ingredient: any) => ingredient.free_of && ingredient.free_of.length > 0) && (
                <View style={styles.productSection}>
                  <Text style={styles.productSectionTitle}>Free Of</Text>
                  <View style={styles.chipSelectorContainer}>
                    {(() => {
                      const freeOfItems = Array.from(new Set(
                        productData.ingredients
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
                      productData.ingredients
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

              {/* Key Ingredients Section */}
              {productData.ingredients && productData.ingredients.length > 0 && (
                <View style={styles.productSection}>
                  <Text style={styles.productSectionTitle}>Ingredients</Text>
                  <View style={styles.chipSelectorContainer}>
                    {(showAllIngredients ? productData.ingredients : productData.ingredients.slice(0, 5)).map((ingredient: any, index: number) => (
                      <View key={index} style={styles.chipButton}>
                        <Text style={styles.chipButtonText}>
                          {formatIngredientName(ingredient.ingredient_name)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {productData.ingredients.length > 5 && (
                    <TouchableOpacity 
                      style={styles.showAllButton}
                      onPress={() => setShowAllIngredients(!showAllIngredients)}
                    >
                      <Text style={styles.showAllButtonText}>
                        {showAllIngredients ? 'Show Less' : `Show All (${productData.ingredients.length})`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Free Of Section */}
   

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
              {/* Camera and Search icons - only show for Product type and when not treatment */}
              {!isTreatmentType() && (
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity 
                    onPress={handleProductSearch}
                    style={styles.searchButton}
                  >
                    <Search size={20} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleBarcodeScan}
                    style={styles.cameraButton}
                  >
                    <Camera size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          
          {/* Scan instruction text - only show for Product type and when not treatment and not showing product details */}
          {!isTreatmentType() && !(upcCode && productData && !isProductCrossed) && (
            <Text style={styles.scanInstructionText}>Scan Barcode, search our database or type a product name if product not found</Text>
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
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom padding for scroll */}
        <View style={styles.bottomPadding} />
              </ScrollView>
      </KeyboardAvoidingView>


      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        onProductScanned={handleProductScanned}
        onError={handleBarcodeError}
      />

      {/* Product Search Modal */}
      <ProductSearchModal
        visible={showProductSearchModal}
        onClose={() => setShowProductSearchModal(false)}
        onProductSelect={handleProductSelectFromModal}
        onError={handleBarcodeError}
        onSaveCustomProduct={(productName: string) => {
          setItemName(productName);
          setShowProductSearchModal(false);
        }}
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
  deleteButton: {
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
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  cameraButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  scanInstructionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
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

export default UpdateRoutineScreen;
