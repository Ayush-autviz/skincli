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
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, fontFamily } from '../../styles';
import useAuthStore from '../../stores/authStore';
import { getComparison, transformComparisonData, generateConcernMessage } from '../../utils/newApiService';
import { Camera, CircleCheck, Star, ChevronRight, SoapDispenserDroplet } from 'lucide-react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

// Import the concerns data

import concernsData from '../../data/concerns.json';

// Mapping from profile concern names to concern keys (same as MyConcerns)
const PROFILE_TO_CONCERN_MAPPING: Record<string, string> = {
  'Aging': 'linesScore',
  'Breakouts': 'acneScore',
  'Dark circles': 'eyeBagsScore',
  'Pigmented spots': 'pigmentationScore',
  'Pores': 'poresScore',
  'Redness': 'rednessScore',
  'Sagging': 'saggingScore',
  'Under eye lines': 'linesScore',
  'Under eye puff': 'eyeBagsScore',
  'Uneven skin tone': 'uniformnessScore',
  'Wrinkles': 'linesScore'
};

// Mapping from concern keys to display names (like in MetricsSheet)
const CONCERN_KEY_TO_DISPLAY_NAME: Record<string, string> = {
  'acneScore': 'Breakouts',
  'poresScore': 'Visible Pores',
  'rednessScore': 'Redness',
  'pigmentationScore': 'Pigmentation',
  'linesScore': 'Lines',
  'hydrationScore': 'Dewiness',
  'uniformnessScore': 'Evenness',
  'eyeBagsScore': 'Eye Area Condition',
  'saggingScore': 'Sagging',
  'translucencyScore': 'Translucency',
  'eyeAreaCondition': 'Eye Area Condition'
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

const RecommendationsList = ({ recommendations = [], onRecommendationPress }: RecommendationsListProps): React.JSX.Element => {
  const navigation = useNavigation();
  const { user, profile } = useAuthStore();
  // const { createThread } = useThreadContext();

  // State to track which concerns are expanded
  const [expandedConcerns, setExpandedConcerns] = useState<Set<string>>(new Set());

  // State to track automatically selected concerns based on user profile
  const [selectedConcerns, setSelectedConcerns] = useState<Set<string>>(new Set());

  // State for comparison data and loading
  const [comparisonData, setComparisonData] = useState<Photo[] | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState<boolean>(true);
  const [lowestScoringConcerns, setLowestScoringConcerns] = useState<string[]>([]);
  const [latestScores, setLatestScores] = useState<Record<string, number>>({});
  const [concernMessages, setConcernMessages] = useState<Record<string, ConcernMessageData>>({});

  // Get all concerns from the data
  const allConcerns: Concern[] = Object.values(concernsData.skinConcerns);

  // Function to get scores from the latest image (most recent photo)
  const getLatestImageScores = (photos: Photo[]): Record<string, number> => {
    if (!photos || photos.length === 0) return {};

    // Sort photos by date to get the most recent one
    const sortedPhotos = [...photos].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at) : (a.timestamp ? new Date(a.timestamp) : new Date(0));
      const dateB = b.created_at ? new Date(b.created_at) : (b.timestamp ? new Date(b.timestamp) : new Date(0));
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

    const latestPhoto = sortedPhotos[0];
    if (!latestPhoto || !latestPhoto.metrics) return {};

    // Define concern keys (excluding age, eye age, and translucency)
    const concernKeys = [
      'acneScore', 'poresScore', 'rednessScore', 'pigmentationScore',
      'linesScore', 'hydrationScore', 'uniformnessScore', 'eyeAreaCondition',
      'saggingScore'
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
    console.log('🔵 Latest photo date:', latestPhoto.created_at || latestPhoto.timestamp);

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
      eyeAreaCondition: 'Eye Area Condition',
      saggingScore: 'Sagging',
      translucencyScore: 'Translucency'
    };

    if (mapping[concernKey]) {
      return mapping[concernKey];
    }

    const processedKey = concernKey.replace(/Score$/, '');
    return processedKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Function to identify the 3 lowest scoring concerns from latest image
  const getLowestScoringConcerns = (latestScores: Record<string, number>): string[] => {
    const concernEntries = Object.entries(latestScores)
      .filter(([key, score]) => score > 0) // Only include concerns with data
      .sort(([, a], [, b]) => a - b) // Sort by score (ascending - lowest first)
      .slice(0, 3); // Take only the first 3 (lowest scores)

    console.log('🔵 Lowest scoring concerns from latest image:', concernEntries);
    return concernEntries.map(([key]) => key);
  };

  // Fetch comparison data and identify lowest scoring concerns
  useEffect(() => {
    const fetchComparisonData = async (): Promise<void> => {
      try {
        setIsLoadingComparison(true);
        console.log('🔵 Fetching comparison data for ingredients recommendations');

        const response = await getComparison('older_than_6_month');

        if ((response as any).success && (response as any).data) {
          const transformedPhotos = transformComparisonData((response as any).data);
          console.log(`✅ Loaded ${transformedPhotos.length} photos for concern analysis`);

          setComparisonData(transformedPhotos);

          // Get scores from the latest image
          const latestScoresData = getLatestImageScores(transformedPhotos);
          console.log('🔵 Latest image scores:', latestScoresData);

          // Store latest scores for UI display
          setLatestScores(latestScoresData);

          // Identify the 3 lowest scoring concerns from latest image
          const lowestConcerns = getLowestScoringConcerns(latestScoresData);
          console.log('🔵 Lowest scoring concerns from latest image:', lowestConcerns);

          setLowestScoringConcerns(lowestConcerns);
        } else {
          console.log('⚠️ No comparison data available, falling back to profile concerns');
          // Fallback to profile-based selection
          if (profile?.concerns) {
            const userConcernKeys = new Set<string>();
            Object.entries(profile.concerns).forEach(([profileConcernName, isSelected]) => {
              if (isSelected && PROFILE_TO_CONCERN_MAPPING[profileConcernName]) {
                userConcernKeys.add(PROFILE_TO_CONCERN_MAPPING[profileConcernName]);
              }
            });
            setSelectedConcerns(userConcernKeys);
          }
        }
      } catch (error) {
        console.error('🔴 Error fetching comparison data:', error);
        // Fallback to profile-based selection
        if (profile?.concerns) {
          const userConcernKeys = new Set<string>();
          Object.entries(profile.concerns).forEach(([profileConcernName, isSelected]) => {
            if (isSelected && PROFILE_TO_CONCERN_MAPPING[profileConcernName]) {
              userConcernKeys.add(PROFILE_TO_CONCERN_MAPPING[profileConcernName]);
            }
          });
          setSelectedConcerns(userConcernKeys);
        }
      } finally {
        setIsLoadingComparison(false);
      }
    };

    fetchComparisonData();
  }, [profile?.concerns]);

  // Automatically determine which concerns to show based on user profile (fallback)
  useEffect(() => {
    if (profile?.concerns && lowestScoringConcerns.length === 0) {
      const userConcernKeys = new Set<string>();

      // Convert profile concerns (boolean flags) to concern keys
      Object.entries(profile.concerns).forEach(([profileConcernName, isSelected]) => {
        if (isSelected && PROFILE_TO_CONCERN_MAPPING[profileConcernName]) {
          userConcernKeys.add(PROFILE_TO_CONCERN_MAPPING[profileConcernName]);
        }
      });

      setSelectedConcerns(userConcernKeys);
    }
  }, [profile?.concerns, lowestScoringConcerns.length]);

  // Filter concerns based on lowest scoring concerns from comparison data or fallback to selected concerns
  const filteredConcerns = ((): Concern[] => {
    // If we have lowest scoring concerns from comparison data, use those in the same order
    if (lowestScoringConcerns.length > 0) {
      // Create a map for quick lookup
      const concernMap: Record<string, Concern> = {};
      allConcerns.forEach(concern => {
        concernMap[concern.keyForLookup] = concern;
      });

      // Return concerns in the same order as lowestScoringConcerns
      return lowestScoringConcerns
        .map(concernKey => concernMap[concernKey])
        .filter(concern => concern && concern.advice);
    }

    // Fallback to selected concerns from profile
    if (selectedConcerns.size > 0) {
      return allConcerns.filter(concern =>
        selectedConcerns.has(concern.keyForLookup) && concern.advice
      );
    }

    // Final fallback - show all concerns with advice
    return allConcerns.filter(concern => concern.advice);
  })();

  useEffect(() => {
    let isCancelled = false;
    const fetchConcernMessages = async (): Promise<void> => {
      const concernsToFetch = filteredConcerns
        .slice(0, 3)
        .filter((concern) => concern.advice?.ingredients?.length)
        .filter((concern) => !concernMessages[concern.keyForLookup]);

      if (concernsToFetch.length === 0) {
        return;
      }

      const updates: Record<string, ConcernMessageData> = {};

      for (const concern of concernsToFetch) {
        const concernName = getConcernNameForAPI(concern.keyForLookup);
        if (!concernName) {
          continue;
        }

        try {
          const response = await generateConcernMessage(concernName) as ConcernMessageResponse;
          if (response.success && response.data) {
            updates[concern.keyForLookup] = response.data;
          }
        } catch (error) {
          console.error('🔴 Error fetching concern message:', error);
        }
      }

      if (!isCancelled && Object.keys(updates).length > 0) {
        setConcernMessages((prev) => ({ ...prev, ...updates }));
      }
    };

    fetchConcernMessages();

    return () => {
      isCancelled = true;
    };
  }, [filteredConcerns, concernMessages]);

  const toggleExpanded = (concernKey: string): void => {
    const newExpanded = new Set(expandedConcerns);
    if (newExpanded.has(concernKey)) {
      newExpanded.delete(concernKey);
    } else {
      newExpanded.add(concernKey);
    }
    setExpandedConcerns(newExpanded);
  };

  const handleRecommendationPress = async (recommendation: Recommendation): Promise<void> => {
    if (onRecommendationPress) {
      onRecommendationPress(recommendation);
    }

    console.log('Recommendation pressed:', recommendation.name);

    // Get firstName from profile or user
    const firstName = profile?.user_name || user?.user_name || 'there';
    console.log('🎯 [RecommendationsList] First name:', firstName);

    // Navigate to thread-based chat with recommendation context
    const message = recommendation.initialChatMessage || `Tell me more about ${recommendation.text.toLowerCase()} and how it can help my skin.`;
    (navigation as any).navigate('ThreadChat', {
      chatType: 'snapshot_feedback',
      initialMessage: message
    });
  };

  // Get ingredient presence status
  const getIngredientPresence = (ingredientName: string, concernKey: string): IngredientPresenceResult => {
    const concernData = concernMessages[concernKey];
    const normalizedName = ingredientName.toLowerCase().trim();

    if (!concernData) {
      return { status: 'unknown' };
    }

    const foundEntry = concernData.found_ingredients?.find((found) => {
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
        (missing) => missing.toLowerCase().trim() === normalizedName
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
  const renderIngredientRow = (ingredient: string, itemIndex: number, concernKey: string, isLast: boolean): React.JSX.Element => {
    const colonIndex = ingredient.indexOf(':');
    const ingredientName = colonIndex > 0 ? ingredient.substring(0, colonIndex).trim() : ingredient.trim();
    const ingredientDesc = colonIndex > 0 ? ingredient.substring(colonIndex + 1).trim() : '';
    const presence = getIngredientPresence(ingredientName, concernKey);
    const isPresent = presence.status === 'present';
    const productText = presence.products && presence.products.length > 0
      ? presence.products.join(', ')
      : ingredientDesc || `For ${CONCERN_KEY_TO_DISPLAY_NAME[concernKey] || concernKey}`;

    return (
      <TouchableOpacity
        key={`${concernKey}-ingredient-${itemIndex}`}
        style={[styles.ingredientRow, !isLast && styles.ingredientRowBorder]}
        activeOpacity={0.7}
        onPress={() => {
          const message = `Tell me more about ${ingredientName.toLowerCase()} and how it can help my skin.`;
          (navigation as any).navigate('ThreadChat', {
            chatType: 'snapshot_feedback',
            initialMessage: message
          });
        }}
      >
        <View style={styles.ingredientIconContainer}>
          {isPresent ? (
            <CircleCheck size={22} color="#079455" />
          ) : (
            <CircleCheck size={22} color="#E7E5E4" />
          )}
        </View>
        <View style={styles.ingredientContent}>
          <Text style={styles.ingredientName}>{ingredientName}</Text>
          {productText ? (
            <Text style={styles.ingredientDesc} numberOfLines={1}>{productText}</Text>
          ) : null}
        </View>
        <ChevronRight size={18} color="#D6D3D1" />
      </TouchableOpacity>
    );
  };

  // Show loading state while fetching comparison data
  if (isLoadingComparison) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
          {/* Header Skeleton */}
          <SkeletonPlaceholder borderRadius={4}>
            <SkeletonPlaceholder.Item flexDirection="row" alignItems="center" gap={8} marginBottom={6}>
              <SkeletonPlaceholder.Item width={20} height={20} borderRadius={10} />
              <SkeletonPlaceholder.Item width={180} height={16} />
            </SkeletonPlaceholder.Item>
            <SkeletonPlaceholder.Item width={280} height={12} marginBottom={20} />
          </SkeletonPlaceholder>

          {/* Concern Sections Skeleton */}
          {[1, 2, 3].map((section) => (
            <View key={section} style={{ marginBottom: 16 }}>
              {/* Concern Header */}
              <SkeletonPlaceholder borderRadius={4}>
                <SkeletonPlaceholder.Item flexDirection="row" justifyContent="space-between" alignItems="center" paddingVertical={12}>
                  <SkeletonPlaceholder.Item flexDirection="row" alignItems="center" gap={8}>
                    <SkeletonPlaceholder.Item width={16} height={16} borderRadius={8} />
                    <SkeletonPlaceholder.Item width={120} height={14} />
                  </SkeletonPlaceholder.Item>
                  <SkeletonPlaceholder.Item width={50} height={24} borderRadius={8} />
                </SkeletonPlaceholder.Item>
              </SkeletonPlaceholder>

              {/* Ingredient Rows */}
              {[1, 2, 3].map((row) => (
                <SkeletonPlaceholder key={row} borderRadius={4}>
                  <SkeletonPlaceholder.Item flexDirection="row" alignItems="center" paddingVertical={14}>
                    <SkeletonPlaceholder.Item width={22} height={22} borderRadius={11} marginRight={12} />
                    <SkeletonPlaceholder.Item flex={1}>
                      <SkeletonPlaceholder.Item width={140} height={14} marginBottom={4} />
                      <SkeletonPlaceholder.Item width={100} height={12} />
                    </SkeletonPlaceholder.Item>
                    <SkeletonPlaceholder.Item width={18} height={18} borderRadius={9} />
                  </SkeletonPlaceholder.Item>
                </SkeletonPlaceholder>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  // Show no images state when no comparison data is available
  if (!isLoadingComparison && (!comparisonData || comparisonData.length === 0)) {
    return (
      <View style={styles.noDataContainer}>
        <View style={styles.noDataContent}>
          <View style={styles.noDataIconContainer}>
            <Camera size={40} color={colors.primary} />
          </View>
          <Text style={styles.noDataText}>Upload your first photo to start receiving ingredient suggestions</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Main Card */}
      <View style={styles.mainCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderRow}>
            <SoapDispenserDroplet size={20} color="#414651" />
            <Text style={styles.cardHeaderTitle}>Recommended Ingredients</Text>
          </View>
          <Text style={styles.cardHeaderSubtitle}>Dermatologist approved ingredients for your top concerns</Text>
        </View>

        {/* Concern Sections */}
        {filteredConcerns.map((concern, concernIndex) => {
          if (!concern.advice) return null;

          const itemsToShow = concern.advice.ingredients || concern.whatYouCanDo || [];
          const isExpanded = expandedConcerns.has(concern.keyForLookup);
          const visibleItems = isExpanded ? itemsToShow : itemsToShow.slice(0, 3);
          const hasMore = itemsToShow.length > 3;
          const score = latestScores[concern.keyForLookup] || 0;
          const displayName = CONCERN_KEY_TO_DISPLAY_NAME[concern.keyForLookup] || concern.displayName || concern.keyForLookup;

          return (
            <View key={concern.keyForLookup} style={styles.concernSection}>
              {/* Concern Header */}
              <View style={styles.concernHeader}>
                <View style={styles.concernHeaderLeft}>
                  <Star size={16} color="#A9A29D" />
                  <Text style={styles.concernTitle}>{displayName}</Text>
                </View>
                {score > 0 && (
                  <View style={styles.scoreBadge}>
                    <View style={[styles.scoreIndicator, { backgroundColor: getScoreColor(score) }]} />
                    <Text style={styles.scoreValue}>{Math.round(score)}</Text>
                  </View>
                )}
              </View>

              {/* Ingredient Items */}
              {visibleItems.map((item, itemIndex) => {
                if (typeof item === 'string') {
                  return renderIngredientRow(
                    item,
                    itemIndex,
                    concern.keyForLookup,
                    itemIndex === visibleItems.length - 1 && !hasMore
                  );
                }
                return null;
              })}

              {/* Show More */}
              {hasMore && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => toggleExpanded(concern.keyForLookup)}
                >
                  <Text style={styles.showMoreText}>
                    {isExpanded ? 'Show less' : `Show ${itemsToShow.length - 3} more`}
                  </Text>
                </TouchableOpacity>
              )}
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
    backgroundColor: '#FAFAF9',
  },

  // Main Card
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Card Header
  cardHeader: {
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: '#1C1917',
  },
  cardHeaderSubtitle: {
    fontSize: 13,
    color: '#78716C',
    marginTop: 2,
  },

  // Concern Section
  concernSection: {
    marginBottom: 8,
  },
  concernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  concernHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  concernTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    color: '#1C1917',
  },

  // Score Badge
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  scoreIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    color: '#1C1917',
  },

  // Ingredient Row
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  ingredientRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  ingredientIconContainer: {
    marginRight: 12,
  },
  ingredientContent: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    color: '#1C1917',
    marginBottom: 2,
  },
  ingredientDesc: {
    fontSize: 13,
    color: '#A9A29D',
  },

  // Show More
  showMoreButton: {
    paddingVertical: 14,

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
});