// MyRoutine.tsx
// Component to display and manage the user's routine items

import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, SectionList, ActivityIndicator, StyleSheet, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { colors, spacing, typography, palette } from '../../styles';
import { useNavigation } from '@react-navigation/native';
import { ClipboardPlus, Pill } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Chip from '../ui/Chip';
import ModalBottomSheet from '../layout/ModalBottomSheet';
import AiMessageCard from '../chat/AiMessageCard';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ListItem from '../ui/ListItem';
import { 
  FlaskConical, 
  Dumbbell, 
  Apple, 
  Sun, 
  Moon, 
  Calendar, 
  CalendarX,
  CheckCircle,
  CalendarDays,
  HelpCircle,
  X,
  Plus,
  Archive,
  ChevronRight
} from 'lucide-react-native';
import { 
  getRoutineItems, 
  createRoutineItem, 
  updateRoutineItem, 
  deleteRoutineItem,
  clearPendingRequests
} from '../../utils/newApiService';

// Define static messages based on routine size
const staticAiMessages = [
    {
        numItems: 0,
        msg: "Build a routine to see some results!"
    },
    {
        numItems: 1,
        msg: "What else do you use or do? Add another item!"
    },
    {
        numItems: 3, // Use this threshold for 2 or 3 items
        msg: "Looking good! Do you want help building more of a routine?"
    },
    {
        // numItems: "full", // Use a condition check instead of string key
        msgs: [ // Array of messages for > 3 items
            "Consistency is key! Keep up the great work.",
            "Your routine is looking comprehensive!",
            "Looking good! Remember to review your routine periodically."
        ]
    }
];

// Define concerns options
const concernsOptions = [
    'Evenness',
    'Redness', 
    'Visible Pores',
    'Lines',
    'Eye Area Condition',
    'Skin Type',
    'Skin Tone',
    'Perceived Age',
    'Perceived Eye Age'
];

// Define stop reasons
const stopReasons = [
    'Not effective',
    'Doesn\'t feel right',
    'Allergy',
    'Too expensive',
    'Other'
];

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
  dateCreated: Date;
  upc?: string; // UPC code for scanned products
  extra: any;
}

interface RoutineSection {
  title: string;
  data: RoutineItem[];
}

interface ApiResponse {
  success: boolean;
  data: any[];
}

interface MyRoutineProps {}

interface MyRoutineRef {
  refetchRoutines: () => void;
}

// Helper function to calculate usage duration
const calculateUsageDuration = (dateStarted: any): string | null => {
  let start: Date;
  // Firestore Timestamp
  if (dateStarted && typeof dateStarted.toDate === 'function') {
    start = dateStarted.toDate();
  } 
  // JS Date
  else if (dateStarted instanceof Date) {
    start = dateStarted;
  } 
  // String date (MM/DD/YY or MM/DD/YYYY)
  else if (typeof dateStarted === 'string' && dateStarted.includes('/')) {
    // Normalize to MM/DD/YYYY if needed
    let parts = dateStarted.split('/');
    if (parts.length === 3 && parts[2].length === 2) {
      parts[2] = (parseInt(parts[2], 10) > 50 ? '19' : '20') + parts[2];
    }
    start = new Date(parts.join('/'));
  } else {
    return null;
  }

  if (isNaN(start.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30);
  const years = Math.floor(months / 12);

  if (years > 0) {
    return `Using since ${start.toLocaleDateString()}`; // Display start date for long durations
  } else if (months > 0) {
    return `Using for ${months} month${months > 1 ? 's' : ''}`;
  } else {
    return `Using for ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }
};

const MyRoutine = forwardRef<MyRoutineRef, MyRoutineProps>((props, ref): React.JSX.Element => {
  const navigation = useNavigation();
  const [routineItems, setRoutineItems] = useState<RoutineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<RoutineItem | null>(null);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemType, setNewItemType] = useState<string>('Product');
  const [newItemUsage, setNewItemUsage] = useState<string[]>(['AM']);
  const [newItemFrequency, setNewItemFrequency] = useState<string>('Daily');
  const [newItemDateStarted, setNewItemDateStarted] = useState<Date | null>(null);
  const [newItemDateStopped, setNewItemDateStopped] = useState<Date | null>(null);
  const [newItemTreatmentDate, setNewItemTreatmentDate] = useState<Date | null>(null); // For treatment types
  const [newItemConcerns, setNewItemConcerns] = useState<string[]>([]);
  const [isStopped, setIsStopped] = useState<boolean>(false);
  const [stopReason, setStopReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);

  // State for Date Pickers
  const [showStartDatePicker, setShowStartDatePicker] = useState<boolean>(false);
  const [showStopDatePicker, setShowStopDatePicker] = useState<boolean>(false);

  const insets = useSafeAreaInsets();
  const [fixedCardHeight, setFixedCardHeight] = useState<number>(150);
  
  // Ref to track if fetch is in progress
  const fetchInProgressRef = useRef<boolean>(false);
  
  // Ref to track debounce timeout
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Ref to track if we've already attempted to fetch data
  const hasAttemptedFetchRef = useRef<boolean>(false);
  
  // Ref to track if we should refetch on focus
  const shouldRefetchOnFocusRef = useRef<boolean>(false);
  
  // Ref to track the refetch timeout
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Ref to track focus effect debounce
  const focusEffectDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Transform API data to component format
  const transformApiItem = (apiItem: any): RoutineItem => {
    // Normalize API values to component expected format
    const typeMap: { [key: string]: string } = {
      'product': 'Product',
      'activity': 'Activity', 
      'nutrition': 'Nutrition',
      'treatment_facial': 'Treatment / Facial',
      'treatment_injection': 'Treatment / Injection',
      'treatment_other': 'Treatment / Other'
    };
    
    const usageMap: { [key: string]: string } = {
      'am': 'AM',
      'pm': 'PM',
      'both': 'AM + PM',
      'as_needed': 'As needed'
    };
    
    const frequencyMap: { [key: string]: string } = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'as_needed': 'As needed'
    };

    return {
      id: apiItem.id,
      name: apiItem.name,
      type: typeMap[apiItem.type] || apiItem.type,
      usage: usageMap[apiItem.usage] || apiItem.usage,
      frequency: frequencyMap[apiItem.frequency] || apiItem.frequency,
      concerns: apiItem.concern || [],
      dateStarted: apiItem.extra?.dateStarted ? new Date(apiItem.extra.dateStarted) : null,
      dateStopped: apiItem.extra?.dateStopped ? new Date(apiItem.extra.dateStopped) : null,
      treatmentDate: apiItem.extra?.treatmentDate ? new Date(apiItem.extra.treatmentDate) : null,
      stopReason: apiItem.extra?.stopReason || '',
      dateCreated: apiItem.extra?.dateCreated ? new Date(apiItem.extra.dateCreated) : new Date(),
      upc: apiItem.upc || undefined, // Include UPC code if present
      extra: apiItem.extra || {}
    };
  };

  // Fetch routine items from API
  const fetchRoutineItems = async (): Promise<void> => {
    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounce the fetch call to prevent rapid successive calls
    debounceTimeoutRef.current = setTimeout(async () => {
      // Prevent multiple simultaneous fetch calls
      if (fetchInProgressRef.current) {
        console.log('🔄 MyRoutine: Fetch already in progress, skipping...');
        return;
      }
      
      try {
        fetchInProgressRef.current = true;
        hasAttemptedFetchRef.current = true; // Mark that we've attempted to fetch
        setLoading(true);
        setError(null);
        
        const response = await getRoutineItems() as ApiResponse;
        
        if (response.success && response.data) {
          const transformedItems = response.data.map(transformApiItem);
          setRoutineItems(transformedItems);
          shouldRefetchOnFocusRef.current = false; // No need to refetch if we have data
          
          // Clear any existing timeout
          if (refetchTimeoutRef.current) {
            clearTimeout(refetchTimeoutRef.current);
          }
        } else {
          setRoutineItems([]);
          shouldRefetchOnFocusRef.current = true; // Mark that we should refetch on focus if no data
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error('🔴 MyRoutine: Error fetching routine items:', err);
        
        // Handle specific error types
        if (err.message === 'DUPLICATE_REQUEST' || err.message === 'REQUEST_IN_PROGRESS') {
          console.log('🔄 MyRoutine: Request in progress, will retry shortly...');
          // Clear any stuck pending requests
          clearPendingRequests();
          // Wait a bit and retry
          setTimeout(() => {
            if (!loading) { // Only retry if not already loading
              fetchRoutineItems();
            }
          }, 500);
          return;
        }
        
        setError(err.message || 'Failed to load routine items.');
        setRoutineItems([]); // Set empty array on error
        shouldRefetchOnFocusRef.current = true; // Mark that we should refetch on focus after error
        setLoading(false);
      } finally {
        fetchInProgressRef.current = false;
      }
    }, 100); // 100ms debounce delay
  };

  // Expose refetchRoutines method to parent component
  useImperativeHandle(ref, () => ({
    refetchRoutines: () => {
      console.log('🔄 MyRoutine: Refetching routines from parent');
      fetchRoutineItems();
    }
  }));

  useEffect(() => {
    let isMounted = true;
    
    const loadRoutines = async (): Promise<void> => {
      if (isMounted) {
        await fetchRoutineItems();
      }
    };
    
    loadRoutines();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
      fetchInProgressRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
      if (focusEffectDebounceRef.current) {
        clearTimeout(focusEffectDebounceRef.current);
      }
      clearPendingRequests(); // Clear pending requests on unmount
    };
  }, []);

  // Set stop date to today when user checks "Stopped Using It"
  useEffect(() => {
    if (isStopped && !newItemDateStopped) {
      setNewItemDateStopped(new Date());
    }
  }, [isStopped]);

  // Refetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Clear any existing focus effect debounce
      if (focusEffectDebounceRef.current) {
        clearTimeout(focusEffectDebounceRef.current);
      }
      
      // Debounce the focus effect to prevent rapid successive calls
      focusEffectDebounceRef.current = setTimeout(() => {
        // Clear any stuck pending requests first
        clearPendingRequests();
        
        // Only refetch if:
        // 1. We haven't attempted to fetch yet (first time), OR
        // 2. We should refetch on focus AND we have no data AND we're not loading
        // 
        // We NEVER refetch when we already have data to prevent unnecessary re-renders
        const shouldRefetch = 
          !hasAttemptedFetchRef.current || 
          (shouldRefetchOnFocusRef.current && !loading && !fetchInProgressRef.current && routineItems.length === 0);
        
        if (shouldRefetch) {
          console.log('🔄 MyRoutine: Screen focused, refetching routines...', {
            hasAttempted: hasAttemptedFetchRef.current,
            shouldRefetchOnFocus: shouldRefetchOnFocusRef.current,
            hasData: routineItems.length > 0,
            isLoading: loading
          });
          fetchRoutineItems();
        } else {
          console.log('🔄 MyRoutine: Screen focused, no need to refetch', {
            hasAttempted: hasAttemptedFetchRef.current,
            shouldRefetchOnFocus: shouldRefetchOnFocusRef.current,
            hasData: routineItems.length > 0,
            isLoading: loading
          });
        }
      }, 300); // 300ms debounce delay for focus effect
    }, [routineItems.length, loading])
  );

  // Toggle logic for AM/PM usage (checkbox style)
  const handleUsageToggle = (tappedUsage: string): void => {
    setNewItemUsage(currentUsage => {
      const isSelected = currentUsage.includes(tappedUsage);
      if (isSelected) {
        // Deselect: remove it from the array
        return currentUsage.filter(u => u !== tappedUsage);
      } else {
        // Select: add it to the array
        return [...currentUsage, tappedUsage].sort(); // Keep sorted for consistency
      }
    });
  };

  // Toggle logic for concerns selection
  const handleConcernToggle = (concern: string): void => {
    setNewItemConcerns(currentConcerns => {
      const isSelected = currentConcerns.includes(concern);
      if (isSelected) {
        // Deselect: remove it from the array
        return currentConcerns.filter(c => c !== concern);
      } else {
        // Select: add it to the array
        return [...currentConcerns, concern];
      }
    });
  };

  // Step navigation functions
  const nextStep = (): void => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = (): void => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = (): boolean => {
    switch (currentStep) {
      case 1: return !!newItemType; // Category selected
      case 2: return !!newItemName.trim(); // Name entered
      case 3: return newItemConcerns.length > 0; // At least one concern selected
      case 4: return !!newItemFrequency; // Frequency selected
      case 5: return newItemUsage.length > 0; // At least one usage time selected
      case 6: 
        // For treatment types, check treatment date; for others, check start date
        const isTreatment = newItemType && (
          newItemType === 'Treatment / Facial' || 
          newItemType === 'Treatment / Injection' || 
          newItemType === 'Treatment / Other'
        );
        return isTreatment ? !!newItemTreatmentDate : !!newItemDateStarted;
      default: return true;
    }
  };

  // Date picker handlers
  const handleStartDateChange = (event: any, selectedDate?: Date): void => {
   // setShowStartDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setNewItemDateStarted(selectedDate);
    }
  };

  const handleStopDateChange = (event: any, selectedDate?: Date): void => {
    //setShowStopDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setNewItemDateStopped(selectedDate);
    }
  };

  const handleTreatmentDateChange = (event: any, selectedDate?: Date): void => {
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setNewItemTreatmentDate(selectedDate);
    }
  };

  // Handler for navigating to the chat screen for routine discussion
  const handleNavigateToChat = async (): Promise<void> => { 
    // if (!routineItems || routineItems.length === 0) {
    //   console.error("MyRoutine: Cannot create routine thread, no user context.");
    //   alert("Please log in to chat about your routine.");
    //   return;
    // }

    try {
      // Conditional initial message based on whether user has existing routine items
      const hasRoutineItems = routineItems && routineItems.length > 0;
      const initialMessage = hasRoutineItems 
        ? "Have you made any changes to your routine lately, or are you thinking about trying something new?"
        : "Let's walk through your current skincare routine. Tell me what you're currently doing, one product or activity at a time.";
      
      // TODO: Replace with actual API call to create thread
      // const { success, threadId: newThreadId } = await createThread(user.uid, {
      //     type: 'routine_add_discussion',
      //     initialMessageContent: initialMessage
      // });

      // Navigate to thread-based chat
      (navigation as any).navigate('ThreadChat', {
        chatType: 'routine_add_discussion',
        initialMessage: initialMessage
      });
    } catch (error) {
        console.error("MyRoutine: Error creating or navigating to routine chat:", error);
        Alert.alert("Error", "Sorry, couldn't start the routine chat. Please try again.");
    }
  };

  // Combined Add/Update handler
  const handleSaveItem = async (): Promise<void> => {
    if (!newItemName.trim()) {
      Alert.alert('Error', 'Please enter an item name.');
      return;
    }

    if (!newItemType.trim()) {
      Alert.alert('Error', 'Please select an item type.');
      return;
    }

    // Check if current type is a treatment type
    const isTreatmentType = (): boolean => {
      return !!(newItemType && (
        newItemType === 'Treatment / Facial' || 
        newItemType === 'Treatment / Injection' || 
        newItemType === 'Treatment / Other'
      ));
    };

    // For treatment types, validate treatment date
    if (isTreatmentType()) {
      if (!newItemTreatmentDate) {
        Alert.alert('Error', 'Please select the treatment date.');
        return;
      }
      
      // Validate treatment date is not in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedTreatmentDate = new Date(newItemTreatmentDate);
      selectedTreatmentDate.setHours(0, 0, 0, 0);
      
      if (selectedTreatmentDate > today) {
        Alert.alert('Invalid Date', 'Cannot select future date for treatment date.');
        return;
      }
    } else {
      // For non-treatment types, validate start date
      if (!newItemDateStarted) {
        Alert.alert('Error', 'Please select a start date.');
        return;
      }

      // Validate start date is not in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedStartDate = new Date(newItemDateStarted);
      selectedStartDate.setHours(0, 0, 0, 0);
      
      if (selectedStartDate > today) {
        Alert.alert('Invalid Date', 'Cannot select future date for start date.');
        return;
      }

      // Validate stop date is not in the future (if present)
      if (newItemDateStopped) {
        const selectedStopDate = new Date(newItemDateStopped);
        selectedStopDate.setHours(0, 0, 0, 0);
        
        if (selectedStopDate > today) {
          Alert.alert('Invalid Date', 'Cannot select future date for stop date.');
          return;
        }
      }

      // Validate dates if both are present
      if (newItemDateStarted && newItemDateStopped && newItemDateStopped < newItemDateStarted) {
        Alert.alert('Error', 'Stop date cannot be before start date.');
        return;
      }
    }

    let finalUsage = 'AM';
    const includesAM = newItemUsage.includes('AM');
    const includesPM = newItemUsage.includes('PM');
    if (includesAM && includesPM) finalUsage = 'both';
    else if (includesPM) finalUsage = 'pm';
    else if (includesAM) finalUsage = 'am';
    else if (newItemUsage.includes('As needed')) finalUsage = 'as_needed';

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
      if (value === 'Product') {
        return value.toLowerCase();
      }
      if (value === 'Treatment / Facial') return 'treatment_facial';
      if (value === 'Treatment / Injection') return 'treatment_injection';
      if (value === 'Treatment / Other') return 'treatment_other';
      return value;
    };

    // Prepare data for API (with new fields for updated API)
    const apiItemData: any = {
      name: newItemName.trim(),
      type: formatParameter(newItemType),
      usage: finalUsage,
      frequency: formatParameter(newItemFrequency),
      concern: newItemConcerns,
      extra: {
        concerns: newItemConcerns,
        dateCreated: editingItem?.dateCreated?.toISOString() || new Date().toISOString()
      }
    };

    // Add date fields based on type
    if (isTreatmentType()) {
      apiItemData.treatment_date = newItemTreatmentDate!.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      apiItemData.extra.treatmentDate = newItemTreatmentDate?.toISOString();
    } else {
      apiItemData.start_date = newItemDateStarted ? newItemDateStarted.toISOString().split('T')[0] : '';
      apiItemData.end_date = newItemDateStopped ? newItemDateStopped.toISOString().split('T')[0] : '';
      apiItemData.extra.dateStarted = newItemDateStarted?.toISOString();
      apiItemData.extra.dateStopped = newItemDateStopped?.toISOString();
      apiItemData.extra.stopReason = stopReason;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        // Update existing item
        const response = await updateRoutineItem(editingItem.id, apiItemData) as ApiResponse;
        console.log('🟡 MyRoutine: Update response:', response);
        
        if (response.success) {
          // Refetch all routine items to ensure consistency
          await fetchRoutineItems();
          Alert.alert('Success', 'Item updated successfully');
        }
      } else {
        // Create new item
        const response = await createRoutineItem(apiItemData) as ApiResponse;
        console.log('🟡 MyRoutine: Create response:', response);
        
        if (response.success) {
          // Refetch all routine items to ensure consistency
          await fetchRoutineItems();
          Alert.alert('Success', 'Item added successfully');
        }
      }
      closeModal();
    } catch (err: any) {
      console.error('🔴 MyRoutine: Error saving item:', err);
      Alert.alert('Error', err.message || 'Failed to save item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render individual routine item
  const renderRoutineItem = ({ item }: { item: RoutineItem }): React.JSX.Element => {
    console.log("🔵 renderRoutineItem - item:", item);
    const isNotUsing = item.dateStopped && new Date(item.dateStopped) <= new Date();
    const usageDuration = calculateUsageDuration(item.dateStarted);
    
    // Determine display usage
    let displayUsage = item.usage;
    if (item.usage === 'Both') displayUsage = 'AM/PM';
    
    // Create chips array
    const chips: { label: string; type: string }[] = [];
    if (item.usage && !isNotUsing) {
      chips.push({ label: displayUsage, type: 'default' });
    }
    if (isNotUsing) {
      chips.push({ label: 'Stopped', type: 'stopped' });
    }
    if (item.frequency && item.frequency !== 'Daily') {
      chips.push({ label: item.frequency, type: 'frequency' });
    }

    // Format date info
    let dateInfo: string | null = null;
    
    // Check if this is a treatment type
    const isTreatment = item.type && (
      item.type === 'Treatment / Facial' || 
      item.type === 'Treatment / Injection' || 
      item.type === 'Treatment / Other'
    );
    
    if (isTreatment && item.treatmentDate) {
      // For treatment types, show treatment date
      const treatmentDate = new Date(item.treatmentDate);
      const formattedDate = treatmentDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      dateInfo = `Treatment date: ${formattedDate}`;
    } else if (item.dateStarted) {
      // For non-treatment types, show start date
      const startDate = new Date(item.dateStarted);
      const formattedDate = startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      if( item.type === 'Product' || item.type === 'Nutrition') {
        dateInfo = `You started using this product on ${formattedDate}`;
      } else if( item.type === 'Activity') {
        dateInfo = `You started this activity on ${formattedDate}`;
      } 
    }
    
    if (item.dateStopped) {
      const stopDate = new Date(item.dateStopped);
      const startDate = new Date(item.dateStarted!);
      const formattedStartDate = startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const formattedStopDate = stopDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      if( item.type === 'Product' || item.type === 'Nutrition') {
        dateInfo = `You started using this product on ${formattedStartDate} and stopped on ${formattedStopDate}`;
      } else if( item.type === 'Activity') {
        dateInfo = `You started this activity on ${formattedStartDate} and stopped on ${formattedStopDate}`;
      } 
    }

    console.log('item', item);
    
    // Determine icon based on item type
    const getItemIcon = (): string => {
      if (item.type === 'Product') {
        return 'bottle-tonic-outline'; // MaterialCommunityIcons
      } else if (item.type === 'Activity') {
        return 'yoga'; // MaterialCommunityIcons
      } else if (item.type === 'Nutrition') {
        return 'food-apple-outline'; // MaterialCommunityIcons
      } else if (item.type && (
        item.type === 'Treatment / Facial' ||
        item.type === 'Treatment / Injection' ||
        item.type === 'Treatment / Other'
      )) {
        return 'bottle-tonic-outline'; // MaterialCommunityIcons
      }
      return 'bottle-tonic-outline'; // Default MaterialCommunityIcons
    };

    const getItemIconColor = (): string => {
      if (item.type === 'Product') {
        return colors.primary;
      } else if (item.type === 'Activity') {
        return '#009688';
      } else if (item.type === 'Nutrition') {
        return '#FF6B35';
      } else if (item.type && (
        item.type === 'Treatment / Facial' || 
        item.type === 'Treatment / Injection' || 
        item.type === 'Treatment / Other'
      )) {
        return '#8B5CF6'; // Purple color for treatments
      }
      return colors.primary;
    };

    // Determine icon library based on item type
    const getItemIconLibrary = (): 'MaterialCommunityIcons' | 'Lucide' => {
      return 'MaterialCommunityIcons';
    };

    return (
        <ListItem
          title={item.name}
          subtitle={usageDuration || 'Recently added'}
          description={item.type}
          icon={getItemIcon()}
          iconColor={getItemIconColor()}
          iconLibrary={getItemIconLibrary()}
          chips={chips as any}
          showChevron={false}
          onPress={() => handleEditItem(item)}
          dateInfo={dateInfo as any}
        />
    );
  };

  // Delete handler
  const handleDeleteItemRequest = (itemToDelete: RoutineItem): void => {
    if (!itemToDelete) return;

    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${itemToDelete.name}"? This cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await deleteRoutineItem(itemToDelete.id) as ApiResponse;
              
              if (response.success) {
                // Refetch all routine items to ensure consistency
                await fetchRoutineItems();
                closeModal();
                Alert.alert("Success", "Item deleted successfully");
              }
            } catch (error: any) {
              console.error('🔴 MyRoutine: Error deleting item:', error);
              Alert.alert("Error", error.message || "Could not delete the routine item.");
            } finally {
              setIsDeleting(false);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // --- Group items into sections using useMemo ---
  const routineSections = useMemo((): RoutineSection[] => {
    if (!routineItems || routineItems.length === 0) {
      return [];
    }

    // Filter out stopped items for active routines
    const activeItems = routineItems.filter(item => !item.dateStopped || new Date(item.dateStopped) > new Date());

    // Define desired order
    const sectionOrder = ['Daily', 'Weekly', 'As needed'];
    const grouped: { [key: string]: RoutineItem[] } = {
      'Daily': [],
      'Weekly': [],
      'As needed': [],
    };

    activeItems.forEach(item => {
      // Check if this is a treatment type
      const isTreatment = item.type && (
        item.type === 'Treatment / Facial' || 
        item.type === 'Treatment / Injection' || 
        item.type === 'Treatment / Other'
      );
      
      if (isTreatment) {
        // All treatments go to "As needed" section
        grouped['As needed'].push(item);
      } else {
        // Non-treatments use their frequency
        const freq = item.frequency || 'As needed';
        if (grouped[freq]) {
          grouped[freq].push(item);
        } else {
          grouped['As needed'].push(item);
        }
      }
    });

    // --- Sort within groups and create sections --- 
    const sections = sectionOrder
      .map(title => {
        const items = grouped[title];

        const usageOrder: { [key: string]: number } = { 'AM': 1, 'Both': 2, 'PM': 3 };

        items.sort((a, b) => {
          const usageA = a.usage || 'Both'; 
          const usageB = b.usage || 'Both';
          const orderA = usageOrder[usageA] || 2; 
          const orderB = usageOrder[usageB] || 2;
          if (orderA === orderB) {
             // Sort by creation date descending (newest first) if usage is same
             const dateA = a.dateCreated?.getTime?.() || 0;
             const dateB = b.dateCreated?.getTime?.() || 0;
             return dateB - dateA; 
          }
          return orderA - orderB;
        });

        return {
          title: title.toUpperCase(),
          data: items,
        };
      })
      .filter(section => section.data.length > 0);

    return sections;

  }, [routineItems]);

  // Function to navigate to update screen - always go to edit routine screen
  const openEditModal = (item: RoutineItem): void => {
    console.log('🟡 openEditModal - item:', item);
    
    // Always navigate to update routine screen, but pass UPC data if available
    const itemData = {
      name: item.name || '',
      type: item.type || 'Product',
      usage: item.usage || 'AM',
      frequency: item.frequency || 'Daily',
      concerns: item.concerns || [],
      dateStarted: item.dateStarted || null,
      dateStopped: item.dateStopped || null,
      stopReason: item.stopReason || '',
      dateCreated: item.dateCreated || new Date().toISOString(),
      upc: item.upc || null, // Include UPC if available
      productData: item.upc ? {
        product_name: item.name,
        brand: item.extra?.brand || 'Unknown',
        upc: item.upc,
        ingredients: item.extra?.ingredients || [],
        good_for: item.extra?.good_for || []
      } : null
    };

    (navigation as any).navigate('UpdateRoutine', {
      itemId: item.id,
      itemData: JSON.stringify(itemData)
    });
  };

  // Function to close modal and reset state
  const closeModal = (): void => {
    setIsSaving(false);
    setIsModalVisible(false);
    setEditingItem(null);
    setNewItemName('');
    setNewItemType('Product'); // Set default type to avoid validation error
    setNewItemUsage(['AM']);
    setNewItemFrequency('Daily');
    setNewItemDateStarted(null); 
    setNewItemDateStopped(null); 
    setNewItemConcerns([]);
    setIsStopped(false);
    setStopReason('');
    setShowStopDatePicker(false);
    setShowStartDatePicker(false);
    setCurrentStep(1);
  };

  // Update the openAddModalWithFrequency function to navigate to new screen
  const openAddModalWithFrequency = (frequency: string): void => {
    // Map section titles to frequency values
    let mappedFrequency: string;
    switch (frequency.toLowerCase()) {
      case 'daily':
        mappedFrequency = 'Daily';
        break;
      case 'weekly':
        mappedFrequency = 'Weekly';
        break;
      case 'as needed':
        mappedFrequency = 'As needed';
        break;
      default:
        mappedFrequency = frequency; // fallback to original value
    }

    // Navigate to create routine screen with frequency pre-selected
    (navigation as any).navigate('CreateRoutine', {
      frequency: mappedFrequency
    });
  };

  // Also update the regular openAddModal function to navigate to new screen
  const openAddModal = (): void => {
    // Navigate to create routine screen
    (navigation as any).navigate('CreateRoutine');
  };

  // Update the renderSectionHeader function
  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }): React.JSX.Element => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderContent}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionHeaderText}>{title}</Text>
          <View style={styles.sectionHeaderLine} />
        </View>
        <TouchableOpacity
          style={styles.sectionAddButton}
          onPress={() => openAddModalWithFrequency(title)}
        >
          <Plus 
            size={16} 
            color={"#fff"} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );



  // --- Select Static Message for AiMessageCard ---
  const getStaticRoutineMessage = (count: number): string => {
    if (count === 0) {
      return staticAiMessages.find(m => m.numItems === 0)?.msg || "Add your first routine item!";
    }
    if (count === 1) {
      return staticAiMessages.find(m => m.numItems === 1)?.msg || "Add another item!";
    }
    // Use threshold for 2 or 3 items
    if (count <= 3) { 
      return staticAiMessages.find(m => m.numItems === 3)?.msg || "Keep building your routine!";
    }
    // Handle > 3 items ("full" routine)
    const fullMessages = staticAiMessages.find(m => Array.isArray(m.msgs))?.msgs;
    if (fullMessages && fullMessages.length > 0) {
      // Return a random message from the list
      return fullMessages[Math.floor(Math.random() * fullMessages.length)];
    } 
    // Default fallback if structure is wrong or no messages defined
    return "You've built a great routine!"; 
  };

  // Calculate the message based on current routineItems length
  const routineMessage = useMemo(() => getStaticRoutineMessage(routineItems.length), [routineItems.length]);

  // --- Layout Handler for Fixed Card ---
  const handleCardLayout = (event: any): void => {
    const { height } = event.nativeEvent.layout;
    // Update state only if height is positive and different from current
    // Add a small buffer (e.g., 50 pixels) to prevent content potentially clipping
    const newHeight = height + 50; 
    if (height > 0 && newHeight !== fixedCardHeight) {
      setFixedCardHeight(newHeight);
    }
  };

  // Add back the handleEditItem function:
  const handleEditItem = (item: RoutineItem): void => {
    openEditModal(item);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={styles.centered} />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  return (
    <View style={styles.container}>
      {routineSections.length === 0 ? (
      <View style={styles.emptyListTopContainer}>
        <TouchableOpacity
            style={styles.motivationalCard}
          activeOpacity={0.85}
          onPress={handleNavigateToChat}
        >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>a</Text>
            </View>
            <Text style={styles.motivationalText}>
              {"Let's get started! Tell me about your current routine."}
            </Text>
            <Plus
              size={24}
              color={colors.primary}
              style={styles.arrowIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={openAddModal} style={{  padding: 16, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{color: colors.primary, fontSize: 16, fontWeight: '500'}}>+ Add a routine item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
        <SectionList
          style={styles.sectionsList}
          sections={routineSections}
          renderItem={renderRoutineItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContentContainerBase,
            { paddingBottom: insets.bottom + fixedCardHeight }
          ]}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={() => (
            <>
              {/* Archived Section */}
              {routineItems.some(item => item.dateStopped && new Date(item.dateStopped) <= new Date()) && (
                <TouchableOpacity
                  style={styles.archivedSection}
                  onPress={() => (navigation as any).navigate('ArchivedRoutines')}
                >
                  <View style={styles.archivedContent}>
                    <Archive 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                    <Text style={styles.archivedText}>Previously used products</Text>
                    <ChevronRight 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </View>
                </TouchableOpacity>
              )}
            </>
          )}
        />
  {/* 
          {routineItems.length > 0 && ( */}
          <TouchableOpacity style={{padding: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'red', borderRadius: 16, borderWidth: 1, borderColor: colors.primary, }} onPress={openAddModal}>
            <Text style={{color: colors.primary, fontSize: 16, fontWeight: '500'}}>Add to your routine</Text>
          </TouchableOpacity>
        {/* )} */}
        
        {/* Fixed AI Message Card */}
        <View style={styles.fixedCardWrapper} onLayout={handleCardLayout}>
          <AiMessageCard
            overrideText={routineMessage}
            actions={[
              { label: "Tell me more about your routine", onPress: handleNavigateToChat },
            ] as any}
            disableNavigation={true}
            fixedToBottom={true}
          />
        </View>
        </>
      )}

    </View>
  );
});

export default MyRoutine;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionsList: {
    flex: 1,
    
  },
  listContentContainerBase: {
    paddingTop: spacing.lg,
    paddingBottom: 200,
    paddingHorizontal: 20,
  },
  emptyListTopContainer: {
    paddingTop: 24,
    alignItems: 'stretch',
    paddingHorizontal: 0,
  },
  emptyListText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textMicrocopy,
    textAlign: 'center',
  },
  emptyListSubText: {
    ...typography.caption,
    color: colors.textMicrocopy,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sectionHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xs,
    backgroundColor: '#FFF',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: spacing.sm,
  },
  sectionAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    borderRadius: 8,
    borderTopWidth: 1,
    borderColor: palette.gray4,
  },
  itemIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemMicrocopyText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  concernChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  itemChipContainer: {
    marginLeft: spacing.sm,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalInputContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalHeaderTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#8B7355',
    paddingBottom: 8,
    minHeight: 44,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 4,
    minHeight: 44,
  },
  chipSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    //minHeight: 52,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  chipButtonActive: {
    backgroundColor: '#8B7355',
    borderColor: '#8B7355',
    shadowColor: '#8B7355',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  chipButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  chipButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateInputButton: {
    flex: 1,
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
  },
  dateTextPlaceholder: {
    color: '#9CA3AF',
  },
  routineItemContainer: {
    marginBottom: 12, 
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  fixedCardWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 150,
    backgroundColor: 'transparent',
  },

  motivationalCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 5,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarCircle: {
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  motivationalText: {
    fontSize: 13,
    flex: 1,
    color: colors.textPrimary,
  },
  arrowIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  //  marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#8B7355',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8B7355',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  archivedSection: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 20,
    marginTop: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  archivedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  archivedText: {
    flex: 1,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: 12,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepTextActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    //minHeight: 300,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
});
