// RecommendationsList.tsx
// React UI component for displaying skincare recommendations based on user's skin concerns

/* ------------------------------------------------------

WHAT IT DOES
- Displays skincare recommendations from concerns data
- Shows recommendations in a My Routine-style layout using ListItem
- Groups recommendations by skin concern type
- Filters recommendations based on selected concerns from MyConcerns
- Shows max 3 recommendations per concern with "show more" option
- Opens AI threads when recommendations are tapped

DATA USED
- concernsData from concerns data - all recommendations from all concerns
- selectedConcerns from MyConcerns - filters which sections to show

DEVELOPMENT HISTORY
- Original version used Firestore data
- Updated to use local concerns data with routine-style layout
- Simplified to show all recommendations without filtering
- Added MyConcerns component at top
- Added filtering based on selected concerns
- Added "show more" functionality with 3 item limit
- Added AI thread creation on recommendation tap
- Converted to TypeScript with React Native CLI packages

------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, fontFamily } from '../../styles';
import useAuthStore from '../../stores/authStore';
import {
  getComparison,
  transformComparisonData,
  generateConcernMessage,
} from '../../utils/newApiService';
import { Camera, ChevronRight } from 'lucide-react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

// Import the concerns data

import concernsData from '../../data/concerns.json';
import ingredientsData from '../../data/Ingredients.json';

// Helper function to get ingredients from Ingredients.json based on metricKey
const getIngredientsForMetric = (metricKey: string): string[] => {
  if (!metricKey) return [];

  const mapping: Record<string, string> = {
    acneScore: 'Acne',
    poresScore: 'Pores',
    rednessScore: 'Redness',
    pigmentationScore: 'Pigmentation',
    linesScore: 'Lines',
    hydrationScore: 'Hydration',
    uniformnessScore: 'Uniformness',
    eyeAreaCondition: 'Dark Circles',
    eyeBagsScore: 'Dark Circles',
    puffinessScore: 'Puffiness',
    saggingScore: 'Sagging',
  };

  const concernName =
    mapping[metricKey] || mapping[metricKey.replace('Score', '')];
  if (!concernName) return [];

  const concern = (ingredientsData.SKIN_CONCERNS as any[]).find(
    c => c.name === concernName,
  );
  return concern ? concern.Ingredients : [];
};

// Mapping from profile concern names to concern keys (same as MyConcerns)
const PROFILE_TO_CONCERN_MAPPING: Record<string, string> = {
  Aging: 'linesScore',
  Breakouts: 'acneScore',
  'Dark circles': 'eyeBagsScore',
  'Pigmented spots': 'pigmentationScore',
  Pores: 'poresScore',
  Redness: 'rednessScore',
  Sagging: 'saggingScore',
  'Under eye lines': 'linesScore',
  'Under eye puff': 'eyeBagsScore',
  'Uneven skin tone': 'uniformnessScore',
  Wrinkles: 'linesScore',
};

// Mapping from concern keys to display names (like in MetricsSheet)
const CONCERN_KEY_TO_DISPLAY_NAME: Record<string, string> = {
  acneScore: 'Breakouts',
  poresScore: 'Visible Pores',
  rednessScore: 'Redness',
  pigmentationScore: 'Pigmentation',
  linesScore: 'Lines',
  hydrationScore: 'Dewiness',
  uniformnessScore: 'Evenness',
  eyeBagsScore: 'Dark Circles',
  saggingScore: 'Sagging',
  translucencyScore: 'Translucency',
  eyeAreaCondition: 'Dark Circles',
  puffinessScore: 'Eye Puffiness',
};

interface Recommendation {
  name: string;
  text: string;
  type: 'product' | 'activity' | 'nutrition';
  initialChatMessage?: string;
}

interface Concern {
  keyForLookup: string;
  displayName: string;
  associatedMetric?: string;
  overview: string;
  maskVerbiage?: string[];
  scoreLevels?: any;
  advice?: {
    disclaimer: string;
    ingredients: string[];
    Behavior?: string[];
  };
  whatYouCanDo?: any[];
}

interface RecommendationsListProps {
  recommendations?: Recommendation[];
  onRecommendationPress?: (recommendation: Recommendation) => void;
}

interface Photo {
  created_at?: string;
  timestamp?: string;
  metrics?: Record<string, number>;
}

interface ConcernMessageData {
  message?: string;
  found_ingredients?: Array<
    | string
    | {
        ingredient: string;
        products?: string[];
      }
  >;
  missing_ingredients?: string[];
  has_routine?: boolean;
}

interface ConcernMessageResponse {
  success?: boolean;
  data?: ConcernMessageData;
}

type IngredientPresenceStatus = 'present' | 'absent' | 'unknown';

interface IngredientPresenceResult {
  status: IngredientPresenceStatus;
  products?: string[];
}

const RecommendationsList = ({
  recommendations = [],
  onRecommendationPress,
}: RecommendationsListProps): React.JSX.Element => {
  const navigation = useNavigation();
  const { user, profile } = useAuthStore();
  // const { createThread } = useThreadContext();

  // State to track automatically selected concerns based on user profile
  const [selectedConcerns, setSelectedConcerns] = useState<Set<string>>(
    new Set(),
  );

  // State for comparison data and loading
  const [comparisonData, setComparisonData] = useState<Photo[] | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState<boolean>(true);
  const [lowestScoringConcerns, setLowestScoringConcerns] = useState<string[]>(
    [],
  );
  const [latestScores, setLatestScores] = useState<Record<string, number>>({});
  const [latestImageId, setLatestImageId] = useState<string | null>(null);
  const [concernMessages, setConcernMessages] = useState<
    Record<string, ConcernMessageData>
  >({});

  // Get all concerns from the data
  const allConcerns: Concern[] = Object.values(concernsData.skinConcerns);

  // Function to get scores from the latest image (most recent photo)
  const getLatestImageScores = (photos: Photo[]): Record<string, number> => {
    if (!photos || photos.length === 0) return {};

    // Sort photos by date to get the most recent one
    const sortedPhotos = [...photos].sort((a, b) => {
      const dateA = a.created_at
        ? new Date(a.created_at)
        : a.timestamp
        ? new Date(a.timestamp)
        : new Date(0);
      const dateB = b.created_at
        ? new Date(b.created_at)
        : b.timestamp
        ? new Date(b.timestamp)
        : new Date(0);
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

    const latestPhoto = sortedPhotos[0];
    if (!latestPhoto || !latestPhoto.metrics) return {};

    // Define concern keys (excluding age, eye age, and translucency)
    const concernKeys = [
      'acneScore',
      'poresScore',
      'rednessScore',
      'pigmentationScore',
      'linesScore',
      'hydrationScore',
      'uniformnessScore',
      'eyeAreaCondition',
      'puffinessScore',
      'saggingScore',
    ];

    // Get scores from the latest photo
    const latestScores: Record<string, number> = {};
    concernKeys.forEach(key => {
      const score = latestPhoto.metrics![key];
      if (score !== null && score !== undefined && !isNaN(score) && score > 0) {
        latestScores[key] = score;
      } else {
        latestScores[key] = 0; // No data available
      }
    });

    console.log('🔵 Latest photo scores:', latestScores);
    console.log(
      '🔵 Latest photo date:',
      latestPhoto.created_at || latestPhoto.timestamp,
    );

    return latestScores;
  };

  const getConcernNameForAPI = (concernKey: string): string | null => {
    if (!concernKey) return null;

    const mapping: Record<string, string> = {
      acneScore: 'Acne',
      poresScore: 'Pores',
      rednessScore: 'Redness',
      pigmentationScore: 'Pigmentation',
      linesScore: 'Lines',
      hydrationScore: 'Hydration',
      uniformnessScore: 'Uniformness',
      eyeAreaCondition: 'Dark Circles',
      puffinessScore: 'Puffiness',
      saggingScore: 'Sagging',
      translucencyScore: 'Translucency',
    };

    if (mapping[concernKey]) {
      return mapping[concernKey];
    }

    const processedKey = concernKey.replace(/Score$/, '');
    return processedKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Function to identify the 3 lowest scoring concerns from latest image
  const getLowestScoringConcerns = (
    latestScores: Record<string, number>,
  ): string[] => {
    const concernEntries = Object.entries(latestScores)
      .filter(([key, score]) => score > 0) // Only include concerns with data
      .sort(([, a], [, b]) => a - b); // Sort by score (ascending - lowest first)

    console.log(
      '🔵 Lowest scoring concerns from latest image:',
      concernEntries,
    );
    return concernEntries.map(([key]) => key);
  };

  // Helper to resolve filtered concerns from lowest scoring or profile fallback
  const resolveFilteredConcerns = (
    lowestConcerns: string[],
    profileConcerns?: Record<string, boolean>,
  ): Concern[] => {
    if (lowestConcerns.length > 0) {
      const concernMap: Record<string, Concern> = {};
      allConcerns.forEach(concern => {
        concernMap[concern.keyForLookup] = concern;
      });
      return lowestConcerns
        .map(key => concernMap[key])
        .filter(c => c && c.advice);
    }
    if (profileConcerns) {
      const userKeys = new Set<string>();
      Object.entries(profileConcerns).forEach(([name, isSelected]) => {
        if (isSelected && PROFILE_TO_CONCERN_MAPPING[name])
          userKeys.add(PROFILE_TO_CONCERN_MAPPING[name]);
      });
      if (userKeys.size > 0)
        return allConcerns.filter(
          c => userKeys.has(c.keyForLookup) && c.advice,
        );
    }
    return allConcerns.filter(c => c.advice);
  };

  // Fetch comparison data, identify concerns, then fetch concern messages — all before hiding skeleton
  useEffect(() => {
    let isCancelled = false;

    const fetchAllData = async (): Promise<void> => {
      try {
        setIsLoadingComparison(true);
        console.log(
          '🔵 Fetching comparison data for ingredients recommendations',
        );

        let resolvedConcerns: Concern[] = [];

        const response = await getComparison('older_than_6_month');

        if ((response as any).success && (response as any).data) {
          const transformedPhotos = transformComparisonData(
            (response as any).data,
          );
          console.log(
            `✅ Loaded ${transformedPhotos.length} photos for concern analysis`,
          );

          setComparisonData(transformedPhotos);

          const latestScoresData = getLatestImageScores(transformedPhotos);
          setLatestScores(latestScoresData);

          const lowestConcerns = getLowestScoringConcerns(latestScoresData);
          setLowestScoringConcerns(lowestConcerns);

          // Find the latest photo ID/imageId
          if (transformedPhotos.length > 0) {
            const sortedPhotos = [...transformedPhotos].sort((a, b) => {
              const dateA = a.created_at
                ? new Date(a.created_at)
                : a.timestamp
                ? new Date(a.timestamp)
                : new Date(0);
              const dateB = b.created_at
                ? new Date(b.created_at)
                : b.timestamp
                ? new Date(b.timestamp)
                : new Date(0);
              return dateB.getTime() - dateA.getTime();
            });
            const latest = sortedPhotos[0];
            setLatestImageId(latest.id || latest.hautUploadData?.imageId);
          }

          resolvedConcerns = resolveFilteredConcerns(
            lowestConcerns,
            profile?.concerns,
          );
        } else {
          console.log(
            '⚠️ No comparison data available, falling back to profile concerns',
          );
          if (profile?.concerns) {
            const userConcernKeys = new Set<string>();
            Object.entries(profile.concerns).forEach(
              ([profileConcernName, isSelected]) => {
                if (
                  isSelected &&
                  PROFILE_TO_CONCERN_MAPPING[profileConcernName]
                ) {
                  userConcernKeys.add(
                    PROFILE_TO_CONCERN_MAPPING[profileConcernName],
                  );
                }
              },
            );
            setSelectedConcerns(userConcernKeys);
          }
          resolvedConcerns = resolveFilteredConcerns([], profile?.concerns);
        }

        // Now fetch concern messages in parallel before hiding the skeleton
        const concernsToFetch = resolvedConcerns.filter(
          concern => concern.advice?.ingredients?.length,
        );

        if (concernsToFetch.length > 0) {
          const messageResults = await Promise.all(
            concernsToFetch.map(async concern => {
              const concernName = getConcernNameForAPI(concern.keyForLookup);
              if (!concernName) return null;
              try {
                const resp = (await generateConcernMessage(
                  concernName,
                )) as ConcernMessageResponse;
                if (resp.success && resp.data) {
                  return { key: concern.keyForLookup, data: resp.data };
                }
              } catch (error) {
                console.error('🔴 Error fetching concern message:', error);
              }
              return null;
            }),
          );

          if (!isCancelled) {
            const updates: Record<string, ConcernMessageData> = {};
            messageResults.forEach(result => {
              if (result) updates[result.key] = result.data;
            });
            if (Object.keys(updates).length > 0) {
              setConcernMessages(prev => ({ ...prev, ...updates }));
            }
          }
        }
      } catch (error) {
        console.error('🔴 Error fetching comparison data:', error);
        if (profile?.concerns) {
          const userConcernKeys = new Set<string>();
          Object.entries(profile.concerns).forEach(
            ([profileConcernName, isSelected]) => {
              if (
                isSelected &&
                PROFILE_TO_CONCERN_MAPPING[profileConcernName]
              ) {
                userConcernKeys.add(
                  PROFILE_TO_CONCERN_MAPPING[profileConcernName],
                );
              }
            },
          );
          setSelectedConcerns(userConcernKeys);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingComparison(false);
        }
      }
    };

    fetchAllData();

    return () => {
      isCancelled = true;
    };
  }, [profile?.concerns]);

  // Automatically determine which concerns to show based on user profile (fallback)
  useEffect(() => {
    if (profile?.concerns && lowestScoringConcerns.length === 0) {
      const userConcernKeys = new Set<string>();
      Object.entries(profile.concerns).forEach(
        ([profileConcernName, isSelected]) => {
          if (isSelected && PROFILE_TO_CONCERN_MAPPING[profileConcernName]) {
            userConcernKeys.add(PROFILE_TO_CONCERN_MAPPING[profileConcernName]);
          }
        },
      );
      setSelectedConcerns(userConcernKeys);
    }
  }, [profile?.concerns, lowestScoringConcerns.length]);

  // Filter concerns based on lowest scoring concerns from comparison data or fallback to selected concerns
  const filteredConcerns = ((): Concern[] => {
    return resolveFilteredConcerns(lowestScoringConcerns, profile?.concerns);
  })();

  const handleRecommendationPress = async (
    recommendation: Recommendation,
  ): Promise<void> => {
    if (onRecommendationPress) {
      onRecommendationPress(recommendation);
    }

    console.log('Recommendation pressed:', recommendation.name);

    // Get firstName from profile or user
    const firstName = profile?.user_name || user?.user_name || 'there';
    console.log('🎯 [RecommendationsList] First name:', firstName);

    // Navigate to thread-based chat with recommendation context
    const message =
      recommendation.initialChatMessage ||
      `Tell me more about ${recommendation.text.toLowerCase()} and how it can help my skin.`;
    (navigation as any).navigate('ThreadChat', {
      chatType: 'snapshot_feedback',
      initialMessage: message,
    });
  };

  // Get ingredient presence status
  const getIngredientPresence = (
    ingredientName: string,
    concernKey: string,
  ): IngredientPresenceResult => {
    const concernData = concernMessages[concernKey];
    const normalizedName = ingredientName.toLowerCase().trim();

    if (!concernData) {
      return { status: 'unknown' };
    }

    const foundEntry = concernData.found_ingredients?.find(found => {
      if (typeof found === 'string') {
        return found.toLowerCase().trim() === normalizedName;
      }
      return found?.ingredient?.toLowerCase().trim() === normalizedName;
    });

    if (foundEntry) {
      const products =
        typeof foundEntry === 'string'
          ? []
          : Array.isArray(foundEntry.products)
          ? foundEntry.products
          : [];
      return { status: 'present', products };
    }

    const isMissing =
      concernData.missing_ingredients?.some(
        missing => missing.toLowerCase().trim() === normalizedName,
      ) || false;

    return { status: isMissing ? 'absent' : 'absent' };
  };

  // Get score indicator color
  const getScoreColor = (score: number): string => {
    if (score >= 70) return '#22C55E'; // Green
    if (score >= 50) return '#EAB308'; // Yellow
    return '#EF4444'; // Red
  };

  // Render a single ingredient row
  const renderIngredientRow = (
    ingredient: string,
    itemIndex: number,
    concernKey: string,
    isLast: boolean,
  ): React.JSX.Element => {
    const colonIndex = ingredient.indexOf(':');
    const ingredientName =
      colonIndex > 0
        ? ingredient.substring(0, colonIndex).trim()
        : ingredient.trim();
    const ingredientDesc =
      colonIndex > 0
        ? ingredient.substring(colonIndex + 1).trim()
        : '';
    const presence = getIngredientPresence(ingredientName, concernKey);
    const isPresent = presence.status === 'present';

    return (
      <TouchableOpacity
        key={`${concernKey}-ingredient-${itemIndex}`}
        style={[styles.ingredientRow, !isLast && styles.ingredientRowBorder]}
        activeOpacity={0.7}
        onPress={() => {
          const message = `Tell me more about ${ingredientName.toLowerCase()} and how it can help my skin.`;
          (navigation as any).navigate('ThreadChat', {
            chatType: 'ingredients_related_chat',
            initialMessage: message,
            draftMessage: message,
            hideInitial: true,
            imageId: latestImageId,
          });
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.ingredientName}>{ingredientName}</Text>
          <View style={styles.routineChip}>
            <View
              style={[
                styles.routineDot,
                {
                  backgroundColor: isPresent ? '#12B76A' : '#A9A29D',
                },
              ]}
            />
            <Text style={styles.routineText}>
              {isPresent ? 'In your Routine' : 'Not in Routine'}
            </Text>
          </View>
          {isPresent &&
          presence.products &&
          presence.products.length > 0 ? (
            <Text style={styles.productHighlight}>
              {presence.products.join(', ')}
            </Text>
          ) : ingredientDesc ? (
            <Text style={styles.ingredientDesc}>
              {ingredientDesc}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={20} color="#D6D3D1" />
      </TouchableOpacity>
    );
  };

  // Show loading state while fetching comparison data
  if (isLoadingComparison) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {/* Concern Cards Skeleton */}
          {[1, 2, 3].map(section => (
            <View key={section} style={styles.concernCard}>
              {/* Concern Header */}
              <SkeletonPlaceholder borderRadius={4}>
                <SkeletonPlaceholder.Item
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  paddingHorizontal={16}
                  paddingVertical={20}
                >
                  <SkeletonPlaceholder.Item width={140} height={18} />
                  <SkeletonPlaceholder.Item
                    width={45}
                    height={26}
                    borderRadius={13}
                  />
                </SkeletonPlaceholder.Item>
              </SkeletonPlaceholder>

              <View style={styles.headerSeparator} />

              {/* Ingredient Rows */}
              <View style={{ paddingHorizontal: 16 }}>
                {[1, 2, 3].map((row, index) => (
                  <SkeletonPlaceholder key={row} borderRadius={4}>
                    <SkeletonPlaceholder.Item
                      flexDirection="row"
                      justifyContent="space-between"
                      alignItems="center"
                      paddingVertical={16}
                      borderBottomWidth={index < 2 ? 1 : 0}
                      borderColor="#F0F0F0"
                    >
                      <SkeletonPlaceholder.Item
                        width={row === 2 ? 110 : 150}
                        height={16}
                      />
                      {row === 1 && (
                        <SkeletonPlaceholder.Item
                          width={100}
                          height={28}
                          borderRadius={8}
                        />
                      )}
                    </SkeletonPlaceholder.Item>
                  </SkeletonPlaceholder>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  // Show no images state when no comparison data is available
  if (
    !isLoadingComparison &&
    (!comparisonData || comparisonData.length === 0)
  ) {
    return (
      <View style={styles.noDataContainer}>
        <View style={styles.noDataContent}>
          <View style={styles.noDataIconContainer}>
            <Camera size={40} color={colors.primary} />
          </View>
          <Text style={styles.noDataText}>
            Upload your first photo to start receiving ingredient suggestions
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentPadding}>
        {/* Header Text */}
        <Text style={styles.headerTitle}>Helpful Ingredients</Text>
        <Text style={styles.headerSubtitle}>
          Dermatologists recommend at least one of the following ingredients for
          your concerns
        </Text>

        {/* Concern Sections */}
        {filteredConcerns.map((concern, concernIndex) => {
          if (!concern.advice) return null;

          const ingredients = getIngredientsForMetric(concern.keyForLookup);
          const itemsToShow =
            ingredients.length > 0
              ? ingredients
              : concern.advice.ingredients || concern.whatYouCanDo || [];
          const concernData = concernMessages[concern.keyForLookup];
          // const hasOneInRoutine = !!(concernData?.found_ingredients && concernData.found_ingredients.length > 0);

          // const isExpanded = expandedConcerns.has(concern.keyForLookup);
          // const showToggle = hasOneInRoutine && itemsToShow.length > 3;
          const visibleItems = itemsToShow;
          const hasMore = false; // Always show all
          const score = latestScores[concern.keyForLookup] || 0;
          const displayName =
            CONCERN_KEY_TO_DISPLAY_NAME[concern.keyForLookup] ||
            concern.displayName ||
            concern.keyForLookup;

          return (
            <View key={concern.keyForLookup} style={styles.concernCard}>
              {/* Concern Header */}
              <View style={styles.concernHeader}>
                <Text style={styles.concernTitle}>{displayName}</Text>
                {score > 0 && (
                  <View style={styles.scoreBadge}>
                    <View
                      style={[
                        styles.scoreIndicator,
                        { backgroundColor: getScoreColor(score) },
                      ]}
                    />
                    <Text style={styles.scoreValue}>
                      {Math.round(score)}
                      <Text style={styles.scoreOutOf}> /100</Text>
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.headerSeparator} />

              <View style={styles.ingredientsListWrapper}>
                {/* Ingredient Items */}
                {visibleItems.map((item, itemIndex) => {
                  if (typeof item === 'string') {
                    return renderIngredientRow(
                      item,
                      itemIndex,
                      concern.keyForLookup,
                      itemIndex === visibleItems.length - 1,
                    );
                  }
                  return null;
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* Bottom spacing for tab bar */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

export default RecommendationsList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentPadding: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: fontFamily.bold,
    color: '#44403C',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    color: '#A8A29E',
    marginBottom: 20,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Concern Card
  concernCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  concernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerSeparator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  concernTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: '#57534E',
  },

  // Score Badge
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  scoreIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    color: '#44403C',
  },
  scoreOutOf: {
    color: '#A9A29D',
  },

  // Ingredient List Wrapper
  ingredientsListWrapper: {
    paddingHorizontal: 16,
  },

  // Ingredient Row
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  ingredientRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    color: '#44403C',
    flex: 1,
  },

  // Routine Chip
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

  // Show More
  showMoreButton: {
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    color: '#A9A29D',
    fontWeight: '500',
  },

  // No Data
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  noDataContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  noDataIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: 25,
  },
  productHighlight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1917',
    marginTop: 2,
  },
  ingredientDesc: {
    fontSize: 13,
    color: '#57534E',
    lineHeight: 18,
    marginTop: 2,
  },
});
