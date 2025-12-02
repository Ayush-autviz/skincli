// MetricsSheet.tsx
// Bottom sheet component displaying metrics (props) and sticky AI insights header (context)

/* ------------------------------------------------------
WHAT IT DOES
- Displays sticky AI insights header using <AiMessageCard /> (which uses Contexts) when analysis is running/complete.
- Displays scrollable skin metrics passed via `metrics` prop below the header.
- Handles different parent states: loading, analyzing, complete, no results, low_quality.
- Supports swipe up/down and tap to expand/collapse.

CONTEXTS USED:
- AiMessageCard internally uses PhotoContext and ThreadContext.

PROPS USED:
- metrics: Object containing metrics data (passed from SnapshotScreen).
- uiState, viewState: Control display and behavior.
- onDelete, onViewStateChange, onTryAgain: Callbacks.
------------------------------------------------------*/

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
  Image
} from 'react-native';
import { ChevronRight, ChevronLeft, AlertCircle, AlertTriangle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { usePhotoContext } from '../../contexts/PhotoContext';
import AiMessageCard from '../chat/AiMessageCard'; // Import AiMessageCard
import palette from '../../styles/palette'; // Import palette for consistent colors
import useAuthStore from '../../stores/authStore';

import { sendSnapshotFirstChat, getImageChatSummary } from '../../utils/newApiService';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Define our snap points
const SNAP_POINTS = {
  COLLAPSED: 30,   // 30% height (normal view)
  EXPANDED: 80,    // 80% height (metrics view)
  MINIMIZED: 10    // 10% height (zooming mode)
};

// Type definitions
interface MetricsData {
  [key: string]: string | number;
}

interface PhotoData {
  imageId?: string;
  maskResults?: any;
  maskImages?: any;
  metrics?: MetricsData;
}

interface User {
  user_name?: string;
}

interface Profile {
  user_name?: string;
  age?: number;
  skinType?: string;
  concerns?: { [key: string]: boolean };
}

interface AuthStore {
  user?: User;
  profile?: Profile;
}

interface MetricsSheetProps {
  metrics?: MetricsData;
  photoData?: PhotoData;
  uiState: 'loading' | 'analyzing' | 'complete' | 'no_results' | 'low_quality';
  viewState: 'default' | 'metrics' | 'zooming';
  onDelete?: () => void;
  onViewStateChange?: (viewState: string) => void;
  onTryAgain?: () => void;
}

interface MetricsSheetRef {
  setSheetPosition: (positionName: string) => void;
}

interface MetricTag {
  tag: string;
  color: string;
  bg: string;
}

interface ChatData {
  imageId: string;
  firstName: string;
  age: number;
  skinType: string;
  skinConcerns: string[];
  excludedMetrics: any[];
  metrics: MetricsData;
}

const MetricsSheet = forwardRef<MetricsSheetRef, MetricsSheetProps>(({
  metrics,
  photoData,
  uiState,
  viewState,
  onDelete,
  onViewStateChange,
  onTryAgain
}, ref) => {
  const photoContext = usePhotoContext();
  const selectedSnapshot = photoContext?.selectedSnapshot; // Get snapshot for threadId
  const { user, profile } = useAuthStore();
  const navigation = useNavigation();
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  // --- Guard Check (Only for threadId, metrics come from props) ---
  if (!selectedSnapshot) {
    console.log('⚠️ MetricsSheet: No selectedSnapshot available');
  }

  console.log('🔵 MetricsSheet - photoData:', photoData);
  
  // Derive threadId safely
  // const threadId = selectedSnapshot?.threadId;
  
  // --- Hooks for Sheet Animation & State ---
  const sheetPosition = useRef(new Animated.Value(SNAP_POINTS.COLLAPSED)).current;
  const [currentSnapPoint, setCurrentSnapPoint] = useState(SNAP_POINTS.COLLAPSED);
  
  // Log important state changes
  useEffect(() => {
    // Track internal state changes
    console.log('🔵 MetricsSheet - photoData contains maskImages:', !!photoData?.maskImages);
    if (photoData?.maskImages) {
      console.log('🔵 MetricsSheet - Available mask conditions:', Object.keys(photoData.maskImages));
    }
  }, [currentSnapPoint, viewState, photoData]);

  // Fetch summary when photoData changes
  useEffect(() => {
    if (photoData && uiState === 'complete') {
      // const imageId = photoData.id || photoData.image_id;
      const imageId = photoData.imageId;

      console.log('🔵 MetricsSheet - imageId:', imageId);
      
      if (imageId) {
        setSummaryLoading(true);
        getImageChatSummary(imageId)
          .then(response => {
            if (response.summary) {
              console.log('🔵 Summary successful, setting summary:', response.summary);
              setSummary(response.summary);
            } else {
              setSummary(null);
              console.log('🔵 Summary not successful, calling snapshot first chat API...');
              
              // Call snapshot first chat API when summary fails
              const user = useAuthStore.getState().user;
              const profile = useAuthStore.getState().profile;
              
              console.log('🔵 user in MetricsSheet:', user);
              console.log('🔵 profile in MetricsSheet:', profile);
              console.log('🔵 imageId in MetricsSheet:', imageId);
              
              // Prepare chat data
              const chatData: ChatData = {
                imageId: imageId,
                firstName: user?.user_name || profile?.user_name || 'User',
                age: profile?.age || 25, // Default age if not available
                skinType: profile?.skinType || 'normal', // Default skin type
                skinConcerns: profile?.concerns ? Object.keys(profile.concerns).filter(key => profile.concerns![key]) : [],
                excludedMetrics: [], // Empty array for now
                metrics: photoData?.metrics || {}
              };
              
              console.log('🔵 Chat data prepared in MetricsSheet:', chatData);
              
              sendSnapshotFirstChat(chatData)
                .then(chatResponse => {
                  console.log('✅ Snapshot first chat API response in MetricsSheet:', chatResponse);
                  
                  // Store AI feedback from response
                  if (chatResponse.success && chatResponse.data) {
                    setSummary(chatResponse.data.message || chatResponse.data.feedback);
                    console.log('✅ AI feedback stored in MetricsSheet:', chatResponse.data.message || chatResponse.data.feedback);
                  }
                })
                .catch(chatError => {
                  console.error('🔴 Snapshot first chat API error in MetricsSheet:', chatError);
                });
            }
          })
          .catch(error => {
            console.error('Error fetching summary:', error);
            setSummary(null);
          })
          .finally(() => {
            setSummaryLoading(false);
          });
      } else {
        setSummary(null);
        setSummaryLoading(false);
      }
    } else {
      setSummary(null);
      setSummaryLoading(false);
    }
  }, [photoData, uiState]);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    setSheetPosition: (positionName: string) => {
      const position = 
        positionName === 'expanded' ? SNAP_POINTS.EXPANDED :
        positionName === 'minimized' ? SNAP_POINTS.MINIMIZED : 
        SNAP_POINTS.COLLAPSED;
      
      snapTo(position, { skipStateChange: true });
    }
  }));
  
  // Function to snap to a position with animation
  const snapTo = useCallback((position: number, options: { skipStateChange?: boolean } = {}) => {
    // Update local state first
    setCurrentSnapPoint(position);
    
    // Animate to that position
    Animated.spring(sheetPosition, {
      toValue: position,
      friction: 8,
      tension: 40,
      useNativeDriver: false // Can't use native driver for layout properties
    }).start(() => {
      // Only notify parent of state change if not skipping
      if (!options.skipStateChange) {
        const newViewState = 
          position === SNAP_POINTS.EXPANDED ? 'metrics' :
          position === SNAP_POINTS.MINIMIZED ? 'zooming' : 'default';
        
        if (newViewState !== viewState) {
          onViewStateChange?.(newViewState);
        }
      }
    });
  }, [sheetPosition, viewState, onViewStateChange]);

  // Toggle between collapsed and expanded states when handle is tapped
  const toggleExpanded = useCallback(() => {
    // If in zooming state, request exit zoom
    if (viewState === 'zooming') {
      onViewStateChange?.('default');
      return;
    }
    
    // Otherwise toggle between collapsed and expanded
    const nextPosition = currentSnapPoint === SNAP_POINTS.EXPANDED 
      ? SNAP_POINTS.COLLAPSED 
      : SNAP_POINTS.EXPANDED;
    snapTo(nextPosition);
  }, [viewState, currentSnapPoint, onViewStateChange, snapTo]);
  
  // Set up pan responder for drag gestures - UPDATED to be conditional
  const panResponder = useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gestureState) => {
        // Only handle initial touches on drag handle or when in collapsed state
        return viewState !== 'metrics' || gestureState.y0 < 50; // Assuming drag handle height is about 50px
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // In metrics view state, only capture gestures on the drag handle
        if (viewState === 'metrics') {
          // Only respond to gestures starting from the drag handle area
          return gestureState.y0 < 50 && Math.abs(gestureState.dy) > 10;
        }
        
        // In other states, capture vertical gestures anywhere on the sheet
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // If in zooming state, tapping on sheet should exit zoom
        if (viewState === 'zooming' && Math.abs(gestureState.dy) < 10) {
          return;
        }
        
        // Convert gesture to a sheet position
        const startPosition = currentSnapPoint;
        const dragDelta = -gestureState.dy / SCREEN_HEIGHT * 100 * 0.5;
        let newPosition = startPosition + dragDelta;
        
        // Clamp position to valid range with some elasticity
        newPosition = Math.max(SNAP_POINTS.MINIMIZED * 0.8, 
                       Math.min(SNAP_POINTS.EXPANDED * 1.05, newPosition));
        
        // Update position
        sheetPosition.setValue(newPosition);
      },
      onPanResponderRelease: (_, gestureState) => {
        // Handle tap on sheet during zoom mode
        if (viewState === 'zooming' && Math.abs(gestureState.dy) < 10) {
          onViewStateChange?.('default');
          return;
        }
        
        // For actual dragging gestures:
        // Determine which snap point to go to based on velocity & position
        const VELOCITY_THRESHOLD = 0.5;
        
        if (Math.abs(gestureState.vy) > VELOCITY_THRESHOLD) {
          // Fast gesture - go in direction of gesture
          if (gestureState.vy < 0) {
            // Swiping up - expand
            snapTo(SNAP_POINTS.EXPANDED);
          } else {
            // Swiping down - collapse
            snapTo(SNAP_POINTS.COLLAPSED);
          }
          return;
        }
        
        // Slower gesture - determine closest snap point
        const distToCollapsed = Math.abs(currentSnapPoint - SNAP_POINTS.COLLAPSED);
        const distToExpanded = Math.abs(currentSnapPoint - SNAP_POINTS.EXPANDED);
        const distToMinimized = Math.abs(currentSnapPoint - SNAP_POINTS.MINIMIZED);
        
        if (distToExpanded <= distToCollapsed && distToExpanded <= distToMinimized) {
          snapTo(SNAP_POINTS.EXPANDED);
        } else if (distToCollapsed <= distToMinimized) {
          snapTo(SNAP_POINTS.COLLAPSED);
        } else {
          snapTo(SNAP_POINTS.MINIMIZED);
        }
      }
    }), [viewState, currentSnapPoint, onViewStateChange, snapTo, sheetPosition]
  );

  // Helper function to get tag based on metric value
  const getMetricTag = (value: number): MetricTag => {
    if (value >= 70) return { tag: 'GOOD', color: '#2e7d32', bg: '#e6f4ea' };
    if (value < 50) return { tag: 'BAD', color: '#c62828', bg: '#fdecea' };
    return { tag: 'FAIR', color: '#f57c00', bg: '#fff8e1' };
  };

  // Update the helper function to format metric key names
  const formatMetricName = (key: string, inScoresSection: boolean = false): string => {
    // Custom mapping for specific metric names
    // const customNames = {
    //   'acneScore': 'Breakouts',
    //   'rednessScore': 'Redness',
    //   'eyeAreaCondition': 'Eye Area Condition',
    //   'linesScore': 'Lines',
    //   'pigmentationScore': 'Pigmentation',
    //   'poresScore': 'Visible Pores',
    //   'hydrationScore': 'Dewiness',
    //   'uniformnessScore': 'Evenness'
    // };

    const customNames: { [key: string]: string } = {
      'acneScore': 'Breakouts',
      'rednessScore': 'Redness',
      'eyeAreaCondition': 'Eye Area Condition',
      'linesScore': 'Lines',
      'pigmentationScore': 'Pigmentation',
      'poresScore': 'Visible Pores',
      'hydrationScore': 'Dewiness',
      'uniformnessScore': 'Evenness',
      'eyeAge': 'Perceived Eye Age',
      'perceivedAge': 'Perceived Age'
    };
    
    // Return custom name if it exists
    if (customNames[key]) {
      return customNames[key];
    }
    
    // First convert camelCase to space-separated words
    const formattedName = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
    
    // If in the scores section, remove redundant "Score" suffix
    if (inScoresSection && formattedName.endsWith(' Score')) {
      return formattedName.substring(0, formattedName.length - 6);
    }
    
    return formattedName;
  };

  // Helper to determine if scrolling should be enabled
  const isScrollEnabled = (): boolean => {
    return currentSnapPoint === SNAP_POINTS.EXPANDED && viewState === 'metrics';
  };

  // New helper function to determine if a metric is a standalone value or a score
  const isStandaloneMetric = (key: string): boolean => {
    const standaloneMetrics = [
      'skinAge', 'skinType', 'perceivedAge', 'eyeAge', 'skinTone',
      'imageQuality',
    ];
    return standaloneMetrics.includes(key) || typeof metrics?.[key] === 'string';
  };

  // --- Render Metrics Content (Scrollable Part - uses metrics prop) ---
  const renderMetricsContent = useCallback(() => {
      // console.log(`[MetricsSheet renderMetricsContent] -> uiState: ${uiState}, Has metrics prop: ${!!metrics}`);
       switch (uiState) {
         case 'loading': return ( <View style={styles.centerContainer}><ActivityIndicator size="large" /><Text>Loading...</Text></View> );
         case 'analyzing': return ( <View style={styles.centerContainer}><ActivityIndicator size="large" /><Text>Analyzing...</Text></View> );
         case 'complete':
            const metricsKeys = metrics ? Object.keys(metrics) : [];
            const hasMetricsData = metrics && metricsKeys.length > 0;
            if (!hasMetricsData) {
               return ( <View style={styles.noMetricsContainer}><Text>Processing metrics...</Text></View> );
            }
            // Use metrics prop in mapping
            return (
              <ScrollView style={styles.scrollContainer} scrollEnabled={isScrollEnabled()} showsVerticalScrollIndicator={isScrollEnabled()}>
                   {/* Group 1: Standalone metrics */}
                   <View style={styles.metricGroup}>
                     <Text style={styles.metricGroupTitle}>SKIN PROFILE</Text>
                     {Object.entries(metrics)
                       .filter(([key]) => isStandaloneMetric(key) && key !== 'imageQuality')
                       .sort(([keyA], [keyB]) => {
                         // Define the desired order for skin profile metrics
                         const order = [
                           'skinType',      // Skin Type
                           'skinTone',      // Skin Tone
                           'perceivedAge',  // Perceived Age
                           'eyeAge',        // Eye Age
                          //  'skinAge',       // Skin Age
                         ];
                         
                         const indexA = order.indexOf(keyA);
                         const indexB = order.indexOf(keyB);
                         
                         // If both are in the order array, sort by their position
                         if (indexA !== -1 && indexB !== -1) {
                           return indexA - indexB;
                         }
                         
                         // If only one is in the order array, prioritize it
                         if (indexA !== -1) return -1;
                         if (indexB !== -1) return 1;
                         
                         // If neither is in the order array, sort alphabetically
                         return keyA.localeCompare(keyB);
                       })
                       .map(([key, value], index, array) => {
                          const formattedKey = formatMetricName(key);
                          let displayValue = value;
                          const isAgeMetric = key.includes('Age');
                          if (isAgeMetric) displayValue = value; // Just the number for age metrics
                          return (
                            <TouchableOpacity
                              key={key}
                              style={[
                                styles.metricRow,
                                index < array.length - 1 && styles.borderBottom
                              ]}
                              onPress={() => {
                                if (viewState === 'metrics') {
                                  // console.log(`Navigating to metric detail: ${key} (${value})`);
                                  navigation.navigate('MetricDetail', {
                                    metricKey: key,
                                    metricValue: value,
                                    maskResults: photoData?.maskResults,
                                    maskImages: photoData?.maskImages,
                                    photoData: JSON.stringify(photoData || metrics)
                                  });
                                }
                              }}
                              activeOpacity={viewState === 'metrics' ? 0.7 : 1}
                            >
                              <Text style={styles.metricLabel}>
                                {formattedKey.toUpperCase()}
                              </Text>
                              <View style={styles.metricValueContainer}>
                                <Text style={styles.metricValue}>{displayValue}</Text>
                                <ChevronRight size={18} color={palette.gray6} style={{ marginLeft: 8 }} />
                              </View>
                            </TouchableOpacity>
                          );
                       })}
                   </View>
                   {/* Group 2: Score metrics */}
                    <View style={styles.metricGroup}>
                      <Text style={styles.metricGroupTitle}>SKIN ANALYSIS</Text>
                      {/* Table header for Skin Analysis */}
                      <View style={styles.tableHeaderRow}>
                        <Text style={styles.tableHeaderLeft}>CONCERN</Text>
                        <View style={styles.tableHeaderRight}>
                          <Text style={styles.tableHeaderRightText}>SCORE</Text>
                          <ChevronLeft size={14} color={palette.gray6} style={{ marginLeft: 4 }} />
                          <Text style={styles.tableHeaderRightText}>IMPROVE</Text>
                        </View>
                      </View>
                      {Object.entries(metrics)
                        .filter(([key, value]) => !isStandaloneMetric(key) && typeof value === 'number')
                        .sort(([keyA], [keyB]) => {
                          // Define the desired order
                          const order = [
                            'uniformnessScore', // Evenness
                            'pigmentationScore', // Pigmentation
                            'rednessScore',   // Redness
                            'poresScore',     // Pores
                            'acneScore',      // Breakouts
                            'linesScore',     // Lines
                            'hydrationScore', // Hydration
                            'eyeAreaCondition', // Eye Area Condition
                          ];
                          
                          const indexA = order.indexOf(keyA);
                          const indexB = order.indexOf(keyB);
                          
                          // If both are in the order array, sort by their position
                          if (indexA !== -1 && indexB !== -1) {
                            return indexA - indexB;
                          }
                          
                          // If only one is in the order array, prioritize it
                          if (indexA !== -1) return -1;
                          if (indexB !== -1) return 1;
                          
                          // If neither is in the order array, sort alphabetically
                          return keyA.localeCompare(keyB);
                        })
                        .filter(([key]) => key !== 'translucencyScore') // Remove Translucency
                        .map(([key, value], index, array) => {
                          const { tag, color, bg } = getMetricTag(value as number);
                          const formattedKey = formatMetricName(key, true);
                          
                          return (
                            <TouchableOpacity
                              key={key}
                              style={[
                                styles.metricRow,
                                index < array.length - 1 && styles.borderBottom
                              ]}
                              onPress={() => {
                                // Only navigate if in the expanded state
                                if (viewState === 'metrics') {
                                  //  console.log(`Navigating to metric detail: ${key} (${value})`);
                                  navigation.navigate('MetricDetail', {
                                    maskResults: photoData?.maskResults,
                                    maskImages: photoData?.maskImages,
                                    metricKey: key,
                                    metricValue: value,
                                    photoData: JSON.stringify(photoData || metrics)
                                  });
                                }
                              }}
                              activeOpacity={viewState === 'metrics' ? 0.7 : 1}
                            >
                              <View style={styles.metricLabelContainer}>
                                <Text style={styles.metricLabel}>
                                  {formattedKey.toUpperCase()}
                                </Text>
                                {key === 'poresScore' && (
                                  <Text style={styles.disclaimerText}>
                                    Work in Progress, still unreliable
                                  </Text>
                                )}
                              </View>
                              <View style={styles.metricValueContainer}>
                                <View style={[styles.scoreContainer, { backgroundColor: bg }]}>
                                  <Text style={styles.metricValue}>{value}</Text>
                                    <Text style={styles.scoreSuffix}> / 100</Text>
                                  </View>
                                <ChevronRight size={18} color={palette.gray6} style={{ marginLeft: 8 }} />
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                     {/* If no metrics available, show a message */}
                     {(!metrics || Object.keys(metrics).length === 0) && (
                       <View style={styles.noMetricsContainer}>
                         <Text style={styles.noMetricsText}>No metrics available</Text>
                       </View>
                     )}
                     {/* Add padding at the bottom for better scrolling */}
                     <View style={{ height: 40 }} />
                </ScrollView>
              );
         case 'no_results':
            return (
              <View style={styles.noResultsContainer}>
                <View style={styles.errorMessageRow}>
                  <AlertCircle size={18} color="#FF3B30" />
                  <Text style={styles.errorMessageText}>No Analysis Available</Text>
                </View>
                <Text style={styles.noResultsMessage}>
                  We couldn't analyze this image. This could be due to poor lighting, 
                  camera angle, or network issues.
                </Text>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={onTryAgain}
                >
                  <Text style={styles.linkButtonText}>Try again</Text>
                </TouchableOpacity>
              </View>
            );
         case 'low_quality':
            return (
              <View style={styles.noResultsContainer}>
                <View style={styles.errorMessageRow}>
                  <AlertTriangle size={18} color="#FF9800" />
                  <Text style={styles.errorMessageText}>Low image quality</Text>
                </View>
                <Text style={styles.noResultsMessage}>
                  This image quality is too low to analyze accurately.
                </Text>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={onTryAgain}
                >
                  <Text style={styles.linkButtonText}>Try again</Text>
                </TouchableOpacity>
              </View>
            );
         default:
            return null;
       }
  }, [uiState, metrics, isScrollEnabled, isStandaloneMetric, formatMetricName, getMetricTag, viewState, navigation, photoData, onTryAgain]);

  // Memoize the animated height interpolation
  const animatedHeight = useMemo(() => 
    sheetPosition.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%']
    }), [sheetPosition]
  );

  return (
    <>
      {/* Main Sheet Container */}
      <Animated.View 
        style={[
          styles.container, 
          { 
            height: animatedHeight
          }
        ]}
      >
        {/* Draggable header */}
        <View
          {...panResponder.panHandlers}
          style={styles.dragArea}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleExpanded}
            style={styles.dragIndicatorContainer}
          >
            <View style={styles.dragIndicator} />
          </TouchableOpacity>
        </View>

        {/* AI Insights Section - Chat Style Message - Only show when analysis is complete */}
        {uiState === 'complete' && (
        <View style={styles.aiInsightsContainer}>
          <Text style={styles.aiInstructionText}>Tap to chat with Amber, your AI Skin Guide</Text>
          <TouchableOpacity 
            style={styles.aiInsightsMessage}
            onPress={() => {
              if (photoData && metrics) {
                // Get firstName from profile or user
                const firstName = profile?.user_name || user?.user_name || 'there';
                
                navigation.navigate('ThreadChat', {
                  chatType: 'snapshot_feedback',
                  imageId: photoData?.imageId,
                  initialMessage: summary
                });
              }
            }}
          >
            <View style={styles.aiAvatar}>
              <Image 
                source={require('../../assets/images/amber-avatar.png')} 
                style={styles.aiAvatarImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.aiMessageContent}>
              <Text style={styles.aiMessageText}>
                {summary ? summary : (summaryLoading ? "Loading summary..." : "Loading summary...")}
              </Text>
              <View style={styles.aiMessageFooter}>
                <Text style={styles.aiMessageTime}>
                  Record in your Journal how you are feeling? Or ask me any Skin Care questions!
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        )}

        {/* Scrollable Metrics Content Area */}
        <View style={styles.metricsContentArea}>
            {renderMetricsContent()}
        </View>
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 5,
    elevation: 10,
  },
  dragArea: {
    height: 30, // Drag area height
    width: '100%',
  },
  dragIndicatorContainer: {
    height: 30,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
  },
  motivationalCard: {
    backgroundColor: '#f8f8f8', // Slightly different background
    marginHorizontal: 16,
    marginBottom: 10, // Reduced margin bottom
    marginTop: 5, // Added margin top
    paddingVertical: 10, // Adjusted padding
    paddingHorizontal: 12,
    borderRadius: 12,
    // Removed shadow for a flatter look, adjust as needed
    // shadowColor: '#000',
    // shadowOpacity: 0.05,
    // shadowOffset: { width: 0, height: 2 },
    // shadowRadius: 4,
    // elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50, // Ensure minimum height
  },
  avatarCircle: {
    backgroundColor: '#6E46FF',
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
    fontSize: 12, // Adjusted size
  },
  motivationalText: {
    fontSize: 13
  },
  arrowIcon: {
    fontSize: 16,
    marginLeft: 8
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 50
  },
  stateTitle: {
    marginTop: 20,
    fontSize: 16,
    color: '#555',
    textAlign: 'center'
  },
  stateSubtitle: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
    textAlign: 'center'
  },
  actionButton: {
    marginTop: 20,
    padding: 10
  },
  actionButtonText: {
    color: '#6E46FF',
    fontWeight: '500'
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    alignItems: 'center'
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  metricLabelContainer: {
    flex: 1,
  },
  metricLabel: {
    fontWeight: '600',
    color: '#555'
  },
  disclaimerText: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '500'
  },
  tagContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  noMetricsContainer: {
    padding: 20,
    alignItems: 'center'
  },
  noMetricsText: {
    color: '#999'
  },
  metricGroup: {
    marginBottom: 16,
  },
  metricGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 4,
  },
  tableHeaderLeft: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableHeaderRightText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lowQualityContainer: {
    padding: 20,
    alignItems: 'center',
  },
  lowQualityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 12,
    marginBottom: 8,
  },
  lowQualityMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  tryAgainButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tryAgainButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'flex-start',
  },
  errorMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorMessageText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#333',
    marginLeft: 8,
  },
  noResultsMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  linkButton: {
    // No background, just text
    paddingVertical: 8,
  },
  linkButtonText: {
    color: '#007AFF', // iOS primary color
    fontSize: 16,
    fontWeight: '500',
  },
  insightsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  insightsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  insightsLoadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
  },
  insightsMessageText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18, // Adjusted line height
    flex: 1, // Allow text to take available space
  },
  insightsErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightsErrorText: {
    fontSize: 13,
    color: '#ff3b30',
    flex: 1,
    marginRight: 8,
  },
  insightsRetryButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: '#e0e0e0', // Different retry background
    borderRadius: 10,
  },
  insightsRetryText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },
  metricsContentArea: {
    flex: 1, // Takes remaining space
    // Add padding if motivationalCard has margin bottom
    paddingBottom: 0, // Adjust as needed
    overflow: 'hidden', // Clip content within this area
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreSuffix: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(0, 0, 0, 0.6)',
    marginLeft: 1,
  },
  ageContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  ageSuffix: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(0, 0, 0, 0.6)',
    marginLeft: 1,
  },
  aiInsightsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  aiInstructionText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  aiInsightsMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  aiAvatarImage: {
    width: 32,
    height: 32,
  },
  aiAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  aiMessageContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aiMessageText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 20,
  },
  aiMessageFooter: {
    marginTop: 8,
  },
  aiMessageTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});

export default MetricsSheet;
