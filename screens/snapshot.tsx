// snapshot.tsx
// Detailed view of a photo with analysis results

/* ------------------------------------------------------
WHAT IT DOES
- Displays full-size photo in a scrollable layout
- Shows analysis results from Haut.ai API
- Allows sharing or deletion
- Displays metadata and timestamps
- Shows AI insight card and SkinCheck section

NAVIGATION FLOWS
- From Camera: Full Haut.ai processing flow (processImageWithHaut → startPollingForResults)
- From PhotoGrid: Skip processing, go directly to polling (photos already processed by API)
  * Uses fromPhotoGrid='true' param and existing imageId to skip processImageWithHaut()
  * Goes directly to startPollingForResults() with the provided imageId
------------------------------------------------------*/

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
  StatusBar,
  DeviceEventEmitter,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Trash2,
  Sparkles,
  Star,
} from 'lucide-react-native';
import { formatDate } from '../utils/dateUtils';
import {
  processHautImage,
  processHautImages,
  getHautAnalysisResults,
  getHautMaskResults,
  getHautMaskImages,
  transformHautResults,
  deletePhoto,
  getImageChatSummary,
  sendSnapshotFirstChat,
  getComparison,
  toggleTopConcern,
} from '../utils/newApiService';
import useAuthStore from '../stores/authStore';
import { usePhotoContext } from '../contexts/PhotoContext';
import Modal from 'react-native-modal';
import { ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Platform } from 'react-native';
import { colors } from '../styles';

interface SnapshotParams {
  photoId?: string;
  localUri?: string;
  /** URI for the right-side capture (face-180 preset). */
  rightUri?: string;
  /** URI for the left-side capture (face-180 preset). */
  leftUri?: string;
  userId?: string;
  timestamp?: string;
  fromPhotoGrid?: string;
  imageId?: string;
  fromScanTab?: boolean;
  hautBatchId?: string;
}

interface PhotoData {
  id: string;
  imageId?: string;
  hautBatchId?: string;
  storageUrl: string;
  timestamp: Date;
  metrics?: any;
  maskResults?: any;
  maskImages?: any;
  status: { state: string };
  urls?: { [key: string]: string };
  masks?: { lines?: any };
  results?: any;
}

interface PhotoData {
  id: string;
  imageId?: string;
  hautBatchId?: string;
  storageUrl: string;
  timestamp: Date;
  metrics?: any;
  maskResults?: any;
  maskImages?: any;
  status: { state: string };
  urls?: { [key: string]: string };
  masks?: { lines?: any };
  results?: any;
}

// SVG Icons for bottom tabs
const getHomeSvg = (
  color: string,
) => `<svg width="32" height="32" viewBox="0 0 34 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20.6468 28V17.3333C20.6468 16.9797 20.5018 16.6406 20.2437 16.3905C19.9855 16.1405 19.6354 16 19.2704 16H13.7646C13.3995 16 13.0494 16.1405 12.7913 16.3905C12.5331 16.6406 12.3881 16.9797 12.3881 17.3333V28M4.12939 13.3333C4.1293 12.9454 4.21657 12.5622 4.38512 12.2103C4.55367 11.8584 4.79945 11.5464 5.1053 11.296L14.7405 3.29599C15.2373 2.8892 15.8669 2.66602 16.5175 2.66602C17.168 2.66602 17.7976 2.8892 18.2945 3.29599L27.9296 11.296C28.2355 11.5464 28.4812 11.8584 28.6498 12.2103C28.8183 12.5622 28.9056 12.9454 28.9055 13.3333V25.3333C28.9055 26.0406 28.6155 26.7188 28.0992 27.2189C27.5829 27.719 26.8827 28 26.1526 28H6.8823C6.15218 28 5.45197 27.719 4.9357 27.2189C4.41943 26.7188 4.12939 26.0406 4.12939 25.3333V13.3333Z" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const getRoutineSvg = (
  color: string,
) => `<svg width="32" height="32" viewBox="0 0 34 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16.6233 6.04788C14.7973 5.2628 12.7754 5.0078 10.8028 5.31381C8.83016 5.61981 6.99158 6.47368 5.51002 7.77184C4.02845 9.07 2.96756 10.7567 2.456 12.6273C1.94445 14.498 2.00421 16.4722 2.62804 18.3106C3.25187 20.1491 4.41296 21.7726 5.97051 22.9845C7.52805 24.1963 9.41512 24.9444 11.4029 25.1379" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.229 9.51074V15.5107L9.09965 17.5107" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M23.5243 5.18799V8.25806M21.0808 5.18799H25.9678C26.3381 5.18799 26.6932 5.34971 26.9551 5.63759M21.7789 11.3281V9.02557C21.7789 8.82202 21.8525 8.62679 21.9834 8.48286C22.1143 8.33892 22.2919 8.25806 22.4771 8.25806H24.5715C24.7566 8.25806 24.9342 8.33892 25.0651 8.48286C25.1961 8.62679 25.2696 8.82202 25.2696 9.02557V11.3281" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M17.1533 17.7894C17.1533 14.2021 20.0614 11.2939 23.6488 11.2939V11.2939C27.2361 11.2939 30.1442 14.2021 30.1442 17.7894V26.5264H17.1533V17.7894Z" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
<path d="M17.7407 17.6475H21.8454V22.5074H17.2847" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const getScanSvg = (
  color: string,
) => `<svg width="34" height="33" viewBox="0 0 34 33" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_18967_10472)">
<path d="M4 9.60872V6.94206C4 6.23481 4.28095 5.55654 4.78105 5.05644C5.28115 4.55634 5.95942 4.27539 6.66667 4.27539H9.33333M22.6667 4.27539H25.3333C26.0406 4.27539 26.7189 4.55634 27.219 5.05644C27.719 5.55654 28 6.23481 28 6.94206V9.60872M28 22.9421V25.6087C28 26.316 27.719 26.9942 27.219 27.4943C26.7189 27.9944 26.0406 28.2754 25.3333 28.2754H22.6667M9.33333 28.2754H6.66667C5.95942 28.2754 5.28115 27.9944 4.78105 27.4943C4.28095 26.9942 4 26.316 4 25.6087V22.9421" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M4.45166 17.9941H27.3003" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
<path d="M4.45166 17.9941H27.3003" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
<mask id="mask0_18967_10472" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="6" y="0" width="19" height="16">
<rect x="6.98828" y="0.275391" width="17.6133" height="15.6943" fill="#D92F2F"/>
</mask>
<g mask="url(#mask0_18967_10472)">
<path d="M15.7227 4.94507C12.2058 4.94507 10.5937 8.08505 10.2273 9.42383V12.051C9.5979 12.6206 9.26836 14.1822 10.2273 15.3012" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
<path d="M15.7241 4.94482C19.241 4.94482 20.853 8.08481 21.2194 9.42358V12.0508C21.8488 12.6203 22.1783 14.182 21.2194 15.3009" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
</g>
<path d="M11.4316 18.5096C11.8963 19.1821 12.9498 20.6302 13.4459 21.0424C14.0659 21.5578 15.1119 22.3305 15.8868 22.3305M12.8977 20.4619C12.9622 21.3778 12.5162 23.8777 12.3353 24.6261C12.2253 25.0809 12.0165 25.501 11.7566 25.8874" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
<path d="M20.34 18.5098C19.8753 19.1823 18.8218 20.6303 18.3257 21.0426C17.7057 21.5579 16.6597 22.3307 15.8848 22.3307M18.8739 20.4621C18.8094 21.378 19.2554 23.8778 19.4363 24.6263C19.5463 25.081 19.7551 25.5012 20.015 25.8875" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
</g>
<defs>
<clipPath id="clip0_18967_10472">
<rect width="32" height="32" fill="white" transform="translate(0 0.275391)"/>
</clipPath>
</defs>
</svg>`;

const getTrendsSvg = (
  color: string,
) => `<svg width="32" height="32" viewBox="0 0 34 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.12939 4V25.3333C4.12939 26.0406 4.41943 26.7189 4.9357 27.219C5.45197 27.719 6.15218 28 6.8823 28H28.9055M26.1526 12L19.2704 18.6667L13.7646 13.3333L9.6352 17.3333" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const getProfileSvg = (
  color: string,
) => `<svg width="32" height="32" viewBox="0 0 34 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M24.7761 26.6667C24.7761 24.5449 23.906 22.5101 22.3572 21.0098C20.8084 19.5095 18.7078 18.6667 16.5174 18.6667M16.5174 18.6667C14.3271 18.6667 12.2265 19.5095 10.6777 21.0098C9.12884 22.5101 8.25873 24.5449 8.25873 26.6667M16.5174 18.6667C19.5582 18.6667 22.0232 16.2788 22.0232 13.3333C22.0232 10.3878 19.5582 7.99999 16.5174 7.99999C13.4767 7.99999 11.0116 10.3878 11.0116 13.3333C11.0116 16.2788 13.4767 18.6667 16.5174 18.6667ZM30.2819 16C30.2819 23.3638 24.1194 29.3333 16.5174 29.3333C8.91551 29.3333 2.75293 23.3638 2.75293 16C2.75293 8.63619 8.91551 2.66666 16.5174 2.66666C24.1194 2.66666 30.2819 8.63619 30.2819 16Z" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Bottom Tab Bar Component
const BottomTabBar = ({
  navigation,
}: {
  navigation: any;
}): React.JSX.Element => {
  const handleNavigate = (screen: string) => {
    if (screen === 'Scan') {
      navigation.replace('Camera', { fromScanTab: true });
    } else {
      navigation.replace('Tabs', { screen });
    }
  };

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleNavigate('Home')}
          activeOpacity={0.7}
        >
          <SvgXml xml={getHomeSvg(colors.textSecondary)} />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleNavigate('MyRoutine')}
          activeOpacity={0.7}
        >
          <SvgXml xml={getRoutineSvg(colors.textSecondary)} />
          <Text style={styles.tabLabel}>My Routine</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleNavigate('Scan')}
          activeOpacity={0.7}
        >
          <SvgXml xml={getScanSvg(colors.textSecondary)} />
          <Text style={styles.tabLabel}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleNavigate('Progress')}
          activeOpacity={0.7}
        >
          <SvgXml xml={getTrendsSvg(colors.textSecondary)} />
          <Text style={styles.tabLabel}>Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleNavigate('AboutMe')}
          activeOpacity={0.7}
        >
          <SvgXml xml={getProfileSvg(colors.textSecondary)} />
          <Text style={styles.tabLabel}>About Me</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Configurations
const ANALYSIS_TIMEOUT_SECONDS = 45;
const QUALITY_THRESHOLD_MIN = 10;
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const ANALYSIS_TIMEOUT_MS = ANALYSIS_TIMEOUT_SECONDS * 1000;

// ===== Ellipsis Menu Component =====
const EllipsisMenu = ({
  onDelete,
}: {
  onDelete: () => void;
}): React.JSX.Element => {
  const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);

  const handleDelete = (): void => {
    setIsMenuVisible(false);
    Alert.alert(
      'Delete Snapshot',
      'Are you sure you want to delete this snapshot? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: onDelete, style: 'destructive' },
      ],
    );
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsMenuVisible(true)}
        style={styles.headerActionButton}
      >
        <MoreVertical size={22} color="#A3A3A3" />
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
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
            <Trash2 size={20} color="#FF3B30" />
            <Text style={styles.menuDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

// ===== Loading Screen =====
const SnapshotLoading = ({
  microcopy,
  onClose,
  backgroundImageUri,
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
        resizeMode="cover"
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.7)' },
          ]}
        >
          <View style={styles.loadingHeaderArea}>
            <TouchableOpacity
              style={styles.loadingCloseButton}
              onPress={onClose}
            >
              <Text style={{ color: 'white', fontSize: 24 }}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.centeredLoaderContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingMicrocopyOverlayed}>
              {typeof microcopy === 'string' ? microcopy : 'Processing...'}
            </Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.loadingHeaderArea}>
        <TouchableOpacity style={styles.loadingCloseButton} onPress={onClose}>
          <Text style={{ color: 'white', fontSize: 24 }}>×</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.centeredLoaderContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingMicrocopyCentered}>
          {typeof microcopy === 'string' ? microcopy : 'Loading data...'}
        </Text>
      </View>
    </View>
  );
};

// ===== Helper Functions =====
const getMetricTag = (value: number) => {
  if (value >= 70) return { color: '#22C55E' }; // green
  if (value < 50) return { color: '#EF4444' }; // red
  return { color: '#F59E0B' }; // amber
};

const formatMetricName = (key: string): string => {
  const customNames: { [key: string]: string } = {
    acneScore: 'Breakouts',
    rednessScore: 'Redness',
    eyeAreaCondition: 'Dark Circles',
    linesScore: 'Lines',
    pigmentationScore: 'Pigmentation',
    poresScore: 'Visible Pores',
    uniformnessScore: 'Evenness',
    eyeAge: 'Eye Age',
    perceivedAge: 'Perceived Age',
    skinType: 'Type',
    skinTone: 'Tone',
    puffinessScore: 'Eye Puffiness',
    saggingScore: 'Sagging',
  };
  if (customNames[key]) return customNames[key];
  return (
    key.charAt(0).toUpperCase() +
    key
      .slice(1)
      .replace(/([A-Z])/g, ' $1')
      .trim()
  );
};

const isStandaloneMetric = (key: string, metrics: any): boolean => {
  const standaloneMetrics = [
    'skinAge',
    'skinType',
    'perceivedAge',
    'eyeAge',
    'skinTone',
    'imageQuality',
  ];
  return standaloneMetrics.includes(key) || typeof metrics?.[key] === 'string';
};

// ===== Main Component =====
const SnapshotScreen = (): React.JSX.Element => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const params = (route.params as SnapshotParams) || {};

  const {
    photoId,
    localUri,
    rightUri,
    leftUri,
    userId: paramUserId,
    timestamp,
    fromPhotoGrid,
    imageId: passedImageId,
    hautBatchId: passedHautBatchId,
    fromScanTab,
  } = params;

  console.log('fromscan', fromScanTab);

  // Auth store
  const { user, profile, topConcerns, setTopConcerns } = useAuthStore();
  const userId = user?.user_id;

  // Contexts
  const { selectedSnapshot, setSelectedSnapshot, refreshPhotos, photos } =
    usePhotoContext();

  // State management
  const [uiState, setUiState] = useState<string>('loading');
  const [loadingMicrocopy, setLoadingMicrocopy] =
    useState<string>('Loading...');
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);

  // Haut.ai API state
  const [imageId, setImageId] = useState<string | null>(null);
  const [hautBatchId, setHautBatchId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // AI Summary state
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Score changes state (computed from previous photo)
  const [scoreChanges, setScoreChanges] = useState<
    Record<string, { arrow: string; value: number }>
  >({});
  const [isTogglingConcern, setIsTogglingConcern] = useState(false);

  // Refs
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedRef = useRef<boolean>(false);

  // ===== Haut.ai API Processing =====
  const processImageWithHaut = async (): Promise<void> => {
    if (!localUri || !userId) return;

    try {
      setIsProcessing(true);
      setLoadingMicrocopy('Processing image...');

      let result: { hautBatchId: string; imageId: string };

      if (rightUri && leftUri) {
        // Face-180 preset: send all three sides in one request
        result = await processHautImages({
          front: localUri,
          right: rightUri,
          left: leftUri,
        });
      } else {
        // Legacy single-image path
        result = await processHautImage(localUri, 'front_image');
      }

      setHautBatchId(result.hautBatchId);
      setImageId(result.imageId);
      setLoadingMicrocopy('Analyzing image...');
      startPollingForResults(result.hautBatchId);
    } catch (error: any) {
      setLoadingMicrocopy('Processing failed');
      setUiState('no_results');
    } finally {
      setIsProcessing(false);
    }
  };

  const startPollingForResults = (batchId: string): void => {
    mainTimeoutRef.current = setTimeout(() => {
      setLoadingMicrocopy('No metrics found');
      setUiState('no_results');
      stopPolling();
    }, ANALYSIS_TIMEOUT_MS);

    const poll = async (): Promise<void> => {
      try {
        const results = await getHautAnalysisResults(batchId);

        if (results && results.length > 0) {
          if (mainTimeoutRef.current) {
            clearTimeout(mainTimeoutRef.current);
            mainTimeoutRef.current = null;
          }

          const transformedMetrics = transformHautResults(results);

          if (
            Object.keys(transformedMetrics).length === 1 &&
            (transformedMetrics as any).imageQuality
          ) {
            setLoadingMicrocopy('No results found');
            setUiState('no_results');
            return;
          }

          let maskResults = null;
          let maskImages = null;
          try {
            maskResults = await getHautMaskResults(batchId);
            try {
              maskImages = await getHautMaskImages(batchId);
            } catch (maskImageError) {
              // Continue without mask images
            }
          } catch (error: any) {
            // Continue without mask results
          }

          let parsedTimestamp: Date;
          if (maskResults?.[0]?.created_at) {
            const created_at = maskResults[0].created_at;
            if (typeof created_at === 'string') {
              let utcTimestamp = created_at;
              if (
                !created_at.endsWith('Z') &&
                !created_at.includes('+') &&
                !created_at.includes('-', 10)
              ) {
                utcTimestamp = created_at + 'Z';
              }
              parsedTimestamp = new Date(utcTimestamp);
            } else {
              parsedTimestamp = new Date(created_at);
            }
          } else {
            parsedTimestamp = new Date();
          }

          const photoDataObj: PhotoData = {
            id: photoId || '',
            imageId: imageId || passedImageId,
            hautBatchId: batchId,
            storageUrl: localUri || '',
            timestamp: parsedTimestamp,
            metrics: transformedMetrics,
            maskResults: maskResults,
            maskImages: maskImages,
            status: { state: 'complete' },
            results: results,
          };

          setPhotoData(photoDataObj);
          setAnalysisResults(results);
          setLoadingMicrocopy('Preparing results...');

          // NEW: Transition to complete state IMMEDIATELY after primary metrics are ready
          setUiState('complete');
          setSummaryLoading(true);

          if (fromScanTab) {
            refreshPhotos();
          }
          DeviceEventEmitter.emit('photoUploaded');
          stopPolling();

          // Fetch secondary data (AI summary, score changes, top concerns) in background
          const contextPhotos = photos || [];
          (async () => {
            try {
              await Promise.all([
                // 1. AI Summary
                (async () => {
                  try {
                    const summaryResp = await getImageChatSummary(
                      imageId || passedImageId || batchId,
                    );
                    if (summaryResp.summary) {
                      setSummary(summaryResp.summary);
                    } else {
                      const currentUser = useAuthStore.getState().user;
                      const currentProfile = useAuthStore.getState().profile;
                      const chatData = {
                        imageId: imageId || passedImageId || batchId,
                        firstName:
                          currentUser?.user_name ||
                          currentProfile?.user_name ||
                          'User',
                        age: currentProfile?.age || 25,
                        skinType: currentProfile?.skinType || 'normal',
                        skinConcerns: currentProfile?.concerns
                          ? Object.keys(currentProfile.concerns).filter(
                            key => currentProfile.concerns![key],
                          )
                          : [],
                        excludedMetrics: [],
                        metrics: transformedMetrics || {},
                      };
                      try {
                        const chatResponse: any = await sendSnapshotFirstChat(
                          chatData,
                        );
                        if (chatResponse.success && chatResponse.data) {
                          setSummary(
                            chatResponse.data.message ||
                            chatResponse.data.feedback,
                          );
                        }
                      } catch (_) {
                        /* continue without summary */
                      }
                    }
                  } catch (_) {
                    setSummary(null);
                  }
                  setSummaryLoading(false);
                })(),
                // 2. Score changes from previous photo
                (async () => {
                  try {
                    const sortedPhotos = [...contextPhotos].sort(
                      (a: any, b: any) => {
                        const dateA = a.timestamp
                          ? new Date(a.timestamp)
                          : new Date(0);
                        const dateB = b.timestamp
                          ? new Date(b.timestamp)
                          : new Date(0);
                        return dateB.getTime() - dateA.getTime();
                      },
                    );
                    const currentIndex = sortedPhotos.findIndex((p: any) => {
                      const pImgId = p.hautUploadData?.imageId || p.id;
                      return (
                        pImgId === batchId ||
                        pImgId === imageId ||
                        pImgId === photoId
                      );
                    });

                    let prevPhoto = null;
                    if (currentIndex >= 0) {
                      if (currentIndex < sortedPhotos.length - 1) {
                        prevPhoto = sortedPhotos[currentIndex + 1];
                      }
                    } else if (sortedPhotos.length > 0) {
                      prevPhoto = sortedPhotos[0];
                    }

                    if (prevPhoto) {
                      const prevHautBatchId =
                        prevPhoto.hautUploadData?.hautBatchId;
                      if (!prevHautBatchId) return;
                      const prevResults = await getHautAnalysisResults(
                        prevHautBatchId,
                      );
                      if (prevResults && prevResults.length > 0) {
                        const prevMetrics = transformHautResults(prevResults);
                        const changes: Record<
                          string,
                          { arrow: string; value: number }
                        > = {};
                        const scoreKeys = [
                          'pigmentationScore',
                          'uniformnessScore',
                          'rednessScore',
                          'acneScore',
                          'eyeAreaCondition',
                          'linesScore',
                          'poresScore',
                        ];
                        scoreKeys.forEach(key => {
                          const curr = (transformedMetrics as any)[key];
                          const prev = (prevMetrics as any)[key];
                          if (
                            curr !== undefined &&
                            prev !== undefined &&
                            typeof curr === 'number' &&
                            typeof prev === 'number'
                          ) {
                            const diff = curr - prev;
                            changes[key] = {
                              arrow: diff > 0 ? '↑' : diff < 0 ? '↓' : '→',
                              value: Math.abs(Math.round(diff)),
                            };
                          }
                        });
                        setScoreChanges(changes);
                      }
                    }
                  } catch (_) {
                    /* continue without changes */
                  }
                })(),
                // 3. Fetch user top concerns from API
                (async () => {
                  try {
                    const resp: any = await getComparison('older_than_6_month');
                    const resultData = resp?.data?.result;
                    const tops = resultData?.user_top_concerns || [];
                    setTopConcerns(tops);
                  } catch (_) {
                    /* ignore */
                  }
                })(),
              ]);
            } catch (err) {
              console.error('🔴 Background loading error:', err);
            } finally {
              setSummaryLoading(false);
            }
          })();
        } else {
          pollingTimeoutRef.current = setTimeout(poll, 3000);
        }
      } catch (error: any) {
        if (error.message.includes('not ready yet')) {
          pollingTimeoutRef.current = setTimeout(poll, 3000);
        } else {
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

    poll();
  };

  const stopPolling = (): void => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    if (mainTimeoutRef.current) {
      clearTimeout(mainTimeoutRef.current);
      mainTimeoutRef.current = null;
    }
  };

  // ===== Initialize photo data =====
  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (fromPhotoGrid === 'true' && passedImageId) {
      const photoFromContext = selectedSnapshot;
      if (photoFromContext) {
        const initialPhotoData: PhotoData = {
          id: photoId || '',
          storageUrl: photoFromContext.storageUrl,
          timestamp: photoFromContext.apiData?.created_at
            ? new Date(photoFromContext.apiData.created_at)
            : new Date(),
          status: { state: 'analyzing' },
        };
        setPhotoData(initialPhotoData);
        setImageId(passedImageId);
        setHautBatchId(passedHautBatchId || null);
        setLoadingMicrocopy('Loading analysis results...');
        setUiState('analyzing');
        startPollingForResults(passedHautBatchId || '');
      }
      hasInitializedRef.current = true;
      return;
    }

    if (localUri && userId) {
      const initialPhotoData: PhotoData = {
        id: photoId || '',
        storageUrl: localUri,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        status: { state: 'pending' },
      };
      setPhotoData(initialPhotoData);
      setSelectedSnapshot({
        id: photoId || '',
        url: localUri,
        storageUrl: localUri,
        threadId: undefined,
      } as any);
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

  // AI summary is now fetched inside startPollingForResults before uiState becomes 'complete'

  // ===== Auto-delete low quality images =====
  useEffect(() => {
    if (!photoData) return;
    if (photoData.metrics?.imageQuality?.overall !== undefined) {
      const qualityScore = photoData.metrics.imageQuality.overall;
      if (qualityScore < QUALITY_THRESHOLD_MIN) {
        const deleteTimer = setTimeout(() => {
          handleDeleteSilently();
        }, 800);
        return () => clearTimeout(deleteTimer);
      }
    }
  }, [photoData, uiState]);

  // ===== Handlers =====
  const handleDelete = async (): Promise<void> => {
    try {
      const imageIdToDelete = imageId || photoData?.imageId || photoId;
      if (!imageIdToDelete)
        throw new Error('No image ID available for deletion');
      await deletePhoto(imageIdToDelete);
      (navigation as any).navigate('Tabs');
      setSelectedSnapshot(null);
      refreshPhotos();
    } catch (error: any) {
      Alert.alert('Error', `Failed to delete photo: ${error.message}`);
    }
  };

  const handleDeleteSilently = async (): Promise<void> => {
    // Silent delete placeholder
  };

  const handleToggleTopConcern = async (concernName: string) => {
    if (!concernName || isTogglingConcern) return;

    // Optimistic update
    const previousConcerns = [...(topConcerns || [])];
    const newConcerns = previousConcerns.includes(concernName)
      ? previousConcerns.filter(c => c !== concernName)
      : [...previousConcerns, concernName];

    setTopConcerns(newConcerns);
    setIsTogglingConcern(true);

    try {
      const response: any = await toggleTopConcern(concernName);
      if (response.success && response.data?.top_concerns) {
        setTopConcerns(response.data.top_concerns);
      }
    } catch (error) {
      console.error('Failed to toggle top concern:', error);
      // Revert on failure
      setTopConcerns(previousConcerns);
    } finally {
      setIsTogglingConcern(false);
    }
  };

  const handleClose = (): void => {
    if (fromScanTab) {
      (navigation as any).navigate('Tabs', { screen: 'Home' });
    } else {
      navigation.goBack();
    }
  };

  const handleNavigateToChat = (): void => {
    if (photoData && photoData.metrics) {
      (navigation as any).navigate('ThreadChat', {
        chatType: 'snapshot_feedback',
        imageId: photoData?.imageId,
        initialMessage: summary,
      });
    }
  };

  const getHeaderTitle = (): string => {
    if (uiState === 'loading' || !photoData?.timestamp) return 'Loading...';
    try {
      let date: Date;
      const ts: any = photoData.timestamp;
      if (ts?.toDate) {
        date = ts.toDate();
      } else if (typeof ts === 'string') {
        let utcTimestamp = ts;
        if (!ts.endsWith('Z') && !ts.includes('+') && !ts.includes('-', 10)) {
          utcTimestamp = ts + 'Z';
        }
        date = new Date(utcTimestamp);
      } else {
        date = new Date(ts);
      }
      if (isNaN(date.getTime())) return 'Snapshot';
      return formatDate(date);
    } catch (error) {
      return 'Snapshot';
    }
  };

  // ===== Sanitize S3 URIs =====
  const sanitizeS3Uri = (uriString: string): string => {
    if (!uriString) return uriString;
    return uriString.replace(/\+/g, '%2B').replace(/ /g, '%20');
  };

  // ===== Render Logic =====
  if (!photoId) {
    return (
      <SnapshotLoading microcopy="Initializing..." onClose={handleClose} />
    );
  }

  const showSkeletonScreen = uiState === 'loading' || uiState === 'analyzing';
  if (showSkeletonScreen) {
    const useEffectiveLoadingBackground =
      localUri && (uiState === 'loading' || uiState === 'analyzing');
    return (
      <SnapshotLoading
        microcopy={loadingMicrocopy}
        onClose={handleClose}
        backgroundImageUri={
          useEffectiveLoadingBackground ? localUri : undefined
        }
      />
    );
  }

  if (!photoData && uiState !== 'loading') {
    return (
      <SnapshotLoading
        microcopy={'Error loading snapshot data.'}
        onClose={handleClose}
      />
    );
  }

  const rawImageUri =
    photoData?.urls?.['500x500'] ||
    photoData?.urls?.['800x1200'] ||
    photoData?.storageUrl ||
    localUri;
  const imageUri = sanitizeS3Uri(rawImageUri || '');
  const metrics = photoData?.metrics;
  const getConcernNameForAPI = (metricKey: string): string | null => {
    if (!metricKey) return null;
    let processedKey = metricKey.endsWith('Score')
      ? metricKey.slice(0, -'Score'.length)
      : metricKey;
    const special: Record<string, string> = {
      hydration: 'Dewiness',
      redness: 'Redness',
      pores: 'Visible Pores',
      acne: 'Breakouts',
      lines: 'Lines',
      translucency: 'Translucency',
      pigmentation: 'Pigmentation',
      uniformness: 'Evenness',
      eyeAge: 'Perceived Eye Age',
      eyeAreaCondition: 'Dark Circles',
      perceivedAge: 'Perceived Age',
      skinTone: 'Skin Tone',
      skinType: 'Skin Type',
      puffiness: 'Eye Puffiness',
      sagging: 'Sagging',
    };
    if (special[processedKey]) return special[processedKey];
    return processedKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim();
  };

  // Get standalone metrics for the profile row
  const profileOrder = ['skinType', 'skinTone', 'perceivedAge', 'eyeAge'];
  const profileMetrics = metrics
    ? profileOrder
      .filter(key => metrics[key] !== undefined)
      .map(key => ({
        key,
        value: metrics[key],
        label: formatMetricName(key),
      }))
    : [];

  // Get score metrics for the analysis section
  const scoreOrder = [
    'pigmentationScore',
    'uniformnessScore',
    'rednessScore',
    'acneScore',
    'eyeAreaCondition',
    'linesScore',
    'poresScore',
    'puffinessScore',
    'saggingScore',
  ];
  const scoreMetrics = metrics
    ? scoreOrder
      .filter(
        key => metrics[key] !== undefined && typeof metrics[key] === 'number',
      )
      .map(key => ({
        key,
        value: metrics[key],
        label: formatMetricName(key),
      }))
    : [];
  const sortedScoreMetrics = (() => {
    if (!Array.isArray(scoreMetrics) || scoreMetrics.length === 0)
      return scoreMetrics;
    if (!topConcerns || topConcerns.length === 0) return scoreMetrics;
    const isTop = (metricKey: string) => {
      const concern = getConcernNameForAPI(metricKey) || '';
      return topConcerns?.includes(concern);
    };
    return [...scoreMetrics].sort((a, b) => {
      const at = isTop(a.key) ? 1 : 0;
      const bt = isTop(b.key) ? 1 : 0;
      return bt - at;
    });
  })();

  console.log('from screen', fromScanTab);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: '#FFFFFF' },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ===== Header ===== */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={handleClose}>
          <ChevronLeft size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <EllipsisMenu onDelete={handleDelete} />
      </View>

      {/* ===== Scrollable Content ===== */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Card */}
        {imageUri ? (
          <TouchableOpacity
            style={styles.photoCard}
            onPress={() => {
              if (photoData) {
                (navigation as any).navigate('MaskViewer', {
                  photoData: JSON.stringify(photoData),
                });
              }
            }}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.photoImage}
              resizeMode="cover"
            />
            <View style={styles.photoOverlayChip}>
              <Text style={styles.photoOverlayChipText}>+ Zoom / Masks</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* AI Insight Card – styled like MyRoutine's RoutineListFooter */}
        {uiState === 'complete' && (
          <TouchableOpacity
            style={styles.aiInsightCard}
            activeOpacity={0.85}
            onPress={handleNavigateToChat}
          >
            <View style={styles.aiAvatarContainer}>
              <Image
                source={require('../assets/images/amber-avatar-new.png')}
                style={styles.aiAvatarImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.aiInsightContent}>
              <Text style={styles.aiInsightTitle}>
                {summary
                  ? summary
                  : summaryLoading
                    ? 'Analyzing your results...'
                    : 'Your skin looks glowing! How is your skin feeling today?'}
              </Text>
              <Text style={styles.aiInsightSubtext}>
                Your reflections help add to your journal and improve your
                outcomes.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Skin Profile Row */}
        {profileMetrics.length > 0 && (
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              {profileMetrics.map((item, index) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.profileItem]}
                  onPress={() => {
                    (navigation as any).navigate('MetricDetail', {
                      metricKey: item.key,
                      metricValue: item.value,
                      maskResults: photoData?.maskResults,
                      maskImages: photoData?.maskImages,
                      photoData: JSON.stringify(photoData || metrics),
                      precomputedChange: scoreChanges[item.key],
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.profileLabel}>{item.label}</Text>
                  <View style={styles.profileValueContainer}>
                    <Text style={styles.profileValue}>{item.value}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Analysis Section */}
        {sortedScoreMetrics.length > 0 && (
          <View style={styles.analysisCard}>
            <Text style={styles.analysisTitle}>Analysis</Text>

            {sortedScoreMetrics.map((item, index) => {
              const { color } = getMetricTag(item.value as number);
              const concernName = getConcernNameForAPI(item.key) || '';
              const isTop = topConcerns?.includes(concernName);
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.analysisRow,
                    index < sortedScoreMetrics.length &&
                    styles.analysisRowBorder,
                  ]}
                  onPress={() => {
                    (navigation as any).navigate('MetricDetail', {
                      metricKey: item.key,
                      metricValue: item.value,
                      maskResults: photoData?.maskResults,
                      maskImages: photoData?.maskImages,
                      photoData: JSON.stringify(photoData || metrics),
                      precomputedChange: scoreChanges[item.key],
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.analysisRowLeft}>
                    <TouchableOpacity
                      onPress={e => {
                        handleToggleTopConcern(concernName);
                      }}
                      disabled={isTogglingConcern}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ marginRight: 6, padding: 4 }}
                    >
                      <Star
                        size={18}
                        color={isTop ? '#00839B' : '#D6D3D1'}
                        fill={isTop ? '#00839B' : 'transparent'}
                      />
                    </TouchableOpacity>
                    <View>
                      <Text style={styles.analysisMetricName}>
                        {item.label}
                      </Text>
                      {item.key === 'poresScore' && (
                        <Text style={styles.analysisMicrotext}>
                          Face a light source for best results
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.analysisRowRight}>
                    <Text style={styles.analysisChangeText}>
                      {scoreChanges[item.key]
                        ? `${scoreChanges[item.key].arrow}${scoreChanges[item.key].value
                        }`
                        : ''}
                    </Text>
                    <View style={styles.analysisDotContainer}>
                      <View
                        style={[styles.analysisDot, { backgroundColor: color }]}
                      />
                      <Text style={styles.analysisScore}>{item.value}</Text>
                    </View>
                    <ChevronRight
                      size={20}
                      color="#D7D3D0"
                      style={{ marginLeft: 4 }}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* SkinCheck Card */}
        {/* {uiState === 'complete' && (
          <TouchableOpacity
            style={styles.skinCheckCard}
            onPress={() => (navigation as any).navigate('SkinCheck')}
            activeOpacity={0.8}
          >
            <View style={styles.skinCheckHeader}>
              <View style={styles.skinCheckTitleRow}>
                <Text style={styles.skinCheckTitle}>Request a SkinCheck</Text>
                <ChevronRight size={24} color="#D1D5DB" />
              </View>
              <Text style={styles.skinCheckDescription}>
                Send this scan, your scores, and your routine to your skin health professional.
              </Text>
            </View>
          </TouchableOpacity>
        )} */}

        {/* No Results State */}
        {uiState === 'no_results' && (
          <View style={styles.noResultsCard}>
            <Text style={styles.noResultsTitle}>No Analysis Available</Text>
            <Text style={styles.noResultsMessage}>
              We couldn't analyze this image. This could be due to poor
              lighting, camera angle, or network issues.
            </Text>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('Camera')}
              activeOpacity={0.7}
            >
              <Text style={styles.noResultsLink}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <BottomTabBar navigation={navigation} />
    </View>
  );
};

// ===== Styles =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
    fontFamily: 'Inter-SemiBold',
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Menu
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 100,
    marginRight: 16,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuDeleteText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#FF3B30',
    fontFamily: 'Inter-Medium',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Photo
  photoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 22,
    backgroundColor: '#E5E7EB',
  },
  photoImage: {
    width: 383,
    height: 383,
    resizeMode: 'contain',
  },
  photoOverlayChip: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    opacity: 0.5,
  },
  photoOverlayChipText: {
    color: '#44403C',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },

  // AI Insight Card
  aiInsightCard: {
    backgroundColor: '#EBE9FE',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  aiAvatarContainer: {
    marginRight: 12,
  },
  aiAvatarImage: {
    width: 36,
    height: 36,
  },
  aiInsightContent: {
    flex: 1,
  },
  aiInsightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#404968',
    lineHeight: 20,
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  aiInsightSubtext: {
    fontSize: 13,
    color: '#5D6B98',
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },

  // Profile Row
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    // alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    // gap: 8,
  },
  profileItem: {
    // flex: 1,
    // alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
    padding: 6,
    borderRadius: 8,
  },
  profileItemBorder: {
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  profileLabel: {
    fontSize: 13,
    color: '#A9A29D',
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'capitalize',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  profileValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1917',
    fontFamily: 'Inter-Bold',
  },

  // Analysis
  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  analysisTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 22,
    fontFamily: 'Inter-Bold',
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  analysisRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4',
  },
  analysisRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  analysisMetricName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#44403C',
    fontFamily: 'Inter-Medium',
  },
  analysisMicrotext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },
  analysisRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analysisChangeText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 8,
    fontFamily: 'Inter-Regular',
  },
  analysisDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  analysisScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#364152',
    minWidth: 24,
    textAlign: 'right',
    fontFamily: 'Inter-Bold',
  },

  // SkinCheck Card
  skinCheckCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  skinCheckHeader: {
    width: '100%',
  },
  skinCheckTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  skinCheckTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  skinCheckDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  skinCheckLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0498B3',
    fontFamily: 'Inter-SemiBold',
  },

  // No Results
  noResultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  noResultsMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  noResultsLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    fontFamily: 'Inter-SemiBold',
  },

  // Loading / Skeleton
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#333',
  },
  loadingHeaderArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  loadingCloseButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  centeredLoaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingMicrocopyCentered: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  fullScreenImageForBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMicrocopyOverlayed: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 30,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  analysisDotContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  profileValueContainer: {
    // backgroundColor: '#F5F5F5',
    // borderRadius: 6,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    // height: 40,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});

export default SnapshotScreen;
