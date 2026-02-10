// MyRoutine.tsx
// Component to display and manage the user's routine items

import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, Image, Modal } from 'react-native';
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
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
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
  concern_tracking?: any[]; // Array of concern tracking data
  dateStarted: Date | null;
  dateStopped: Date | null;
  treatmentDate: Date | null;
  stopReason: string;
  dateCreated: Date;
  is_tracking_paused: boolean;
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

interface MyRoutineProps { }

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

// Skeleton Component
const RoutineSkeleton = () => (
  <View style={{ paddingHorizontal: 16 }}>
    {/* Header Skeleton */}
    <SkeletonPlaceholder borderRadius={4}>
      <SkeletonPlaceholder.Item flexDirection="row" justifyContent="space-between" alignItems="center" marginTop={20} marginBottom={40}>
        <SkeletonPlaceholder.Item width={120} height={14} />
        <SkeletonPlaceholder.Item width={80} height={14} />
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>

    {/* Section Header Skeleton */}
    {/* <SkeletonPlaceholder borderRadius={4}>
      <SkeletonPlaceholder.Item width={60} height={12} marginBottom={10} />
    </SkeletonPlaceholder> */}

    {/* Items Skeleton */}
    {[1, 2, 3].map((item) => (
      <SkeletonPlaceholder key={item} borderRadius={4}>
        <SkeletonPlaceholder.Item
          flexDirection="row"
          alignItems="center"
          marginTop={10}
          marginBottom={12}
          borderRadius={12}
        >
          {/* <SkeletonPlaceholder.Item width={40} height={40} borderRadius={8} marginRight={12} /> */}
          <SkeletonPlaceholder.Item flex={1}>
            <SkeletonPlaceholder.Item width={100} height={14} marginBottom={6} />
            <SkeletonPlaceholder.Item width={"100%"} height={102} />
          </SkeletonPlaceholder.Item>
          {/* <SkeletonPlaceholder.Item width={20} height={20} borderRadius={10} /> */}
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder>
    ))}
  </View>
);

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

  // State for Add Routine Sheet
  const [showAddRoutineSheet, setShowAddRoutineSheet] = useState<boolean>(false);

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

    // Helper to get date from root level only
    const getDate = (dateValue: any): Date | null => {
      if (!dateValue) return null;
      try {
        return new Date(dateValue);
      } catch (e) {
        return null;
      }
    };

    return {
      id: apiItem.id,
      name: apiItem.name,
      type: typeMap[apiItem.type] || apiItem.type,
      usage: usageMap[apiItem.usage] || apiItem.usage,
      frequency: frequencyMap[apiItem.frequency] || apiItem.frequency,
      concerns: apiItem.concern || [],
      concern_tracking: apiItem.concern_tracking || [],
      dateStarted: getDate(apiItem.start_date),
      dateStopped: getDate(apiItem.end_date),
      treatmentDate: getDate(apiItem.treatment_date),
      is_tracking_paused: apiItem.is_tracking_paused,
      stopReason: apiItem.end_reason || '',
      dateCreated: getDate(apiItem.dateCreated) || new Date(),
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
        // console.log('🔄 MyRoutine: Fetch already in progress, skipping...');
        return;
      }

      try {
        fetchInProgressRef.current = true;
        hasAttemptedFetchRef.current = true; // Mark that we've attempted to fetch
        setLoading(true);
        setError(null);

        const response = await getRoutineItems() as ApiResponse;

        if (response.success && response.data) {
          // console.log('🔄 MyRoutine: Routine items fetchedHHHHHHHHH:', response.data);
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
        // console.error('🔴 MyRoutine: Error fetching routine items:', err);

        // Handle specific error types
        if (err.message === 'DUPLICATE_REQUEST' || err.message === 'REQUEST_IN_PROGRESS') {
          // console.log('🔄 MyRoutine: Request in progress, will retry shortly...');
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
      // console.log('🔄 MyRoutine: Refetching routines from parent');
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
          // console.log('🔄 MyRoutine: Screen focused, refetching routines...', {
          //   hasAttempted: hasAttemptedFetchRef.current,
          //   shouldRefetchOnFocus: shouldRefetchOnFocusRef.current,
          //   hasData: routineItems.length > 0,
          //   isLoading: loading
          // });
          fetchRoutineItems();
        } else {
          // console.log('🔄 MyRoutine: Screen focused, no need to refetch', {
          //   hasAttempted: hasAttemptedFetchRef.current,
          //   shouldRefetchOnFocus: shouldRefetchOnFocusRef.current,
          //   hasData: routineItems.length > 0,
          //   isLoading: loading
          // });
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
      // console.error("MyRoutine: Error creating or navigating to routine chat:", error);
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
        // console.log('🟡 MyRoutine: Update response:', response);

        if (response.success) {
          // Refetch all routine items to ensure consistency
          await fetchRoutineItems();
          Alert.alert('Success', 'Item updated successfully');
        }
      } else {
        // Create new item
        const response = await createRoutineItem(apiItemData) as ApiResponse;
        // console.log('🟡 MyRoutine: Create response:', response);

        if (response.success) {
          // Refetch all routine items to ensure consistency
          await fetchRoutineItems();
          Alert.alert('Success', 'Item added successfully');
        }
      }
      closeModal();
    } catch (err: any) {
      // console.error('🔴 MyRoutine: Error saving item:', err);
      Alert.alert('Error', err.message || 'Failed to save item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render individual routine item
  const renderRoutineItem = ({ item }: { item: RoutineItem }): React.JSX.Element => {
    // console.log("🔵 renderRoutineItem - item:", item);
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
      if (item.type === 'Product' || item.type === 'Nutrition') {
        dateInfo = `You started using this product on ${formattedDate}`;
      } else if (item.type === 'Activity') {
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
      if (item.type === 'Product' || item.type === 'Nutrition') {
        dateInfo = `You started using this product on ${formattedStartDate} and stopped on ${formattedStopDate}`;
      } else if (item.type === 'Activity') {
        dateInfo = `You started this activity on ${formattedStartDate} and stopped on ${formattedStopDate}`;
      }
    }

    // console.log('item', item);

    // Determine tracking text for Product type only
    let trackingText: string | null = null;
    if (item.type === 'Product') {
      const hasTracking = item.concern_tracking && item.concern_tracking.length > 0;
      const isTrackingPaused = item.is_tracking_paused;

      if (!hasTracking || isTrackingPaused) {
        // Tracking not started or paused
        trackingText = 'Start effectiveness tracking';
      } else {
        // Check if all concerns tracking is completed
        const allCompleted = item.concern_tracking?.some((tracking: any) => tracking.is_completed === true);
        if (allCompleted) {
          trackingText = 'Review effectiveness tracking';
        } else {
          trackingText = 'Effectiveness tracking in progress';
        }
      }
    }

    // Get brand name if available
    const brandName = item.extra?.brand || 'CERAVE';

    const renderItemImage = () => (
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80' }}
        style={styles.itemImage}
      />
    );

    return (
      <TouchableOpacity
        style={styles.routineItemCard}
        onPress={() => item && handleNavigateToProductDetail(item)}
        activeOpacity={0.9}
      >
        {/* <View style={styles.itemImageContainer}>
          {renderItemImage()}
        </View> */}

        <View style={styles.itemContentContainer}>
          <Text style={styles.brandText}>{brandName}</Text>
          <Text style={styles.itemNameText}>{item.name}</Text>

          <Text style={styles.usageText}>
            Using <Text style={styles.usageBoldText}>{item.frequency} / {displayUsage}</Text> since <Text style={styles.usageBoldText}>{item.dateStarted ? new Date(item.dateStarted).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 1, 2024'}</Text>
          </Text>

          <TouchableOpacity style={styles.effectivenessContainer}>
            <Text style={styles.effectivenessText}>
              EFFECTIVENESS <Text style={styles.effectivenessStatus}>Review in 3 weeks</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chevronContainer}>
          <ChevronRight size={20} color="#D6D3D1" />
        </View>
      </TouchableOpacity>
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
    const sectionOrder = ['Daily', 'Weekly', 'Treatments'];
    const grouped: { [key: string]: RoutineItem[] } = {
      'Daily': [],
      'Weekly': [],
      'Treatments': [],
    };

    activeItems.forEach(item => {
      // Check if this is a treatment type
      const isTreatment = item.type && (
        item.type === 'Treatment / Facial' ||
        item.type === 'Treatment / Injection' ||
        item.type === 'Treatment / Other'
      );

      if (isTreatment) {
        grouped['Treatments'].push(item);
      } else {
        // Non-treatments use their frequency
        const freq = item.frequency || 'Daily';
        if (freq === 'Daily') {
          grouped['Daily'].push(item);
        } else if (freq === 'Weekly') {
          grouped['Weekly'].push(item);
        } else {
          // Fallback for 'As needed' or others -> grouping with Weekly for now or create another
          grouped['Weekly'].push(item);
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

        // Map section title for display
        let displayTitle = title;
        if (title === 'As needed') {
          // Determine if these are treatments or actual 'As needed' products
          // simple heuristic: if mostly treatments, call it treatments, else weekly/as needed
          // For now, based on requirement, let's look at grouping logic again.
          // We put treatments in 'As needed' bucket in the loop above.
          // Let's refine the bucket name in the loop.
        }

        return {
          title: title.toUpperCase(),
          data: items,
        };
      })
      .filter(section => section.data.length > 0);

    return sections;

    return sections;

  }, [routineItems]);

  // Function to navigate to product detail screen - always navigate to ProductDetail
  const handleNavigateToProductDetail = (item: RoutineItem): void => {
    // Always navigate to product detail screen, with or without UPC
    (navigation as any).navigate('ProductDetail', {
      itemId: item.id,
      productData: {
        product_name: item.name,
        brand: item.extra?.brand,
        upc: item.upc || undefined,
        ingredients: item.extra?.ingredients || [],
        good_for: item.extra?.good_for || []
      },
      routineData: {
        name: item.name,
        type: item.type,
        usage: item.usage,
        frequency: item.frequency,
        concerns: item.concerns || [],
        concern_tracking: item.concern_tracking || [],
        dateStarted: item.dateStarted,
        dateStopped: item.dateStopped,
        stopReason: item.stopReason,
        extra: item.extra || {},
        is_tracking_paused: item.is_tracking_paused
      },
      upc: item.upc || undefined
    });
  };

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

  // Open the add routine sheet
  const openAddModal = (): void => {
    setShowAddRoutineSheet(true);
  };

  // Handle add product from sheet
  const handleAddProduct = (): void => {
    setShowAddRoutineSheet(false);
    (navigation as any).navigate('FindProduct');
  };

  // Handle add treatment from sheet
  const handleAddTreatment = (): void => {
    setShowAddRoutineSheet(false);
    (navigation as any).navigate('CreateRoutine', { type: 'Treatment' });
  };

  // Update the renderSectionHeader function
  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }): React.JSX.Element => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderContent}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionHeaderText}>{title}</Text>
          <View style={styles.sectionHeaderLine} />
        </View>
        {/* <TouchableOpacity
          style={styles.sectionAddButton}
          onPress={() => openAddModalWithFrequency(title)}
        >
          <Plus
            size={16}
            color={"#fff"}
          />
        </TouchableOpacity> */}
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

  // --- List Header Component ---
  const RoutineListHeader = (): React.JSX.Element => {
    const totalProducts = routineItems.filter(item =>
      !item.dateStopped && item.type.toLowerCase() === 'product'
    ).length;
    const totalTreatments = routineItems.filter(item =>
      !item.dateStopped && item.type.toLowerCase().includes('treatment')
    ).length;

    return (
      <View style={styles.listHeaderContainer}>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {totalProducts} Total Products, {totalTreatments} Treatment
          </Text>
          <TouchableOpacity onPress={openAddModal}>
            <Text style={styles.addLinkText}>+ Add to routine</Text>
          </TouchableOpacity>
        </View>

        {/* Archived Section Card */}
        {routineItems.some(item => item.dateStopped && new Date(item.dateStopped) <= new Date()) && (
          <TouchableOpacity
            style={styles.archivedCard}
            onPress={() => (navigation as any).navigate('ArchivedRoutines')}
            activeOpacity={0.9}
          >
            <View style={styles.archivedIconContainer}>
              <Archive size={26} color="#717680" />
            </View>
            <View style={styles.archivedCardContent}>
              <Text style={styles.archivedCardTitle}>Previously used products</Text>
              <Text style={styles.archivedCardSubtitle}>
                {routineItems.filter(item => item.dateStopped && new Date(item.dateStopped) <= new Date()).length} archived items
              </Text>
            </View>
            <ChevronRight size={20} color="#D6D3D1" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // --- List Footer Component ---
  const RoutineListFooter = (): React.JSX.Element => (
    <View style={styles.listFooterContainer}>
      <TouchableOpacity
        style={styles.letsGetStartedCard}
        activeOpacity={0.85}
        onPress={handleNavigateToChat}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={require('../../assets/images/amber-avatar-new.png')}
            style={styles.avatarImageLarge}
            resizeMode="contain"
          />
        </View>
        <View style={styles.letsGetStartedContent}>
          <Text style={styles.letsGetStartedTitle}>Let’s get started!</Text>
          <Text style={styles.letsGetStartedText}>
            Chat with me here to add your current skincare routine — or fill it in manually by tapping the add button.
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.mainAddButton}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <Text style={styles.mainAddButtonText}>Add to routine</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && routineItems.length === 0 ? (
        <RoutineSkeleton />
      ) : (
        <SectionList
          style={styles.sectionsList}
          sections={routineSections}
          renderItem={renderRoutineItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContentContainerBase,
            { paddingBottom: insets.bottom + 100 }
          ]}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={RoutineListHeader}
          ListFooterComponent={RoutineListFooter}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add to Routine Bottom Sheet */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddRoutineSheet}
        onRequestClose={() => setShowAddRoutineSheet(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowAddRoutineSheet(false)}
        >
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={handleAddProduct}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetOptionText}>Add a Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={handleAddTreatment}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetOptionText}>Add a Treatment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCancelButton}
              onPress={() => setShowAddRoutineSheet(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

export default MyRoutine;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  sectionsList: {
    flex: 1,
  },
  listContentContainerBase: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },

  // --- List Header ---
  listHeaderContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    // paddingBottom: spacing.sm,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    //marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: 13,
    color: '#717680', // Stone 500
    fontWeight: '500',
  },
  addLinkText: {
    fontSize: 15,
    color: '#00839B', // Teal 600
    fontWeight: '600',
  },
  archivedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9EAEB',
    borderRadius: 16,
    padding: 8,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  archivedIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    // backgroundColor: '#F5F5F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  archivedCardContent: {
    flex: 1,
  },
  archivedCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
    marginBottom: 2,
  },
  archivedCardSubtitle: {
    fontSize: 13,
    color: '#78716C',
  },
  // Keep old styles for backward compatibility
  archivedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  archivedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  archivedText: {
    fontSize: 14,
    color: '#78716C',
    marginLeft: 6,
  },

  // --- Section Header ---
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: '#FAFAF9', // Match background
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#79716B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderLine: {
    display: 'none',
  },
  sectionAddButton: {
    display: 'none',
  },

  // --- Routine Item Card ---
  routineItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start', // Align top
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImageContainer: {
    marginRight: 16,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F5F5F4',
  },
  itemContentContainer: { // Renamed from itemIconContainer/itemTextContainer
    flex: 1,
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#57534E',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  itemNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 4,
    lineHeight: 22,
  },
  usageText: {
    fontSize: 13, // Smaller text
    color: '#78716C',
    marginBottom: 12,
  },
  usageBoldText: {
    fontWeight: '700',
    color: '#78716C',
  },
  effectivenessContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  effectivenessText: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  effectivenessStatus: {
    color: '#57534E',
    fontWeight: '600',
  },
  chevronContainer: {
    justifyContent: 'flex-start',
    paddingLeft: 8,
    paddingTop: 0, // Align with top content
  },

  // --- List Footer (Let's get started) ---
  listFooterContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: spacing.xl,
  },
  letsGetStartedCard: {
    backgroundColor: '#EBE9FE', // Indigo 50
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarImageLarge: {
    width: 40,
    height: 40,
  },
  letsGetStartedContent: {
    flex: 1,
  },
  letsGetStartedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#404968', // Indigo 950
    marginBottom: 4,
  },
  letsGetStartedText: {
    fontSize: 14,
    color: '#5D6B98', // Indigo 700
    lineHeight: 20,
  },
  mainAddButton: {
    backgroundColor: '#E9EAEB', // Neutral 200/300ish
    borderRadius: 18, // Pill shape
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainAddButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#57534E',
  },

  // --- Modal Styles (Preserved) ---
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
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  chipButtonActive: {
    backgroundColor: '#8B7355',
    borderColor: '#8B7355',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
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

  // Add Routine Sheet Styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 60,
    height: 4,
    backgroundColor: '#D9D9D9',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetOption: {
    backgroundColor: '#E9EAEB',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#535862',
  },
  sheetCancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  sheetCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#535862',
  },
});
