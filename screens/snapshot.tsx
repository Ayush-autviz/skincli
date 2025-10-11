// snapshot.tsx
// Detailed view of a photo with analysis results

/* ------------------------------------------------------
WHAT IT DOES
- Displays full-size photo
- Shows analysis results from Haut.ai API
- Allows sharing or deletion
- Displays metadata and timestamps
- Creates AI thread if one doesn't exist for completed analysis
- Passes threadId to child components for AI message display

NAVIGATION FLOWS
- From Camera: Full Haut.ai processing flow (processImageWithHaut → startPollingForResults)
- From PhotoGrid: Skip processing, go directly to polling (photos already processed by API)
  * Uses fromPhotoGrid='true' param and existing imageId to skip processImageWithHaut()
  * Goes directly to startPollingForResults() with the provided imageId

STATE MANAGEMENT
- viewState: Controls the current UI mode
  - 'default': The home state - what you see when you first open the screen
    * Collapsed metrics sheet (30% height)
    * Photo at normal zoom (1x)
    * This is the state everything returns to
  - 'metrics': Expanded metrics sheet view (80% height)
  - 'zooming': Photo zoom mode with minimized metrics sheet (10% height)

- uiState: Controls the data loading state
  - 'loading': Initial state, waiting for photo to load
  - 'analyzing': Photo is loaded, waiting for analysis results
  - 'complete': Analysis results are available
  - 'no_results': Analysis failed or returned no metrics

STATE FLOW
1. Start in 'loading' uiState, 'default' viewState
2. When image loads → move to 'analyzing' uiState
3. When analysis completes → move to 'complete' uiState
4. User can transition between viewStates:
   - Tap/drag metrics sheet → toggle between 'default'/'metrics'
   - Pinch gesture on photo → enter 'zooming' viewState
   - Tap photo while in 'metrics' → return to 'default'
   - Tap photo while in 'zooming' → return to 'default'
   - Exit zoom gesture → return to 'default'

COMPONENT RELATIONSHIPS
- Parent: Snapshot (owns primary state)
  ├── Child: SnapshotPhoto (handles zoom/pan gestures)
  └── Child: MetricsSheet (manages bottom sheet interactions)
------------------------------------------------------*/

import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  Animated, 
  Dimensions, 
  Alert 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft, MoreVertical, Minimize2, Trash2, Share } from 'lucide-react-native';
import Header from '../components/ui/Header';
import { formatDate } from '../utils/dateUtils';
import { 
  processHautImage, 
  getHautAnalysisResults, 
  getHautMaskResults, 
  getHautMaskImages, 
  transformHautResults, 
  deletePhoto 
} from '../utils/newApiService';
import useAuthStore from '../stores/authStore';
import { Camera } from 'react-native-vision-camera';
import { usePhotoContext } from '../contexts/PhotoContext';
import Modal from 'react-native-modal';
import MetricsSheet from '../components/analysis/MetricsSheet';
import { 
  PinchGestureHandler, 
  PanGestureHandler, 
  State, 
  GestureHandlerRootView 
} from 'react-native-gesture-handler';
import SnapshotPhoto from '../components/photo/SnapshotPhoto';
import AiMessageCard from '../components/chat/AiMessageCard';
import { ImageBackground } from 'react-native';

interface SnapshotParams {
  photoId?: string;
  localUri?: string;
  userId?: string;
  timestamp?: string;
  fromPhotoGrid?: string;
  imageId?: string;
}

interface PhotoData {
  id: string;
  imageId?: string;
  storageUrl: string;
  timestamp: Date;
  metrics?: any;
  maskResults?: any;
  maskImages?: any;
  status: { state: string };
  urls?: { [key: string]: string };
  masks?: { lines?: any };
}

// Configurations
const ANALYSIS_TIMEOUT_SECONDS = 45; // Timeout window for analysis to complete (1 minute)
const SHOW_DEBUG_BUTTONS = false;
const QUALITY_THRESHOLD_MIN = 10;  // Minimum acceptable image quality score
const QUALITY_WARNING_THRESHOLD = 50;  // Threshold for displaying quality warning
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Add a new UI state constant for no metrics/analysis
const ANALYSIS_TIMEOUT_MS = ANALYSIS_TIMEOUT_SECONDS * 1000;

// Define constants for UI layout
const HEADER_HEIGHT = 110; // Actual height of the header component
const BOTTOM_SHEET_COLLAPSED_PERCENTAGE = 25; // Peek height as 25% of screen

// Define SNAP_POINTS here so Skeleton can access it
const SNAP_POINTS = {
  COLLAPSED: BOTTOM_SHEET_COLLAPSED_PERCENTAGE,   // Use the new constant
  EXPANDED: 80,    // 80% height (metrics view)
  MINIMIZED: 10    // 10% height (zooming mode) - Still relevant for sheet logic if needed elsewhere
};

// Modified EllipsisMenu component to handle zoom state
const EllipsisMenu = ({ 
  onDelete, 
  onShare, 
  viewState, 
  onExitZoom 
}: { 
  onDelete: () => void; 
  onShare: () => void; 
  viewState: string; 
  onExitZoom: () => void; 
}): React.JSX.Element => {
  const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);

  // If in zoom state, replace ellipsis with exit zoom button
  if (viewState === 'zooming') {
    return (
      <TouchableOpacity 
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onExitZoom}
      >
        <Minimize2 size={24} color="white" />
      </TouchableOpacity>
    );
  }

  // Standard ellipsis menu for non-zoom states
  const handleDelete = (): void => {
    setIsMenuVisible(false);
    Alert.alert(
      "Delete Snapshot",
      "Are you sure you want to delete this snapshot? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: onDelete,
          style: "destructive"
        }
      ]
    );
  };

  const handleShare = (): void => {
    setIsMenuVisible(false);
    onShare();
  };

  return (
    <>
      <TouchableOpacity 
        onPress={() => setIsMenuVisible(true)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <MoreVertical size={24} color="white" />
      </TouchableOpacity>

      <Modal
        isVisible={isMenuVisible}
        onBackdropPress={() => setIsMenuVisible(false)}
        onBackButtonPress={() => setIsMenuVisible(false)}
        backdropOpacity={0.4}
        animationIn="fadeIn"
        animationOut="fadeOut"
        style={{
          margin: 0,
          justifyContent: 'flex-start',
          alignItems: 'flex-end',
        }}
      >
        <View style={{
          backgroundColor: 'white',
          borderRadius: 8,
          marginTop: 100, // Positioned below header
          marginRight: 10,
          width: 200,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}>
          <TouchableOpacity 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 15,
              borderBottomWidth: 1,
              borderBottomColor: '#f0f0f0',
            }}
            onPress={handleDelete}
          >
            <Trash2 size={20} color="#FF3B30" />
            <Text style={{
              fontSize: 16,
              marginLeft: 10,
              color: '#FF3B30',
            }}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 15,
            }}
            onPress={handleShare}
          >
            <Share size={20} color="#333" />
            <Text style={{
              fontSize: 16,
              marginLeft: 10,
              color: '#333',
            }}>Share</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

// --- Skeleton Placeholder Component ---
const SnapshotSkeleton = ({ onClose }: { onClose: () => void }): React.JSX.Element => {
  const initialSheetHeight = `${SNAP_POINTS.COLLAPSED}%`;

  return (
    <View style={styles.skeletonContainer}>
      {/* Skeleton Placeholder for Photo */}
      <View style={styles.skeletonPhoto} />

      {/* Skeleton Placeholder for Header Area (Simplified for Debugging) */}
      <View style={styles.skeletonHeaderArea}> 
        <Text style={{ color: 'white', textAlign: 'center', paddingTop: 60 }}>Loading...</Text> 
      </View>

      {/* Actual Close Button */}
      <TouchableOpacity
        style={styles.skeletonCloseButton}
        onPress={onClose}
      >
        <Text style={{ color: 'white', fontSize: 24 }}>×</Text>
      </TouchableOpacity>

      {/* Skeleton Placeholder for Sheet */}
      <View style={[styles.skeletonSheet, { height: initialSheetHeight }]} />

      {/* Optional Spinner */}
      <ActivityIndicator size="large" color="#999" style={styles.skeletonSpinner} />
    </View>
  );
};

// New Loading Component based on desired behavior - Now a MINIMAL SKELETON
// MODIFIED to support backgroundImageUri for blurred background
const SnapshotLoading = ({ 
  microcopy, 
  onClose, 
  backgroundImageUri 
}: { 
  microcopy: string; 
  onClose: () => void; 
  backgroundImageUri?: string; 
}): React.JSX.Element => {
  if (backgroundImageUri) {
    return (
      <ImageBackground 
        source={{ uri: backgroundImageUri }} 
        style={styles.fullScreenImageForBlur}
        resizeMode="cover" // Ensure it covers the screen
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          {/* Header Area with Close Button - Replicated for consistency */}
          <View style={[styles.skeletonHeaderArea, { height: HEADER_HEIGHT, backgroundColor: 'transparent' }]}>
            <TouchableOpacity
              style={styles.skeletonCloseButton} // Use existing style, ensure it's visible
              onPress={onClose}
            >
              <Text style={{ color: 'white', fontSize: 24 }}>×</Text>
            </TouchableOpacity>
            {/* Optional: Can add a title here if needed, e.g., "Uploading..." */}
          </View>
          
          {/* Centered Spinner and Microcopy - Overlaying the blur */}
          <View style={styles.centeredLoaderContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" /> 
            <Text style={styles.loadingMicrocopyOverlayed}>
              {typeof microcopy === 'string' ? microcopy : "Processing..."} 
            </Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  // Fallback to original minimal skeleton (dark gray background)
  return (
    <View style={styles.skeletonContainer}> 
      <View style={[styles.skeletonHeaderArea, { height: HEADER_HEIGHT }]}>
        <TouchableOpacity
          style={styles.skeletonCloseButton}
          onPress={onClose}
        >
          <Text style={{ color: 'white', fontSize: 24 }}>×</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.centeredLoaderContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" /> 
        <Text style={styles.loadingMicrocopyCentered}>
          {typeof microcopy === 'string' ? microcopy : "Loading data..."} 
        </Text>
      </View>
    </View>
  );
};

const SnapshotScreen = (): React.JSX.Element => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as SnapshotParams || {};
  
  const { photoId, localUri, userId: paramUserId, timestamp, fromPhotoGrid, imageId: passedImageId } = params;

  console.log('🔵 params from snapshot screen:', params);
  
  // Auth store (fallback user ID)
  const { user } = useAuthStore();
  const userId = user?.user_id;
  
  // Contexts
  const { selectedSnapshot, setSelectedSnapshot, refreshPhotos } = usePhotoContext();

  console.log('🔵 selectedSnapshot from snapshot screen:', selectedSnapshot);
  
  // State management
  const [viewState, setViewState] = useState<string>('default');
  const [uiState, setUiState] = useState<string>('loading');
  const [loadingMicrocopy, setLoadingMicrocopy] = useState<string>('Loading...');
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(true);
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);
  
  // Haut.ai API state
  const [imageId, setImageId] = useState<string | null>(null);
  const [hautBatchId, setHautBatchId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Refs
  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mainTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Flag to ensure initialization logic runs only once
  const hasInitializedRef = useRef<boolean>(false);

  // Create refs for child components
  const snapshotPhotoRef = useRef<any>(null);
  const metricsSheetRef = useRef<any>(null);
  
  // Consolidated function to change view state
  const changeViewState = (newState: string, options: any = {}): void => {
    // Prevent unnecessary updates
    if (newState === viewState && !options.force) return;
    
    // Handle special transitions back to default state
    if (newState === 'default' && viewState === 'zooming') {
      // Request zoom reset from SnapshotPhoto when returning to default
      if (snapshotPhotoRef.current?.resetZoom) {
        snapshotPhotoRef.current.resetZoom();
      }
    }
    
    // Update metrics sheet position based on new state
    if (metricsSheetRef.current?.setSheetPosition) {
      const position = 
        newState === 'metrics' ? 'expanded' :
        newState === 'zooming' ? 'minimized' : 'collapsed'; // Default state gets collapsed sheet
      
      metricsSheetRef.current.setSheetPosition(position);
    }
    
    // Finally update the state
    setViewState(newState);
  };

  // Haut.ai API processing
  const processImageWithHaut = async (): Promise<void> => {
    if (!localUri || !userId) {
      console.error('🔴 Missing required data for Haut.ai processing');
      return;
    }

    try {
      setIsProcessing(true);
      setLoadingMicrocopy('Processing image...');
      
      console.log('🔵 Starting Haut.ai image processing');
      const { hautBatchId: batchId, imageId: imgId } = await processHautImage(localUri, 'front_image');
      
      setHautBatchId(batchId);
      setImageId(imgId);
      
      console.log('✅ Image processed, starting polling for results');
      setLoadingMicrocopy('Analyzing image...');
      
      // Start polling for results
      startPollingForResults(imgId);
      
    } catch (error: any) {
      console.error('🔴 Haut.ai processing error:', error);
      setLoadingMicrocopy('Processing failed');
      setUiState('no_results');
    } finally {
      setIsProcessing(false);
    }
  };

  const startPollingForResults = (imgId: string): void => {
    console.log('🔵 Starting polling for results:', imgId);
    
    // Set up the main timeout for the entire polling process
    mainTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Analysis timeout reached (1 minute)');
      setLoadingMicrocopy('No metrics found');
      setUiState('no_results');
      stopPolling();
    }, ANALYSIS_TIMEOUT_MS);
    
    const poll = async (): Promise<void> => {
      try {
        const results = await getHautAnalysisResults(imgId);
        console.log('🔵 Analysis results:', results);
        
        if (results && results.length > 0) {
          console.log('✅ Analysis results received');
          
          // Clear the main timeout since we got results
          if (mainTimeoutRef.current) {
            clearTimeout(mainTimeoutRef.current);
            mainTimeoutRef.current = null;
          }
          
          // Transform results to match app structure
          const transformedMetrics = transformHautResults(results);
          console.log('🔵 transformedMetrics:', transformedMetrics);

          // if in trsnsformed metric has only image quality we nedd to throw an error and set uiState to no_results
          if (Object.keys(transformedMetrics).length === 1 && transformedMetrics.imageQuality) {
            console.log('🔴 No results found');
            setLoadingMicrocopy('No results found');
            setUiState('no_results');
            return;
          }
          
          // Get mask results after analysis is complete
          let maskResults = null;
          let maskImages = null;
          try {
            console.log('🔵 Fetching mask images after analysis completion for imageId:', imgId);
            console.log('🔵 About to call getHautMaskImages...');
            maskImages = await getHautMaskImages(imgId);
            console.log('🔵 maskImages result:', maskImages);
            console.log('🔵 maskImages type:', typeof maskImages);
            console.log('🔵 maskImages is array:', Array.isArray(maskImages));
            if (maskImages) {
              console.log('🔵 maskImages length:', maskImages.length);
            }
            console.log('✅ Mask images retrieved successfully');
            // Get mask images with S3 URLs for each skin condition
            // try {
            //   console.log('🔵 Fetching mask images with S3 URLs');
            //   maskImages = await getHautMaskImages(imgId);
            //   console.log('✅ Mask images retrieved successfully');
            // } catch (maskImageError) {
            //   console.log('⚠️ Mask images not ready yet or error occurred:', maskImageError.message);
            //   // Continue without mask images - they're not critical for the main flow
            // }
          } catch (error: any) {
            console.error('🔴 Mask images fetch error:', error);
            console.error('🔴 Error message:', error.message);
            console.error('🔴 Error stack:', error.stack);
            console.log('⚠️ Mask images not ready yet or error occurred:', error.message);
            // Continue without mask images - they're not critical for the main flow
          }
          
          // Create photo data structure
          const photoDataObj: PhotoData = {
            id: photoId || '',
            imageId: imgId,
            storageUrl: localUri,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            metrics: transformedMetrics,
            maskResults: maskResults, // Add mask results to photo data
            maskImages: maskImages, // Add mask images with S3 URLs for each condition
            status: { state: 'complete' }
          };

          console.log('🔵 photoDataObj to metrics sheet:', photoDataObj);
          
          setPhotoData(photoDataObj);
          setAnalysisResults(results);
          setLoadingMicrocopy('Analysis complete');
          setUiState('complete');
          
          // Refresh photos to update the photo lists
          refreshPhotos();
          console.log('✅ Photos refreshed after analysis completion');
          
          // Stop polling
          stopPolling();
          
        } else {
          console.log('⏳ Results not ready yet, continuing to poll...');
          // Continue polling
          pollingTimeoutRef.current = setTimeout(poll, 3000); // Poll every 3 seconds
        }
        
      } catch (error: any) {
        if (error.message.includes('not ready yet')) {
          console.log('⏳ Results not ready yet, continuing to poll...');
          // Continue polling
          pollingTimeoutRef.current = setTimeout(poll, 3000);
        } else {
          console.error('🔴 Polling error:', error);
          if (mainTimeoutRef.current) {
            clearTimeout(mainTimeoutRef.current);
            mainTimeoutRef.current = null;
          }
          setLoadingMicrocopy('Analysis failed');
          setUiState('no_results');
          stopPolling();
        }
      }
    };
    
    // Start first poll
    poll();
  };

  const stopPolling = (): void => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    // Clear the main timeout
    if (mainTimeoutRef.current) {
      clearTimeout(mainTimeoutRef.current);
      mainTimeoutRef.current = null;
    }
  };

  // Initialize photo data and start processing (runs only once)
  useEffect(() => {
    if (hasInitializedRef.current) return; // Prevent multiple initializations

    // ---- Case 1: Navigated from PhotoGrid ----
    if (fromPhotoGrid === 'true' && passedImageId) {
      console.log('🔵 Initializing snapshot from PhotoGrid - skipping processing');

      const photoFromContext = selectedSnapshot;
      if (photoFromContext) {
        const initialPhotoData: PhotoData = {
          id: photoId || '',
          storageUrl: photoFromContext.storageUrl,
          timestamp: photoFromContext.apiData?.created_at ? new Date(photoFromContext.apiData.created_at) : new Date(),
          status: { state: 'analyzing' }
        };

        setPhotoData(initialPhotoData);
        setImageId(passedImageId);
        setLoadingMicrocopy('Loading analysis results...');
        setUiState('analyzing');

        console.log('🔵 Starting polling for existing image:', passedImageId);
        startPollingForResults(passedImageId);
      }

      hasInitializedRef.current = true;
      return; // Skip further processing
    }

    // ---- Case 2: New image from Camera ----
    if (localUri && userId) {
      console.log('🔵 Initializing snapshot with Haut.ai flow');

      const initialPhotoData: PhotoData = {
        id: photoId || '',
        storageUrl: localUri,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        status: { state: 'pending' }
      };

      setPhotoData(initialPhotoData);

      setSelectedSnapshot({
        id: photoId || '',
        url: localUri,
        storageUrl: localUri,
        threadId: null
      });

      setLoadingMicrocopy('Processing image...');
      processImageWithHaut();
      hasInitializedRef.current = true;
    }
  }, [fromPhotoGrid, passedImageId, photoId, localUri, userId, timestamp]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Handle image load events
  const handleImageLoadStart = (): void => {
    // We don't necessarily set isImageLoaded=false here,
    // as it might cause flickering if already loaded once.
  };
  
  const handleImageLoad = (): void => {
   setIsImageLoaded(true);
  };
  
  const handleImageError = (error: any): void => {
    console.error('🔴 Image ERROR loading:', error.nativeEvent);
    // If image fails, we might never become "ready" if we strictly require isImageLoaded=true.
    // Consider how to handle this - maybe set a specific error state?
    // For now, it will just prevent isReady from becoming true.
    // Optionally retry:
    // if (photoData?.storageUrl) {
    //    const retryUrl = `${photoData.storageUrl}&retry=${Date.now()}`;
    //    setPhotoData(prev => ({...prev, storageUrl: retryUrl}));
    // }
  };
  
  // Handle zoom state changes from the photo component
  const handleZoomStateChange = (isZoomed: boolean): void => {
    changeViewState(isZoomed ? 'zooming' : 'default', { fromGesture: true }); // Return to default when zoom ends
  };

  // Handle deletion of photo and navigation
  const handleDelete = async (): Promise<void> => {
    try {
      // Get the image ID for deletion
      const imageIdToDelete = imageId || photoData?.imageId || photoId;
      
      if (!imageIdToDelete) {
        throw new Error('No image ID available for deletion');
      }
      
      console.log('🗑️ Deleting photo with ID:', imageIdToDelete);
      
      // Call the delete API
      await deletePhoto(imageIdToDelete);
      
      // Navigate away and clear context
      navigation.navigate('Tabs');
      setSelectedSnapshot(null); // Clear context
      
      // Refresh photos to update the photo lists after deletion
      refreshPhotos();
      console.log('✅ Photo deleted successfully and photos refreshed');
      
    } catch (error: any) {
      console.error('🔴 Delete failed:', error);
      Alert.alert("Error", `Failed to delete photo: ${error.message}`);
    }
  };

  // Handle deletion of photo without navigation (for auto-delete)
  const handleDeleteSilently = async (): Promise<void> => {
    // try {
    //   // Get the image ID for deletion
    //   const imageIdToDelete = imageId || photoData?.imageId || photoId;
      
    //   if (!imageIdToDelete) {
    //     console.warn('🔴 Silent delete skipped: No image ID available');
    //     return;
    //   }
      
    //   console.log('🗑️ Silently deleting photo with ID:', imageIdToDelete);
      
    //   // Call the delete API
    //   await deletePhoto(imageIdToDelete);
      
    //   // Refresh photos to update the photo lists after silent deletion
    //   refreshPhotos();
    //   console.log('✅ Photo silently deleted successfully and photos refreshed');
      
    // } catch (error) {
    //   console.error('🔴 Silent delete failed:', error);
    //   // Don't show user alert for silent delete - just log the error
    // }
  };

  // Get formatted date for header
  const getHeaderTitle = (): string => {
    // Show placeholder during initial loading
    if (uiState === 'loading' || !photoData?.timestamp) return 'Loading...'; 
    
    try {
      const timestamp = photoData.timestamp?.toDate?.() 
        ? photoData.timestamp.toDate() 
        : new Date(photoData.timestamp);
      return formatDate(timestamp);
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Snapshot';
    }
  };

  const handleExitZoom = (): void => {
    console.log('📱 Snapshot: Exit zoom from header');
    changeViewState('default'); // Return to default state
  };

  const handleClose = (): void => {
    console.log('📱 Snapshot: Close button pressed');
    navigation.navigate('Tabs');
  };

  // Add this useEffect to handle auto-deletion of problematic images
  useEffect(() => {
    // Only proceed if we have photo data
    if (!photoData) return;
    
    // Case 1: Low quality image
    if (photoData.metrics?.imageQuality?.overall !== undefined) {
      const qualityScore = photoData.metrics.imageQuality.overall;
      
      // Auto-delete if quality is below threshold
      if (qualityScore < QUALITY_THRESHOLD_MIN) {
        console.log(`🔴 AUTO-DELETE: Low quality image detected (score: ${qualityScore})`);
        
        // Small delay to make sure UI updates first
        const deleteTimer = setTimeout(() => {
          console.log('🔴 AUTO-DELETE: Executing silent delete for low quality image');
          handleDeleteSilently();
        }, 800);
        
        return () => clearTimeout(deleteTimer);
      }
    }
  }, [photoData, uiState]);

  // --- Render Logic --- 

  console.log(photoId,'current photo id', fromPhotoGrid ? '(from PhotoGrid)' : '(from camera)')
  console.log('🔵 Snapshot params:', { photoId, fromPhotoGrid, passedImageId, hasSelectedSnapshot: !!selectedSnapshot })

  // Ensure currentPhotoId (from state) is available before attempting to render anything specific
  if (!photoId) {
     // Render a minimal loading state or null while waiting for params/state
     return <SnapshotLoading microcopy="Initializing..." onClose={handleClose} />;
  }

  // Determine image URI
  // POC: Prioritize Haut.ai direct URL for better mask alignment
  const hautAiSquareImageUrl = photoData?.urls?.['500x500']; // Try the square image
  const hautAiPortraitImageUrl = photoData?.urls?.['800x1200'];
  const rawImageUri = hautAiSquareImageUrl || hautAiPortraitImageUrl || photoData?.storageUrl || localUri;

  // Ensure S3 presigned URLs work with React-Native <Image>. The core Image
  // component treats "+" as a space, breaking the AWS signature. Encode the
  // critical characters if they are present.
  const sanitizeS3Uri = (uriString: string): string => {
    if (!uriString) return uriString;
    // Only touch the query part – a cheap approach is just replacing "+" with
    // its percent-encoded form and ensuring no literal spaces remain.
    return uriString.replace(/\+/g, '%2B').replace(/ /g, '%20');
  };

  const imageUri = sanitizeS3Uri(rawImageUri || '');
  const maskContentLines = photoData?.masks?.lines;
  const peekSheetHeightAbs = SCREEN_HEIGHT * (BOTTOM_SHEET_COLLAPSED_PERCENTAGE / 100);
  const minimizedSheetHeightAbs = SCREEN_HEIGHT * (SNAP_POINTS.MINIMIZED / 100); // Calculate minimized sheet height

  // Determine if the main SkeletonLoading screen should be visible
  // Show skeleton only when uiState is strictly 'loading' or 'analyzing'
  const showSkeletonScreen = uiState === 'loading' || uiState === 'analyzing';

  if (showSkeletonScreen) {
    // Determine if we should use the blurred background:
    // This is true if localUri is present (new photo upload)
    // AND the uiState is still 'loading' or 'analyzing'
    const useEffectiveLoadingBackground = localUri && (uiState === 'loading' || uiState === 'analyzing');
    
    return <SnapshotLoading 
              microcopy={loadingMicrocopy}
              onClose={handleClose}
              backgroundImageUri={useEffectiveLoadingBackground ? localUri : undefined} // Pass local URI if applicable
            />;
  }

  // --- Main Render (uiState is 'complete', 'no_results', or 'low_quality') --- 
  // We will render the main structure for all these states, 
  // relying on MetricsSheet and potentially SnapshotPhoto to adapt.
  
  // Ensure photoData exists before rendering the main structure if state is not 'loading'
  // This prevents errors if state becomes e.g., 'no_results' before photoData populates
  if (!photoData && uiState !== 'loading') {
    // This should ideally not happen if uiState is not 'loading', but acts as a safety net
    console.error(`❌ SnapshotScreen: uiState is ${uiState} but photoData is missing! Rendering loading.`);
    return <SnapshotLoading 
              microcopy={'Error loading snapshot data.'}
              onClose={handleClose} 
            />;
  }

  console.log('🔵 imageUri:', imageUri);

  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* SnapshotPhoto: Pass mask props and new layout props */}
        {imageUri ? (
          <SnapshotPhoto
            ref={snapshotPhotoRef}
            uri={imageUri}
            isLoaded={isImageLoaded}
            onLoadStart={handleImageLoadStart}
            onLoad={handleImageLoad}
            onError={handleImageError}
            onZoomStateChange={handleZoomStateChange}
            onViewStateChange={changeViewState}
            isZoomed={viewState === 'zooming'}
            viewState={viewState}
            photoData={photoData}
            maskContent={maskContentLines}
            isMaskVisible={false}
            showRegistrationMarks={true}
            headerHeight={HEADER_HEIGHT}
            peekSheetHeight={peekSheetHeightAbs}
            minimizedSheetHeight={minimizedSheetHeightAbs}
          />
        ) : (
          // Show spinner if ready but photoData/URL still loading from listener
          <View style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#666" />
          </View>
        )}
        
        {/* Transparent Header - UPDATED to stay active in zoom state */}
        <Animated.View
          style={{
            height: HEADER_HEIGHT, // Use constant for header height
            width: '100%',
            backgroundColor: 'rgba(0,0,0,0.2)',
            paddingTop: 50, // For status bar
            paddingHorizontal: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            // Only fade in metrics view, not in zoom view
            opacity: viewState === 'metrics' ? 0.5 : 1,
            // Always allow interaction
            pointerEvents: 'auto',
          }}
        >
          {/* Left: Close button */}
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleClose}
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          
          {/* Center: Title/Date and Mask Toggle */}
          <View style={styles.headerCenterContainer}>
            <Text style={styles.headerTitleText}>
              {getHeaderTitle()}
            </Text>
          </View>
          
          {/* Right: Contextual Ellipsis Menu or Exit Zoom button */}
          <EllipsisMenu 
            onDelete={handleDelete} 
            onShare={()=>{}}
            viewState={viewState}
            onExitZoom={handleExitZoom}
          />
        </Animated.View>

        {/* Chip Container - Renders if at least one chip is visible */}
        {isImageLoaded && (
          (photoData?.metrics?.imageQuality?.overall !== undefined &&
            photoData.metrics.imageQuality.overall >= QUALITY_THRESHOLD_MIN &&
            photoData.metrics.imageQuality.overall <= QUALITY_WARNING_THRESHOLD) ||
          (uiState === 'complete' && maskContentLines)
        ) && (
          <View style={styles.chipRowOuterContainer}>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRowScrollViewContent}
            >
              {/* Low quality warning chip - Only show for borderline quality (10-50) */}
              {photoData?.metrics?.imageQuality?.overall !== undefined &&
                photoData.metrics.imageQuality.overall >= QUALITY_THRESHOLD_MIN &&
                photoData.metrics.imageQuality.overall <= QUALITY_WARNING_THRESHOLD && (
                  <View style={styles.chipButton}> 
                    <Text style={styles.chipText}>Low Image Quality</Text>
                  </View>
              )}

              {/* TODO: RE-ENABLE THIS CHIP WHEN BACKEND IS READY
              {uiState === 'complete' && maskContentLines && (
                <TouchableOpacity
                  onPress={() => setIsMaskVisible(!isMaskVisible)}
                  style={[styles.chipButton, { backgroundColor: isMaskVisible ? 'rgba(0,255,0,0.3)' : 'rgba(100,100,100,0.3)' }]}
                >
                  <Text style={styles.chipText}>{isMaskVisible ? 'Hide Lines' : 'Show Lines'}</Text>
                </TouchableOpacity>
              )} */}
            </ScrollView>
          </View>
        )}
        
        {/* Metrics Sheet: Handles metrics (props) + AI insights (context) */}
        <MetricsSheet
          ref={metricsSheetRef}
          uiState={uiState}
          viewState={viewState}
          metrics={photoData?.metrics} // Pass metrics prop
          photoData={photoData} // Pass full photoData including maskImages
          onDelete={handleDelete}
          onViewStateChange={changeViewState}
          onTryAgain={() => navigation.navigate('Camera')}
        />

      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff' // Ensure full-screen white background
  },
  scrollContainer: {
    flex: 1,
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 3/4,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  buttonContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  microcopy: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 16,
    padding: 8,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  metricsContainer: {
    paddingVertical: 20,
    paddingHorizontal: 1,
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metricName: {
    fontSize: 16,
    color: '#666',
    textTransform: 'capitalize',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  testButtonGroup: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  testLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 11,
    color: '#333',
  },
  activeButtonText: {
    color: '#fff',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingPlaceholder: {
    width: '100%',
    padding: 20,
    gap: 12,
  },
  placeholderLine: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    width: '100%',
  },
  photoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateContainer: {
    padding: 20,
  },
  debugText: {
    marginTop: 10,
    color: '#666',
    fontSize: 12
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 60, // Adjust based on your header height
    marginRight: 10,
    width: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  deleteText: {
    color: '#FF3B30',
  },
  chipRowOuterContainer: { 
    position: 'absolute',
    top: HEADER_HEIGHT + 8, 
    left: 0,
    right: 0,
    height: 40, 
    alignItems: 'center', 
    zIndex: 50,
  },
  chipRowScrollViewContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 10, 
  },
  chipButton: { 
    backgroundColor: 'rgba(100,100,100,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  chipText: { 
    color: 'white',
    fontSize: 13,
    fontWeight: '400',
  },
  // --- Skeleton Styles ---
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#333', // Solid dark background
  },
  skeletonHeaderArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110, // Match header height for positioning button
    // No background needed, just for layout space if required
  },
  skeletonCloseButton: { // Style like the real close button
    position: 'absolute',
    top: 50, // Match padding/status bar offset
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)', // Match background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensure it's above placeholders
  },
  skeletonSpinner: {
      position: 'absolute',
      top: '40%',
      left: '50%',
      transform: [{ translateX: -18 }, { translateY: -18 }],
  },
  loadingMicrocopy: {
    // Original style for microcopy if it were in the sheet
    fontSize: 14,
    color: '#666',
    marginTop: 10, 
  },
  loadingMicrocopyCentered: { // New style for centered microcopy
    fontSize: 14,
    color: '#FFFFFF', // White text for dark bg
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20, // Add some padding if text is long
  },
  centeredLoaderContainer: { // New style for spinner and its microcopy
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Ensure it's above the background image but below the header
  },
  loadingHeaderTitle: {
    flex: 1, // Allow text to take available space
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 50, // Prevent overlap with buttons
  },
  headerButton: { // Example style for header buttons
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Reduce horizontal padding if needed to fit toggle
    paddingHorizontal: 5,
  },
  headerTitleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
  // Style for the full-screen image used in blurred background
  fullScreenImageForBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Style for microcopy when overlayed on a blurred background
  loadingMicrocopyOverlayed: {
    fontSize: 16, // Slightly larger for better emphasis
    color: '#FFFFFF', 
    marginTop: 20, // More space from spinner
    textAlign: 'center',
    paddingHorizontal: 30, 
    fontWeight: '500', // Bolder
    // Adding text shadow for legibility on varied backgrounds
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default SnapshotScreen;
