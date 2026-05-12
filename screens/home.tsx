// home.tsx
// New Home screen with photo slider, Top Concerns, and Routine Score

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  DeviceEventEmitter,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Star,
  Plus,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Package,
} from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';
import { colors, spacing, typography, fontFamily } from '../styles';
import HomeHeader from '../components/ui/HomeHeader';
import SettingsDrawer from '../components/layout/SettingsDrawer';
import { usePhotoContext } from '../contexts/PhotoContext';
import useAuthStore from '../stores/authStore';
import {
  getHautAnalysisResults,
  transformHautResults,
  generateConcernMessage,
  getReportHistory,
  getUserRoutineScanMetrics,
  getRoutineItems,
  updateTimezone,
} from '../utils/newApiService';
import SkinCheckCard from '../components/home/SkinCheckCard';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import concernsData from '../data/concerns.json';
import ingredientsData from '../data/Ingredients.json';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Scan placeholder SVG icon
const scanPlaceholderSvg = `<svg width="36" height="36" viewBox="0 0 39 39" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.79199 11.1813V7.98665C4.79199 7.13938 5.12857 6.3268 5.72769 5.72769C6.3268 5.12857 7.13938 4.79199 7.98665 4.79199H11.1813M27.1546 4.79199H30.3493C31.1966 4.79199 32.0091 5.12857 32.6082 5.72769C33.2074 6.3268 33.5439 7.13938 33.5439 7.98665V11.1813M33.5439 27.1546V30.3493C33.5439 31.1966 33.2074 32.0091 32.6082 32.6082C32.0091 33.2074 31.1966 33.5439 30.3493 33.5439H27.1546M11.1813 33.5439H7.98665C7.13938 33.5439 6.3268 33.2074 5.72769 32.6082C5.12857 32.0091 4.79199 31.1966 4.79199 30.3493V27.1546" stroke="#D7D3D0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M5.33484 21.2271H32.7075" stroke="#D7D3D0" stroke-width="2" stroke-linecap="round"/>
<path d="M5.33484 21.2271H32.7075" stroke="#D7D3D0" stroke-width="2" stroke-linecap="round"/>
<mask id="mask0_18967_6961" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="8" y="0" width="22" height="19">
<rect x="8.37091" width="21.1007" height="18.8018" fill="#D92F2F"/>
</mask>
<g mask="url(#mask0_18967_6961)">
<path d="M18.8335 5.59106C14.6203 5.59106 12.6891 9.35276 12.2501 10.9566V14.104C11.4961 14.7863 11.1013 16.6572 12.2501 17.9976" stroke="#D7D3D0" stroke-width="2" stroke-linecap="round"/>
<path d="M18.8347 5.59106C23.0479 5.59106 24.9791 9.35276 25.418 10.9566V14.104C26.172 14.7863 26.5668 16.6572 25.418 17.9976" stroke="#D7D3D0" stroke-width="2" stroke-linecap="round"/>
</g>
<path d="M13.6968 21.8445C14.2535 22.6501 15.5156 24.3849 16.1099 24.8788C16.8527 25.4962 18.1058 26.422 19.0341 26.422M15.4532 24.1833C15.5305 25.2806 14.9962 28.2754 14.7794 29.1721C14.6477 29.7169 14.3975 30.2202 14.0862 30.6831" stroke="#D7D3D0" stroke-width="2" stroke-linecap="round"/>
<path d="M24.3664 21.8445C23.8096 22.6501 22.5475 24.3849 21.9533 24.8788C21.2105 25.4962 19.9573 26.422 19.0291 26.422M22.61 24.1833C22.5327 25.2806 23.067 28.2754 23.2838 29.1721C23.4155 29.7169 23.6657 30.2202 23.977 30.6831" stroke="#D7D3D0" stroke-width="2" stroke-linecap="round"/>
</svg>
`;

interface TopConcern {
  name: string;
  metricKey: string;
  value: number;
  change: number | null; // positive = improved, negative = worsened
  changeText: string;
  changeDirection: 'up' | 'down' | 'none'; // up arrow, down arrow, or no change
  ingredients: string[]; // from concerns.json advice.ingredients
  foundIngredients: Array<string | { ingredient: string; products?: string[] }>;
  ingredientsLoading: boolean;
}

// Helper function to convert metricKey to concern name for API
const getConcernNameForAPI = (metricKey: string) => {
  if (!metricKey) return null;
  let processedKey = metricKey;
  if (processedKey.endsWith('Score')) {
    processedKey = processedKey.substring(
      0,
      processedKey.length - 'Score'.length,
    );
  }
  const specialCases: Record<string, string> = {
    hydration: 'Dewiness',
    redness: 'Redness',
    pores: 'Visible Pores',
    acne: 'Breakouts',
    lines: 'Lines',
    translucency: 'Translucency',
    pigmentation: 'Pigmentation',
    uniformness: 'Evenness',
    eyeAreaCondition: 'Dark Circles',
  };
  if (specialCases[processedKey]) {
    return specialCases[processedKey];
  }
  return processedKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

// Helper function to get ingredients from Ingredients.json based on metricKey
const getIngredientsForMetric = (metricKey: string): string[] => {
  if (!metricKey) return [];

  const mapping: Record<string, string> = {
    acneScore: 'Acne',
    pigmentationScore: 'Pigmentation',
    uniformnessScore: 'Uniformness',
    rednessScore: 'Redness',
    linesScore: 'Lines',
    poresScore: 'Pores',
    hydrationScore: 'Hydration',
    eyeAreaCondition: 'Dark Circles',
    puffinessScore: 'Puffiness',
  };

  const concernName =
    mapping[metricKey] || mapping[metricKey.replace('Score', '')];
  if (!concernName) return [];

  const concern = (ingredientsData.SKIN_CONCERNS as any[]).find(
    c => c.name === concernName,
  );
  return concern ? concern.Ingredients : [];
};

// Image with skeleton loading component
// Always shows skeleton until the image actually finishes painting.
// Global cache to track which images have already been loaded
// This prevents the skeleton from flashing repeatedly for images we already fetched.
const ImageWithSkeleton = ({
  uri,
  style,
  onPress,
  containerStyle,
  forceLoading = false, // Allows parent to force a skeleton overlay (e.g. during pull-to-refresh)
}: {
  uri: string;
  style: any;
  onPress: () => void;
  containerStyle?: any;
  forceLoading?: boolean;
}) => {
  // Always start with loading true so the skeleton shows immediately.
  // This prevents the card from appearing "empty" while the image decodes.
  const [isImageLoading, setIsImageLoading] = useState(true);

  const shouldShowSkeleton = isImageLoading || forceLoading;

  if (!uri) {
    return (
      <TouchableOpacity
        style={containerStyle || styles.carouselItemContainer}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={[style, styles.emptyPhotoContainer]} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={containerStyle || styles.carouselItemContainer}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.imageContainer, { backgroundColor: 'transparent' }]}>
        {/* The skeleton always renders until the image is 100% painted OR if artificially forced */}
        {shouldShowSkeleton && (
          <View
            style={[
              styles.imageSkeleton,
              { width: style.width, height: style.height },
            ]}
          >
            <SkeletonPlaceholder borderRadius={32}>
              <SkeletonPlaceholder.Item
                width={style.width || 173}
                height={style.height || 173}
                borderRadius={32}
              />
            </SkeletonPlaceholder>
          </View>
        )}

        {/* Image paints directly over the skeleton, then skeleton unmounts. No transparency gap. */}
        <Image
          source={{ uri }}
          style={style}
          resizeMode="cover"
          onLoad={() => setIsImageLoading(false)}
          onError={() => setIsImageLoading(false)}
        />
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);
  const {
    photos,
    isLoading,
    refreshPhotos,
    loadMorePhotos,
    pagination,
    isLoadingMore,
    setSelectedSnapshot,
  } = usePhotoContext();
  const { user, profile, hasSeenRoutineAlert, setHasSeenRoutineAlert } =
    useAuthStore();

  // Date group navigation state
  const [currentDateIndex, setCurrentDateIndex] = useState<number>(0);
  const [currentPhotoInDate, setCurrentPhotoInDate] = useState<number>(0);

  // Carousel ref
  const carouselRef = useRef<ICarouselInstance>(null);

  // Top concerns state
  const [topConcerns, setTopConcerns] = useState<TopConcern[]>([]);
  const [isLoadingConcerns, setIsLoadingConcerns] = useState<boolean>(false);
  const loadedConcernsPhotoIdRef = useRef<string | null>(null);
  const [expandedConcerns, setExpandedConcerns] = useState<
    Record<string, boolean>
  >({});

  // Skin Check reports state
  const [reports, setReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(true);

  // User metrics state
  const [userMetrics, setUserMetrics] = useState<{
    total_routines: number;
    total_face_scans: number;
  } | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true);

  // Review-ready routine items state
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [isLoadingReview, setIsLoadingReview] = useState<boolean>(true);
  const [isReviewExpanded, setIsReviewExpanded] = useState<boolean>(false);

  // Toggle ingredient visibility for a concern
  const toggleConcernExpanded = (concernName: string) => {
    setExpandedConcerns(prev => ({
      ...prev,
      [concernName]: !prev[concernName],
    }));
  };

  // Group photos by date
  const dateGroups = useMemo(() => {
    const groups: { date: string; dateLabel: string; photos: any[] }[] = [];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Always include "today" as first option (even if no photos)
    groups.push({
      date: format(today, 'yyyy-MM-dd'),
      dateLabel: 'TODAY',
      photos: [],
    });

    // Group existing photos by date
    photos.forEach((photo: any) => {
      // Skip photos with empty storageUrl
      if (!photo.storageUrl) return;

      const photoDate = photo.timestamp
        ? new Date(photo.timestamp)
        : new Date();
      const dateKey = format(photoDate, 'yyyy-MM-dd');
      let dateLabel = format(photoDate, 'MMM d').toUpperCase();

      if (isToday(photoDate)) {
        dateLabel = 'TODAY';
      } else if (isYesterday(photoDate)) {
        dateLabel = 'YESTERDAY';
      }

      const existingGroup = groups.find(g => g.date === dateKey);
      if (existingGroup) {
        existingGroup.photos.push(photo);
      } else {
        groups.push({
          date: dateKey,
          dateLabel,
          photos: [photo],
        });
      }
    });

    // Sort by date descending (newest first)
    groups.sort((a, b) => b.date.localeCompare(a.date));
    return groups;
  }, [photos]);

  // Current date group and photo
  const currentDateGroup = dateGroups[currentDateIndex] || dateGroups[0];
  const currentPhoto = currentDateGroup?.photos[currentPhotoInDate];
  const hasPhotosForCurrentDate = currentDateGroup?.photos.length > 0;

  // console.log("currentPhoto", currentPhoto);
  console.log('currentDateGroup', currentDateGroup);

  // Refresh photos when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshPhotos();
      loadReportHistory();
      loadUserMetrics();
      loadReviewItems();
      sendTimezone();
    }, []),
  );

  const sendTimezone = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await updateTimezone(timezone);
    } catch (error) {
      // Silently fail - timezone update is not critical
    }
  };

  const loadReviewItems = async () => {
    try {
      setIsLoadingReview(true);
      const response = (await getRoutineItems()) as any;
      if (response.success && response.data) {
        const typeMap: { [key: string]: string } = {
          product: 'Product',
          activity: 'Activity',
          nutrition: 'Nutrition',
          treatment_facial: 'Treatment / Facial',
          treatment_injection: 'Treatment / Injection',
          treatment_other: 'Treatment / Other',
          injectables: 'Injectables',
        };
        const usageMap: { [key: string]: string } = {
          am: 'AM',
          pm: 'PM',
          both: 'AM + PM',
          as_needed: 'As needed',
          AM: 'AM',
          PM: 'PM',
          Both: 'AM + PM',
          'As needed': 'As needed',
        };
        const frequencyMap: { [key: string]: string } = {
          daily: 'Daily',
          weekly: 'Weekly',
          as_needed: 'As needed',
        };
        const getDate = (dateValue: any): Date | null => {
          if (!dateValue) return null;
          try {
            return new Date(dateValue);
          } catch {
            return null;
          }
        };

        const transformed = response.data.map((apiItem: any) => ({
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
          upc: apiItem.upc || undefined,
          brand: apiItem.brand_name || apiItem.brand || undefined,
          image_url: apiItem.image_url || undefined,
          extra: apiItem.extra || {},
        }));

        const readyToReview = transformed.filter((item: any) => {
          if (
            !item.concern_tracking ||
            item.concern_tracking.length === 0 ||
            item.is_tracking_paused
          ) {
            return false;
          }
          return item.concern_tracking.some(
            (t: any) => t.is_completed === true && t.is_effective === null,
          );
        });

        setReviewItems(readyToReview);
      } else {
        setReviewItems([]);
      }
    } catch (error) {
      console.error('Error loading review items:', error);
      setReviewItems([]);
    } finally {
      setIsLoadingReview(false);
    }
  };

  const loadUserMetrics = async () => {
    try {
      setIsLoadingMetrics(true);
      const response = (await getUserRoutineScanMetrics()) as any;
      if (response.success && response.data) {
        setUserMetrics(response.data);
      }
    } catch (error) {
      console.error('Error loading user metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  // Show routine evaluation alert if conditions are met
  useEffect(() => {
    if (
      userMetrics &&
      userMetrics.total_face_scans >= 1 &&
      userMetrics.total_routines === 0 &&
      !hasSeenRoutineAlert
    ) {
      Alert.alert(
        'Add to your routine',
        'Please add the products and treatments you are currently using to your routine so we can tell you what ingredients your skin is missing',
        [
          {
            text: 'OK',
            onPress: () => setHasSeenRoutineAlert(true),
          },
        ],
      );
    }
  }, [userMetrics, hasSeenRoutineAlert, setHasSeenRoutineAlert]);

  // Specifically refresh when a new photo is uploaded
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('photoUploaded', () => {
      refreshPhotos();
    });
    return () => subscription.remove();
  }, [refreshPhotos]);

  const loadReportHistory = async () => {
    try {
      setIsLoadingReports(true);
      const response = (await getReportHistory()) as any;
      if (response.success) {
        setReports(
          response.reports && response.reports.length > 0
            ? [response.reports[0]]
            : [],
        );
      }
    } catch (error) {
      console.error('Error loading report history:', error);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Load concerns for current photo when it changes (skip if same photo)
  const currentPhotoId =
    currentPhoto?.id || currentPhoto?.hautUploadData?.imageId || null;
  useEffect(() => {
    if (currentPhoto) {
      const photoId = currentPhoto.id || currentPhoto.hautUploadData?.imageId;
      if (photoId && photoId === loadedConcernsPhotoIdRef.current) {
        return; // Already loaded concerns for this photo
      }
      loadConcernsForPhoto(currentPhoto);
    } else {
      loadedConcernsPhotoIdRef.current = null;
      setTopConcerns([]);
    }
  }, [currentPhotoId]);

  // Load concerns for the current photo
  const loadConcernsForPhoto = async (photo: any) => {
    if (!photo?.id && !photo?.hautUploadData?.imageId) return;

    const imageId = photo.hautUploadData?.imageId || photo.id;
    const hautBatchId = photo.hautUploadData?.hautBatchId || photo.hautBatchId;
    loadedConcernsPhotoIdRef.current = photo.id || imageId;
    setIsLoadingConcerns(true);

    try {
      // Get current photo results - use hautBatchId for API call
      const results = await getHautAnalysisResults(hautBatchId || imageId);

      // Find previous photo to compare (in the current date group or earlier)
      let previousMetrics: any = null;

      // Look for previous photo in same date group first
      if (
        currentPhotoInDate > 0 &&
        currentDateGroup?.photos[currentPhotoInDate - 1]
      ) {
        const prevPhoto = currentDateGroup.photos[currentPhotoInDate - 1];
        const prevHautBatchId =
          prevPhoto.hautUploadData?.hautBatchId ||
          prevPhoto.hautBatchId ||
          prevPhoto.id;
        try {
          const prevResults = await getHautAnalysisResults(prevHautBatchId);
          if (prevResults && prevResults.length > 0) {
            previousMetrics = transformHautResults(prevResults) as any;
          }
        } catch (e) {
          // console.log('Could not load previous photo metrics');
        }
      }
      // If no previous in same date, look in previous date group
      else if (currentDateIndex < dateGroups.length - 1) {
        const prevDateGroup = dateGroups[currentDateIndex + 1];
        if (prevDateGroup?.photos.length > 0) {
          const prevPhoto =
            prevDateGroup.photos[prevDateGroup.photos.length - 1]; // Most recent from prev date
          const prevHautBatchId =
            prevPhoto.hautUploadData?.hautBatchId ||
            prevPhoto.hautBatchId ||
            prevPhoto.id;
          try {
            const prevResults = await getHautAnalysisResults(prevHautBatchId);
            if (prevResults && prevResults.length > 0) {
              previousMetrics = transformHautResults(prevResults) as any;
            }
          } catch (e) {
            // console.log('Could not load previous photo metrics');
          }
        }
      }

      if (results && results.length > 0) {
        const transformedMetrics: any = transformHautResults(results);

        // Helper function to calculate change
        const calculateChange = (
          currentValue: number,
          previousValue: number | undefined,
        ): {
          change: number | null;
          changeText: string;
          changeDirection: 'up' | 'down' | 'none';
        } => {
          if (previousValue === undefined) {
            return { change: null, changeText: '', changeDirection: 'none' };
          }
          const diff = currentValue - previousValue;
          if (diff === 0) {
            return { change: 0, changeText: '', changeDirection: 'none' };
          }
          const absDiff = Math.abs(Math.round(diff));
          // For skin scores, higher is generally better, so positive diff = improvement (up arrow)
          if (diff > 0) {
            return {
              change: diff,
              changeText: `↑${absDiff}`,
              changeDirection: 'up',
            };
          } else {
            return {
              change: diff,
              changeText: `↓${absDiff}`,
              changeDirection: 'down',
            };
          }
        };

        // Define map of all supported metric keys -> Concern Name
        const METRIC_TO_CONCERN_MAP: Record<string, string> = {
          pigmentationScore: 'Pigmentation',
          uniformnessScore: 'Evenness',
          rednessScore: 'Redness',
          acneScore: 'Breakouts',
          poresScore: 'Visible Pores',
          linesScore: 'Lines',
          hydrationScore: 'Dewiness',
          eyeAreaCondition: 'Dark Circles',
          puffinessScore: 'Eye Puffiness',
          skinType: 'Skin Type',
        };

        // Extract top concerns dynamically
        const concerns: TopConcern[] = [];

        Object.entries(METRIC_TO_CONCERN_MAP).forEach(
          ([metricKey, concernName]) => {
            if (
              transformedMetrics[metricKey] !== undefined &&
              transformedMetrics[metricKey] !== null
            ) {
              if (
                transformedMetrics.topConcerns &&
                transformedMetrics.topConcerns.includes(metricKey)
              ) {
                const changeInfo = calculateChange(
                  transformedMetrics[metricKey],
                  previousMetrics?.[metricKey],
                );

                // Look up ingredients from Ingredients.json instead of concerns.json
                let ingredients: string[] = getIngredientsForMetric(metricKey);

                concerns.push({
                  name: concernName,
                  metricKey,
                  value: transformedMetrics[metricKey],
                  ...changeInfo,
                  ingredients,
                  foundIngredients: [],
                  ingredientsLoading: ingredients.length > 0,
                });
              }
            }
          },
        );

        setTopConcerns(concerns);

        // Fetch routine-match data for each concern's ingredients
        concerns.forEach(async concern => {
          if (concern.ingredients.length === 0) return;
          const apiConcernName = getConcernNameForAPI(concern.metricKey);
          if (!apiConcernName) return;
          try {
            const response = (await generateConcernMessage(
              apiConcernName,
            )) as any;
            if (response?.success && response.data) {
              setTopConcerns(prev =>
                prev.map(c =>
                  c.metricKey === concern.metricKey
                    ? {
                      ...c,
                      foundIngredients: response.data.found_ingredients || [],
                      ingredientsLoading: false,
                    }
                    : c,
                ),
              );
            } else {
              setTopConcerns(prev =>
                prev.map(c =>
                  c.metricKey === concern.metricKey
                    ? { ...c, ingredientsLoading: false }
                    : c,
                ),
              );
            }
          } catch {
            setTopConcerns(prev =>
              prev.map(c =>
                c.metricKey === concern.metricKey
                  ? { ...c, ingredientsLoading: false }
                  : c,
              ),
            );
          }
        });
      }
    } catch (error) {
      // console.log('Error loading concerns:', error);
    } finally {
      setIsLoadingConcerns(false);
    }
  };

  // Listen for top concern changes to refetch metrics
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'refreshTopConcerns',
      () => {
        if (currentPhoto) {
          // Clear the ref to force re-fetch
          loadedConcernsPhotoIdRef.current = null;
          loadConcernsForPhoto(currentPhoto);
        }
      },
    );
    return () => subscription.remove();
  }, [currentPhoto, loadConcernsForPhoto]);

  // Navigate between dates
  const goToPrevDate = () => {
    if (currentDateIndex < dateGroups.length - 1) {
      const newIndex = currentDateIndex + 1;
      setCurrentDateIndex(newIndex);
      setCurrentPhotoInDate(0);

      // Trigger loading more photos when approaching the end (within 3 date groups)
      if (
        pagination.has_next &&
        !isLoadingMore &&
        newIndex >= dateGroups.length - 3
      ) {
        // console.log('🔵 HOME: Loading more photos - approaching end of date groups');
        loadMorePhotos();
      }
    }
  };

  const goToNextDate = () => {
    if (currentDateIndex > 0) {
      setCurrentDateIndex(currentDateIndex - 1);
      setCurrentPhotoInDate(0);
    }
  };

  // Navigate between photos within same date (called by carousel)
  const handleCarouselSnap = (index: number) => {
    if (index >= 0 && index < currentDateGroup.photos.length) {
      setCurrentPhotoInDate(index);
    }
  };

  // Format date for display
  const getDateLabel = (photo: any) => {
    if (!photo?.timestamp) return 'TODAY';
    const date = new Date(photo.timestamp);
    if (isToday(date)) return 'TODAY';
    if (isYesterday(date)) return 'YESTERDAY';
    return format(date, 'MMM d').toUpperCase();
  };

  // Get score indicator color
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#22C55E'; // Green
    if (score >= 50) return '#EAB308'; // Yellow
    return '#EF4444'; // Red
  };

  const handleMenuPress = (): void => {
    setIsSettingsVisible(true);
  };

  const handlePhotoPress = (photo?: any) => {
    const targetPhoto = photo || currentPhoto;
    if (targetPhoto) {
      // Set selected snapshot in context before navigating
      const timestamp =
        targetPhoto.apiData?.created_at ||
        (targetPhoto.timestamp
          ? new Date(targetPhoto.timestamp).toISOString()
          : null);

      setSelectedSnapshot({
        id: targetPhoto.id,
        url: targetPhoto.storageUrl,
        storageUrl: targetPhoto.storageUrl,
        threadId: targetPhoto.threadId,
        apiData: {
          created_at: timestamp,
        },
      });

      (navigation as any).navigate('Snapshot', {
        photoId: targetPhoto.id,
        thumbnailUrl: targetPhoto.storageUrl,
        localUri: targetPhoto.storageUrl,
        timestamp: timestamp,
        fromPhotoGrid: 'true',
        hautBatchId:
          targetPhoto.hautUploadData?.hautBatchId || targetPhoto.hautBatchId,
        imageId: targetPhoto.hautUploadData?.imageId || targetPhoto.id,
      });
    }
  };

  // Skeleton Loading Component for Photo Slider
  const PhotoSliderSkeleton = () => (
    <View style={styles.carouselContainer}>
      <Carousel
        key="carousel-skeleton"
        loop={false}
        width={SCREEN_WIDTH - 36}
        height={173}
        style={{
          width: SCREEN_WIDTH - 64,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        data={[1, 2, 3]}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 1.0,
          parallaxScrollingOffset: 50,
        }}
        renderItem={() => (
          <View style={styles.carouselItemContainer}>
            <SkeletonPlaceholder borderRadius={32}>
              <SkeletonPlaceholder.Item
                width={173}
                height={173}
                borderRadius={32}
              />
            </SkeletonPlaceholder>
          </View>
        )}
      />
    </View>
  );

  // Skeleton Loading Component for Concerns
  const ConcernsSkeleton = () => (
    <SkeletonPlaceholder borderRadius={4}>
      <SkeletonPlaceholder.Item>
        {[1, 2, 3].map(item => (
          <SkeletonPlaceholder.Item
            key={item}
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            marginBottom={10}
            paddingHorizontal={16}
            paddingVertical={16}
          >
            <SkeletonPlaceholder.Item
              width={100}
              height={20}
              borderRadius={4}
            />
            <SkeletonPlaceholder.Item
              width={80}
              height={28}
              borderRadius={12}
            />
          </SkeletonPlaceholder.Item>
        ))}
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
  );

  // Stable callback for carousel item press to avoid re-renders
  // We strictly use the passed item, so we don't depend on currentPhoto or handlePhotoPress
  const onCarouselItemPress = useCallback(
    (item: any) => {
      if (item) {
        // Set selected snapshot in context before navigating
        const timestamp =
          item.apiData?.created_at ||
          (item.timestamp ? new Date(item.timestamp).toISOString() : null);

        setSelectedSnapshot({
          id: item.id,
          url: item.storageUrl,
          storageUrl: item.storageUrl,
          threadId: item.threadId,
          apiData: {
            created_at: timestamp,
          },
        });

        (navigation as any).navigate('Snapshot', {
          photoId: item.id,
          thumbnailUrl: item.storageUrl,
          localUri: item.storageUrl,
          timestamp: timestamp,
          fromPhotoGrid: 'true',
          hautBatchId: item.hautUploadData?.hautBatchId || item.hautBatchId,
          imageId: item.hautUploadData?.imageId || item.id,
        });
      }
    },
    [navigation, setSelectedSnapshot],
  );

  // Render carousel item with skeleton loading (Memoized to prevent unnecessary re-renders)
  const renderCarouselItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <ImageWithSkeleton
        key={item.storageUrl}
        uri={item.storageUrl}
        style={styles.carouselImage}
        onPress={() => onCarouselItemPress(item)}
        forceLoading={isLoading}
      />
    ),
    [onCarouselItemPress, isLoading],
  );

  const handleNewScan = () => {
    (navigation as any).navigate('Camera');
  };

  const handleNavigateToProductDetail = (item: any) => {
    (navigation as any).navigate('ProductDetail', {
      itemId: item.id,
      productData: {
        product_name: item.name,
        brand: item.extra?.brand,
        upc: item.upc || undefined,
        ingredients: item.extra?.ingredients || [],
        good_for: item.extra?.good_for || [],
        product_image: item.image_url || item.extra?.image_url,
        image_url: item.image_url || item.extra?.image_url,
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
        is_tracking_paused: item.is_tracking_paused,
      },
      upc: item.upc || undefined,
    });
  };

  return (
    <View style={styles.container}>
      <HomeHeader onMenuPress={handleMenuPress} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Slider Section */}
        <View style={styles.photoSliderCard}>
          {/* Top Navigation Row */}
          <View style={styles.sliderNavRow}>
            {/* Left Arrow - Go to older date */}
            <TouchableOpacity
              style={[
                styles.arrowButton,
                currentDateIndex >= dateGroups.length - 1 &&
                styles.arrowButtonDisabled,
              ]}
              onPress={goToPrevDate}
              disabled={currentDateIndex >= dateGroups.length - 1}
            >
              <ChevronLeft
                size={20}
                color={
                  currentDateIndex >= dateGroups.length - 1
                    ? '#C4C4C4'
                    : '#666666'
                }
              />
            </TouchableOpacity>

            {/* Date Badge */}
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>
                {currentDateGroup?.dateLabel || 'TODAY'}
              </Text>
            </View>

            {/* Right Arrow - Go to newer date */}
            <TouchableOpacity
              style={[
                styles.arrowButton,
                currentDateIndex === 0 && styles.arrowButtonDisabled,
              ]}
              onPress={goToNextDate}
              disabled={currentDateIndex === 0}
            >
              <ChevronRight
                size={20}
                color={currentDateIndex === 0 ? '#C4C4C4' : '#666666'}
              />
            </TouchableOpacity>
          </View>

          {/* Photo Container */}
          {isLoading && photos.length === 0 ? (
            <PhotoSliderSkeleton />
          ) : hasPhotosForCurrentDate && currentDateGroup.photos.length > 1 ? (
            /* 3D Carousel for multiple photos - 3 images visible */
            <View style={styles.carouselContainer}>
              <Carousel
                key={`carousel-${currentDateGroup?.date}-${currentDateGroup?.photos?.length}`}
                ref={carouselRef}
                loop={false}
                width={SCREEN_WIDTH - 36}
                height={173}
                style={{
                  width: SCREEN_WIDTH - 64,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                data={[...currentDateGroup.photos].reverse()}
                mode="parallax"
                modeConfig={{
                  parallaxScrollingScale: 1.0,
                  parallaxScrollingOffset: 200,
                  parallaxAdjacentItemScale: 0.8,
                }}
                scrollAnimationDuration={300}
                // onSnapToItem={handleCarouselSnap}
                onSnapToItem={index => {
                  // Reverse the index back to match original photo array
                  const photosCount = currentDateGroup?.photos?.length || 0;
                  const reversedIndex =
                    photosCount > 0 ? photosCount - 1 - index : 0;
                  handleCarouselSnap(reversedIndex);
                }}
                defaultIndex={Math.max(
                  0,
                  Math.min(
                    (currentDateGroup?.photos?.length || 0) - 1,
                    (currentDateGroup?.photos?.length || 0) -
                    1 -
                    currentPhotoInDate,
                  ),
                )}
                // defaultIndex={currentPhotoInDate}
                renderItem={renderCarouselItem}
              />
            </View>
          ) : hasPhotosForCurrentDate ? (
            /* Single photo display with skeleton loading */
            <View style={styles.photoWrapper}>
              <ImageWithSkeleton
                uri={currentPhoto?.storageUrl || ''}
                style={styles.photo}
                onPress={() => handlePhotoPress()}
                containerStyle={styles.singlePhotoContainer}
                forceLoading={isLoading}
              />
            </View>
          ) : (
            <View style={styles.photoWrapper}>
              <View style={styles.emptyPhotoContainer}>
                {/* Face Scan Icon */}
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F5F5F5',
                    borderRadius: 99,
                    padding: 15,
                  }}
                >
                  <SvgXml xml={scanPlaceholderSvg} width={50} height={50} />
                </View>
                {/* New Scan Button */}
                <TouchableOpacity
                  style={styles.newScanButton}
                  onPress={handleNewScan}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.newScanButtonText}>New Scan</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* No dots/indicators - using 3D carousel effect instead */}
        </View>

        {/* User Metrics Section - Requested Design */}
        {userMetrics && (
          <View style={styles.metricsProfileCard}>
            <View style={styles.metricsProfileRow}>
              <View style={styles.metricsProfileItem}>
                <Text style={styles.metricsProfileLabel}>Facial Scans</Text>
                <View style={styles.metricsProfileValueContainer}>
                  <Text style={styles.metricsProfileValue}>
                    {userMetrics.total_face_scans}
                  </Text>
                </View>
              </View>
              <View style={styles.metricsProfileItem}>
                <Text style={styles.metricsProfileLabel}>Items in Routine</Text>
                <View style={styles.metricsProfileValueContainer}>
                  <Text style={styles.metricsProfileValue}>
                    {userMetrics.total_routines}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Top Concerns Section */}
        {(isLoadingConcerns || topConcerns.length > 0) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Top Concerns and Helpful Ingredients
              </Text>
            </View>

            {isLoadingConcerns ? (
              <ConcernsSkeleton />
            ) : topConcerns.length > 0 ? (
              <>
                <Text style={styles.concernSubtitle}>
                  Dermatologists recommend at least one of the following
                  ingredients for your concerns
                </Text>
                {topConcerns.map(concern => {
                  const isExpanded = expandedConcerns[concern.name] ?? false;
                  const MAX_VISIBLE = 2;
                  const hasAtLeastOne =
                    concern.foundIngredients &&
                    concern.foundIngredients.length > 0;
                  const showToggle =
                    hasAtLeastOne && concern.ingredients.length > MAX_VISIBLE;
                  const visibleIngredients =
                    showToggle && !isExpanded
                      ? concern.ingredients.slice(0, MAX_VISIBLE)
                      : concern.ingredients;
                  const hasMore = showToggle;

                  return (
                    <View key={concern.name} style={styles.concernCard}>
                      {/* Concern Header Row */}
                      <TouchableOpacity
                        style={styles.concernHeaderRow}
                        onPress={() => {
                          (navigation as any).navigate('MetricDetail', {
                            metricKey: concern.metricKey,
                            metricValue: concern.value,
                            photoData: currentPhoto
                              ? JSON.stringify(currentPhoto)
                              : undefined,
                            precomputedChange:
                              concern.change !== undefined &&
                                concern.changeDirection &&
                                concern.changeDirection !== 'none'
                                ? {
                                  arrow:
                                    concern.changeDirection === 'up'
                                      ? '↑'
                                      : '↓',
                                  value: Math.abs(concern.change || 0),
                                }
                                : concern.change !== undefined
                                  ? { arrow: '→', value: 0 }
                                  : undefined,
                          });
                        }}
                      >
                        <Text style={styles.concernName}>{concern.name}</Text>
                        <View style={styles.concernValueContainer}>
                          <View style={styles.scoreBadge}>
                            {concern.changeDirection === 'up' && (
                              <View style={styles.changeIndicator}>
                                <ArrowUp size={12} color="#44403C" />
                                <Text style={styles.changeValue}>
                                  {Math.abs(concern.change || 0)}
                                </Text>
                              </View>
                            )}
                            {concern.changeDirection === 'down' && (
                              <View style={styles.changeIndicator}>
                                <ArrowDown size={12} color="#44403C" />
                                <Text style={styles.changeValue}>
                                  {Math.abs(concern.change || 0)}
                                </Text>
                              </View>
                            )}
                            <View style={styles.scoreIndicatorContainer}>
                              <View
                                style={[
                                  styles.scoreIndicator,
                                  {
                                    backgroundColor: getScoreColor(
                                      concern.value,
                                    ),
                                  },
                                ]}
                              />
                              <Text style={styles.concernValue}>
                                {concern.value}
                              </Text>
                            </View>
                          </View>
                          <ChevronRight size={24} color="#A9A29D" />
                        </View>
                      </TouchableOpacity>

                      {/* Ingredient Rows */}
                      {concern.ingredientsLoading ? (
                        <View style={styles.ingredientLoadingContainer}>
                          <SkeletonPlaceholder borderRadius={4}>
                            <SkeletonPlaceholder.Item>
                              {[1, 2].map(i => (
                                <SkeletonPlaceholder.Item
                                  key={i}
                                  flexDirection="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  paddingVertical={10}
                                  paddingHorizontal={4}
                                >
                                  <SkeletonPlaceholder.Item
                                    width={100}
                                    height={14}
                                    borderRadius={4}
                                  />
                                  <SkeletonPlaceholder.Item
                                    width={80}
                                    height={14}
                                    borderRadius={4}
                                  />
                                </SkeletonPlaceholder.Item>
                              ))}
                            </SkeletonPlaceholder.Item>
                          </SkeletonPlaceholder>
                        </View>
                      ) : concern.ingredients.length > 0 ? (
                        <View style={styles.ingredientListContainer}>
                          {visibleIngredients.map((ingredient, idx) => {
                            const colonIndex = ingredient.indexOf(':');
                            const ingredientName =
                              colonIndex > 0
                                ? ingredient.substring(0, colonIndex).trim()
                                : ingredient.trim();
                            const ingredientDesc =
                              colonIndex > 0
                                ? ingredient.substring(colonIndex + 1).trim()
                                : '';

                            const foundEntry = concern.foundIngredients?.find(
                              found => {
                                if (typeof found === 'string') {
                                  return (
                                    found.toLowerCase().trim() ===
                                    ingredientName.toLowerCase().trim()
                                  );
                                }
                                return (
                                  (found as any)?.ingredient
                                    ?.toLowerCase()
                                    .trim() ===
                                  ingredientName.toLowerCase().trim()
                                );
                              },
                            );
                            const isFound = Boolean(foundEntry);
                            const isLast =
                              idx === visibleIngredients.length - 1 && !hasMore;

                            return (
                              <TouchableOpacity
                                key={idx}
                                style={[
                                  styles.ingredientRow,
                                  !isLast && styles.ingredientRowBorder,
                                ]}
                                onPress={() => {
                                  const message = `Tell me more about ${ingredientName.toLowerCase()} and how it can help my skin.`;
                                  (navigation as any).navigate('ThreadChat', {
                                    chatType: 'ingredients_related_chat',
                                    initialMessage: message,
                                    draftMessage: message,
                                    hideInitial: true,
                                    imageId: currentPhotoId,
                                  });
                                }}
                              >
                                <View style={{ flex: 1 }}>
                                  <View style={styles.ingredientNameRow}>
                                    <Text style={styles.ingredientName}>
                                      {ingredientName}
                                    </Text>
                                    <ChevronRight size={24} color="#A9A29D" />
                                  </View>
                                  <View style={styles.routineChip}>
                                    <View
                                      style={[
                                        styles.routineDot,
                                        {
                                          backgroundColor: isFound
                                            ? '#12B76A'
                                            : '#A9A29D',
                                        },
                                      ]}
                                    />
                                    <Text style={styles.routineText}>
                                      {isFound
                                        ? 'In your Routine'
                                        : 'Not in Routine'}
                                    </Text>
                                  </View>
                                  {isFound &&
                                    foundEntry &&
                                    typeof foundEntry !== 'string' &&
                                    Array.isArray(foundEntry.products) &&
                                    foundEntry.products.length > 0 ? (
                                    <View>
                                      {foundEntry.products.map(
                                        (product: string, pIdx: number) => (
                                          <Text
                                            key={pIdx}
                                            style={styles.productHighlight}
                                          >
                                            {product}
                                          </Text>
                                        ),
                                      )}
                                    </View>
                                  ) : ingredientDesc ? (
                                    <Text style={styles.ingredientDesc}>
                                      {ingredientDesc.charAt(0).toUpperCase() +
                                        ingredientDesc.slice(1)}
                                    </Text>
                                  ) : null}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                          {hasMore && (
                            <TouchableOpacity
                              style={styles.showMoreButton}
                              onPress={() =>
                                toggleConcernExpanded(concern.name)
                              }
                            >
                              <Text style={styles.showMoreText}>
                                {isExpanded ? 'Show less' : 'Show more'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </>
            ) : null}
          </View>
        )}

        {/* Review Effectiveness Section */}
        {!isLoadingReview && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Review Products & Treatments Effectiveness
              </Text>
            </View>
            {reviewItems.length > 0 ? (
              <>
                {(isReviewExpanded ? reviewItems : reviewItems.slice(0, 3)).map(
                  item => {
                    const brandName = item.extra?.brand || item.brand || '';
                    const imageUrl = item.extra?.image_url || item.image_url;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.reviewItemCard}
                        onPress={() => handleNavigateToProductDetail(item)}
                        activeOpacity={0.9}
                      >
                        <View style={styles.reviewItemImageContainer}>
                          {imageUrl ? (
                            <Image
                              source={{ uri: imageUrl }}
                              style={styles.reviewItemImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.reviewItemImage}>
                              <Package size={20} color="#A9A29D" />
                            </View>
                          )}
                        </View>
                        <View style={styles.reviewItemContent}>
                          {brandName ? (
                            <Text style={styles.reviewItemBrand}>
                              {brandName.toUpperCase()}
                            </Text>
                          ) : null}
                          <Text style={styles.reviewItemName}>{item.name}</Text>
                          <Text style={styles.reviewItemUsage}>
                            {item.frequency}
                            {item.usage ? ` / ${item.usage}` : ''}
                          </Text>
                        </View>
                        <View style={styles.reviewItemRight}>
                          <ChevronRight size={18} color="#D6D3D1" />
                          <View style={styles.reviewBadge}>
                            <Text style={styles.reviewBadgeText}>
                              Ready to Review
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  },
                )}
                {reviewItems.length > 3 && (
                  <TouchableOpacity
                    style={styles.reviewSeeMoreButton}
                    onPress={() => setIsReviewExpanded(!isReviewExpanded)}
                  >
                    <Text style={styles.reviewSeeMoreText}>
                      {isReviewExpanded ? 'See less' : 'See more'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.reviewEmptyContainer}>
                <Text style={styles.reviewEmptyText}>
                  Nothing to review at present!
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    (navigation as any).navigate('AboutMe', {
                      tab: 'rated',
                      timestamp: Date.now(),
                    });
                  }}
                >
                  <Text style={styles.reviewEmptyLink}>
                    Previously reviewed products
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* SkinCheck Card Section */}
        <SkinCheckCard
          reports={reports}
          loading={isLoadingReports}
          onPress={() => {
            if (isLoadingConcerns) {
              Alert.alert(
                'Analysis Loading',
                'Please wait for your analysis results to finish loading.',
              );
              return;
            }
            // Check if we have a current image/photo to work with
            if (!currentPhoto || !currentPhoto.id || !currentPhoto.storageUrl) {
              Alert.alert(
                'No scan available',
                'Please take a new scan to continue.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Take New Scan',
                    onPress: () => (navigation as any).navigate('Camera'),
                  },
                ],
              );
              return;
            }
            // Allow SkinCheck access when we have a scan, regardless of whether there are top concerns or not
            (navigation as any).navigate('SkinCheck');
          }}
        />

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <SettingsDrawer
        isVisible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 80 : 60,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  // Photo Slider
  photoSliderCard: {
    backgroundColor: colors.imageSliderBackground,
    borderRadius: 16,
    marginBottom: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    height: 270,
    marginTop: 20,
  },
  sliderNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButtonDisabled: {
    opacity: 0.5,
  },
  dateBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dateBadgeText: {
    fontSize: 13,
    // fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    color: '#666666',
    letterSpacing: 0.5,
  },
  photoWrapper: {
    alignSelf: 'center',
    width: SCREEN_WIDTH - 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: 173,
    height: 173,
    borderRadius: 32,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 173,
    height: 173,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
  },
  placeholderText: {
    fontSize: 16,
    // fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    color: '#666666',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 4,
  },

  // Empty Photo State
  emptyPhotoContainer: {
    width: 173,
    height: 173,
    backgroundColor: '#E7E5E4',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10AFCC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 6,
  },
  newScanButtonText: {
    fontSize: 12,
    // fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
  },

  // Carousel Dots
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 8,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  carouselDotActive: {
    backgroundColor: colors.tabSelected,
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1917',
    fontFamily: fontFamily.bold,
  },

  // Concerns
  concernSubtitle: {
    fontSize: 14,
    color: '#79716B',
    lineHeight: 20,
    marginBottom: 16,
  },
  ingredientsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: fontFamily.bold,
    color: '#44403C',
    marginBottom: 8,
  },
  concernCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  concernHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  concernName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: '#1C1917',
  },
  concernValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  concernChange: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7E5E4',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 8,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#44403C',
  },
  noChangeText: {
    fontSize: 14,
    color: '#A8A29E',
  },
  scoreIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  concernValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyConcernsContainer: {
    paddingBottom: 8,
  },
  emptyConcernsText: {
    fontSize: 14,
    color: colors.textTertiary,
  },

  // Ingredient rows inside concern card
  ingredientLoadingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  ingredientListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  ingredientRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
  },
  ingredientNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    color: '#1C1917',
    flex: 1,
  },
  routineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    marginTop: 8,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  routineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  routineText: {
    fontSize: 12,
    color: '#57534E',
    fontWeight: '400',
  },
  showMoreButton: {
    paddingVertical: 10,
  },
  showMoreText: {
    fontSize: 13,
    color: '#A8A29E',
  },

  // SkinCheck Card
  skinCheckCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  skinCheckTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#44403C',
    marginBottom: 2,
    fontFamily: fontFamily.bold,
  },
  skinCheckDescription: {
    fontSize: 13,
    color: '#A9A29D',
    marginBottom: 4,
  },

  // (Routine Score section removed - replaced by SkinCheck card)
  scoreIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  // Carousel Styles
  carouselContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // height: 173,
  },
  carouselItemContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImage: {
    width: 173,
    height: 173,
    borderRadius: 32,
  },

  // Image loading skeleton styles
  imageSkeleton: {
    position: 'absolute',
    zIndex: 1,
  },
  hiddenImage: {
    opacity: 0,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E7E5E4', // Placeholder color specifically for when image is loading but skeleton is hidden
    borderRadius: 32, // Match image border radius
  },
  singlePhotoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // User Metrics Section Styles (Matching Snapshot's profile style)
  metricsProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricsProfileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  metricsProfileItem: {
    width: '48%',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricsProfileLabel: {
    fontSize: 13,
    color: '#A9A29D',
    marginBottom: 6,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    textAlign: 'center',
  },
  metricsProfileValueContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsProfileValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1917',
    fontFamily: fontFamily.bold,
  },
  productHighlight: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: fontFamily.regular,
    color: '#78716C',
    fontStyle: 'italic',
    marginTop: 2,
  },
  ingredientDesc: {
    fontSize: 13,
    color: '#57534E',
    lineHeight: 18,
    marginTop: 2,
  },

  // Review Effectiveness Section
  reviewItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    overflow: 'hidden',
  },
  reviewItemImageContainer: {
    marginRight: 12,
  },
  reviewItemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E7E5E4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewItemContent: {
    flex: 1,
    gap: 2,
    justifyContent: 'space-between',
  },
  reviewItemBrand: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A9A29D',
    fontFamily: fontFamily.bold,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reviewItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#44403C',
    fontFamily: fontFamily.medium,
    marginBottom: 2,
  },
  reviewItemUsage: {
    fontSize: 12,
    color: '#78716C',
  },
  reviewItemRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  reviewBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    fontFamily: fontFamily.semiBold,
  },
  reviewSeeMoreButton: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  reviewSeeMoreText: {
    fontSize: 15,
    color: '#A4A7AE',
  },
  reviewEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  reviewEmptyText: {
    fontSize: 14,
    color: '#78716C',
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewEmptyLink: {
    fontSize: 14,
    color: '#00839B',
    fontFamily: fontFamily.semiBold,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
