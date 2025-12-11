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
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ListItem from '../ui/ListItem';
import { colors, spacing, typography } from '../../styles';
import useAuthStore from '../../stores/authStore';
// import { useThreadContext } from '../../contexts/ThreadContext';
import { getComparison, transformComparisonData, generateConcernMessage } from '../../utils/newApiService';
import { Camera, CheckCircle, AlertCircle } from 'lucide-react-native';

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

  // Render individual recommendation item
  const renderRecommendationItem = (item: Recommendation, itemIndex: number, concernKey: string): React.JSX.Element => {
    // Choose icon based on type to match routine
    let iconName = 'bottle-tonic-outline';
    let iconColor = '#666';
    
    if (item.type === 'product') {
      iconName = 'bottle-tonic-outline';
      iconColor = colors.primary;
    } else if (item.type === 'activity') {
      iconName = 'bottle-tonic-outline';
      iconColor = '#009688';
    } else if (item.type === 'nutrition') {
      iconName = 'bottle-tonic-outline';
      iconColor = '#FF9800';
    }

    return (
      <View key={`${concernKey}-${itemIndex}`} style={{ marginBottom: 12 }}>
        <ListItem
          title={item.text}
          icon={iconName}
          iconColor={iconColor}
          iconLibrary="MaterialCommunityIcons"
          showChevron={true}
          onPress={() => handleRecommendationPress(item)}
        />
      </View>
    );
  };

  // Render ingredient item from advice
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

  const renderIngredientItem = (ingredient: string, itemIndex: number, concernKey: string): React.JSX.Element => {
    const colonIndex = ingredient.indexOf(':');
    const ingredientName = colonIndex > 0 ? ingredient.substring(0, colonIndex).trim() : ingredient.trim();
    const ingredientDesc = colonIndex > 0 ? ingredient.substring(colonIndex + 1).trim() : '';
    const presence = getIngredientPresence(ingredientName, concernKey);
    const isUnknown = presence.status === 'unknown';
    const chips = isUnknown
      ? [
          {
            label: 'Checking routine',
            type: 'default',
            styleVariant: 'normal',
          },
        ]
      : [
          {
            label: presence.status === 'present' ? 'Present in routine' : 'Not in routine',
            type: presence.status === 'present' ? 'ingredient' : 'default',
            styleVariant: presence.status === 'present' ? 'bold' : 'normal',
          },
        ];

    const rightElement =
      presence.status === 'present'
        ? <CheckCircle size={20} color={colors.primary} />
        : presence.status === 'absent'
          ? <AlertCircle size={20} color={colors.primary} />
          : <></>;

    const bottomText =
      presence.products && presence.products.length > 0
        ? `Products: ${presence.products.join(', ')}`
        : null;

    return (
      <View key={`${concernKey}-ingredient-${itemIndex}`} style={{ marginBottom: 0 }}>
        <ListItem
          title={ingredientName}
          description={ingredientDesc || undefined}
          icon="bottle-tonic-outline"
          iconColor={colors.primary}
          iconLibrary="MaterialCommunityIcons"
          showChevron={false}
          chips={chips}
          //rightElement={rightElement}
          bottomText={bottomText}
        />
      </View>
    );
  };

  // Render stats for lowest scoring concerns
  const renderLowestScoringStats = (): React.JSX.Element | null => {
    if (lowestScoringConcerns.length === 0 || Object.keys(latestScores).length === 0) {
      return null;
    }

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Areas that may require attention</Text>
        <View style={styles.statsGrid}>
          {lowestScoringConcerns.map((concernKey, index) => {
            const score = latestScores[concernKey] || 0;
            const displayName = CONCERN_KEY_TO_DISPLAY_NAME[concernKey];
            
            return (
              <View key={concernKey} style={styles.statItem}>
                <View style={styles.statHeader}>
                  <Text style={styles.statRank}>#{index + 1}</Text>
                  <Text style={styles.statScore}>{Math.round(score)}/100</Text>
                </View>
                <Text style={styles.statName}>{displayName}</Text>
                <View style={styles.statBar}>
                  <View 
                    style={[
                      styles.statBarFill, 
                      { 
                        width: `${(score / 100) * 100}%`,
                        backgroundColor: score <= 30 ? '#FF3B30' : score <= 70 ? '#FFB340' : '#34C759'
                      }
                    ]} 
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Show loading state while fetching comparison data
  if (isLoadingComparison) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Analyzing your skin concerns...</Text>
        <Text style={styles.loadingSubtext}>Finding ingredients for your areas of concern</Text>
      </View>
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
          {/* <Text style={styles.noDataSubtext}>
            Take a selfie to get personalized ingredient recommendations based on your skin analysis
          </Text> */}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* TEMPORARILY COMMENTED OUT - Concerns filters confusing users */}
      {/* <MyConcerns 
        selectedConcerns={selectedConcerns}
        onSelectionChange={setSelectedConcerns}
      /> */}
     
      
      <View style={styles.microcopyContainer}>
        <Text style={styles.microcopyText}>
          {lowestScoringConcerns.length > 0 
            ? 'Based on your latest skin analysis'
            : 'Based on your current skin analysis'
          }
        </Text>
      </View>

      {/* Stats for lowest scoring concerns */}
      {renderLowestScoringStats()}

      {filteredConcerns.map((concern, concernIndex) => {
        // Only show concerns that have advice object
        if (!concern.advice) return null;
        
        // Use ingredients from advice if available, otherwise fall back to recommendations
        const itemsToShow = concern.advice.ingredients || concern.whatYouCanDo || [];
        const isExpanded = expandedConcerns.has(concern.keyForLookup);
        const visibleItems = isExpanded ? itemsToShow : itemsToShow.slice(0, 3);
        const hasMore = itemsToShow.length > 3;

        return (
          <View key={concern.keyForLookup} style={styles.concernSection}>
            <Text style={styles.concernTitle}>
              {CONCERN_KEY_TO_DISPLAY_NAME[concern.keyForLookup] || concern.displayName || concern.keyForLookup}
            </Text>
            <View style={styles.itemsContainer}>
              {visibleItems.map((item, itemIndex) => {
                // If it's an ingredient string, render as ingredient item
                if (typeof item === 'string') {
                  return renderIngredientItem(item, itemIndex, concern.keyForLookup);
                }
                // Otherwise render as regular recommendation item
               // return renderRecommendationItem(item as Recommendation, itemIndex, concern.keyForLookup);
              })}
              
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
          </View>
        );
      })}
    </ScrollView>
  );
};

export default RecommendationsList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  microcopyContainer: {
    paddingBottom: spacing.md,
  // paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  microcopyText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  concernSection: {
    marginBottom: 32,
    marginHorizontal: 16,
  },
  concernTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  itemsContainer: {
  //  marginHorizontal: 16,
  },
  showMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  statsGrid: {
    gap: 12,
  },
  statItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statRank: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statScore: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  statBar: {
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 3,
  },
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
  noDataIcon: {
    fontSize: 48,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: 25,
  },
  noDataSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});