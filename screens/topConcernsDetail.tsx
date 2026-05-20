// screens/topConcernsDetail.tsx
// Detailed screen for Top Concerns and Recommended Ingredients

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { colors, spacing, typography, fontFamily } from '../styles';
import {
  getHautAnalysisResults,
  transformHautResults,
  generateConcernMessage,
  getRoutineItems,
} from '../utils/newApiService';
import { format, isToday, isYesterday } from 'date-fns';
import ingredientsData from '../data/Ingredients.json';

interface TopConcern {
  name: string;
  metricKey: string;
  value: number;
  change: number | null;
  changeText: string;
  changeDirection: 'up' | 'down' | 'none';
  ingredients: string[];
  foundIngredients: Array<string | { ingredient: string; products?: string[] }>;
  ingredientsLoading: boolean;
}

// Helper to convert metricKey to concern name for API
const getConcernNameForAPI = (metricKey: string) => {
  if (!metricKey) return null;
  let processedKey = metricKey;
  if (processedKey.endsWith('Score')) {
    processedKey = processedKey.substring(0, processedKey.length - 'Score'.length);
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

// Helper to get ingredients from Ingredients.json based on metricKey
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
  const concernName = mapping[metricKey] || mapping[metricKey.replace('Score', '')];
  if (!concernName) return [];
  const concern = (ingredientsData.SKIN_CONCERNS as any[]).find(
    c => c.name === concernName,
  );
  return concern ? concern.Ingredients : [];
};

export default function TopConcernsDetailScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params as any) || {};
  const currentPhoto = params.photo || null;

  const [topConcerns, setTopConcerns] = useState<TopConcern[]>([]);
  const [isLoadingConcerns, setIsLoadingConcerns] = useState<boolean>(false);
  const [expandedConcerns, setExpandedConcerns] = useState<Record<string, boolean>>({});
  const [routineItems, setRoutineItems] = useState<any[]>([]);

  // Toggle ingredient visibility for a concern
  const toggleConcernExpanded = (concernName: string) => {
    setExpandedConcerns(prev => ({
      ...prev,
      [concernName]: !prev[concernName],
    }));
  };

  // Get score indicator color
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#22C55E'; // Green
    if (score >= 50) return '#EAB308'; // Yellow
    return '#EF4444'; // Red
  };

  // Load routine items and compute counts
  const loadRoutineData = async () => {
    try {
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
        const transformed = response.data.map((apiItem: any) => ({
          id: apiItem.id,
          name: apiItem.name,
          type: typeMap[apiItem.type] || apiItem.type,
          extra: apiItem.extra || {},
        }));
        setRoutineItems(transformed);
      }
    } catch (error) {
      console.error('Error loading routine items in detail screen:', error);
    }
  };

  // Load concerns for current photo
  const loadConcernsForPhoto = async (photo: any) => {
    if (!photo?.id && !photo?.hautUploadData?.imageId) {
      setIsLoadingConcerns(false);
      return;
    }

    const imageId = photo.hautUploadData?.imageId || photo.id;
    const hautBatchId = photo.hautUploadData?.hautBatchId || photo.hautBatchId;
    setIsLoadingConcerns(true);

    try {
      // Get current photo results
      const results = await getHautAnalysisResults(hautBatchId || imageId);
      let previousMetrics: any = null;

      // SPECULATIVE: We fetch analysis results for comparison if needed, but since we don't have all photos here,
      // we can fetch the primary data successfully and speculatively display the values.
      if (results && results.length > 0) {
        const transformedMetrics: any = transformHautResults(results);

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
          if (diff > 0) {
            return { change: diff, changeText: `↑${absDiff}`, changeDirection: 'up' };
          } else {
            return { change: diff, changeText: `↓${absDiff}`, changeDirection: 'down' };
          }
        };

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

        const concerns: TopConcern[] = [];
        Object.entries(METRIC_TO_CONCERN_MAP).forEach(([metricKey, concernName]) => {
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
        });

        setTopConcerns(concerns);

        // Fetch routine-match data for each concern's ingredients
        concerns.forEach(async concern => {
          if (concern.ingredients.length === 0) return;
          const apiConcernName = getConcernNameForAPI(concern.metricKey);
          if (!apiConcernName) return;
          try {
            const response = (await generateConcernMessage(apiConcernName)) as any;
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
          } catch (e) {
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
      console.error('Error fetching concerns in detail screen:', error);
    } finally {
      setIsLoadingConcerns(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRoutineData();
      if (currentPhoto) {
        loadConcernsForPhoto(currentPhoto);
      }
    }, [currentPhoto])
  );

  // Compute products and ingredients counts
  const productsCount = useMemo(() => {
    return routineItems.filter(item => item.type?.toLowerCase() === 'product').length;
  }, [routineItems]);

  const ingredientsCount = useMemo(() => {
    const uniqueIngs = new Set<string>();
    routineItems.forEach(item => {
      if (item.type?.toLowerCase() === 'product') {
        const ingredients = item.extra?.ingredients || [];
        ingredients.forEach((ing: any) => {
          if (typeof ing === 'string') {
            uniqueIngs.add(ing.trim().toLowerCase());
          } else if (ing && typeof ing === 'object' && ing.ingredient) {
            uniqueIngs.add(ing.ingredient.trim().toLowerCase());
          }
        });
      }
    });
    return uniqueIngs.size;
  }, [routineItems]);

  const isProductsZero = productsCount === 0;
  const isIngredientsZero = ingredientsCount === 0;
  const boldProducts = isProductsZero || isIngredientsZero;

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
            <SkeletonPlaceholder.Item width={100} height={20} borderRadius={4} />
            <SkeletonPlaceholder.Item width={80} height={28} borderRadius={12} />
          </SkeletonPlaceholder.Item>
        ))}
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <View style={styles.iconContainer}>
              <ChevronLeft size={30} color="#00839B" />
            </View>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle} allowFontScaling={false}>Top Concerns Details</Text>
          </View>
          <View style={styles.rightContainer} />
        </View>
        <View style={styles.shadowContainer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionCard}>
          {/* Routine Products & Ingredients Summary */}


          {isLoadingConcerns ? (
            <ConcernsSkeleton />
          ) : topConcerns.length > 0 ? (
            <>
              <Text style={styles.concernSubtitle}>
                Dermatologists recommend at least one of the following ingredients for your concerns
              </Text>
              {topConcerns.map(concern => {
                const isExpanded = expandedConcerns[concern.name] ?? false;
                const MAX_VISIBLE = 2;
                const hasAtLeastOne =
                  concern.foundIngredients && concern.foundIngredients.length > 0;
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
                          photoData: currentPhoto ? JSON.stringify(currentPhoto) : undefined,
                          precomputedChange:
                            concern.change !== undefined &&
                              concern.changeDirection &&
                              concern.changeDirection !== 'none'
                              ? {
                                arrow: concern.changeDirection === 'up' ? '↑' : '↓',
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
                                  backgroundColor: getScoreColor(concern.value),
                                },
                              ]}
                            />
                            <Text style={styles.concernValue}>
                              {concern.value}
                              <Text style={styles.scoreOutOf}> /100</Text>
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
                                <SkeletonPlaceholder.Item width={100} height={14} borderRadius={4} />
                                <SkeletonPlaceholder.Item width={80} height={14} borderRadius={4} />
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
                            colonIndex > 0 ? ingredient.substring(colonIndex + 1).trim() : '';

                          const foundEntry = concern.foundIngredients?.find(found => {
                            if (typeof found === 'string') {
                              return (
                                found.toLowerCase().trim() === ingredientName.toLowerCase().trim()
                              );
                            }
                            return (
                              (found as any)?.ingredient?.toLowerCase().trim() ===
                              ingredientName.toLowerCase().trim()
                            );
                          });
                          const isFound = Boolean(foundEntry);
                          const isLast = idx === visibleIngredients.length - 1 && !hasMore;

                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[styles.ingredientRow, !isLast && styles.ingredientRowBorder]}
                              onPress={() => {
                                const message = `Tell me more about ${ingredientName.toLowerCase()} and how it can help my skin.`;
                                (navigation as any).navigate('ThreadChat', {
                                  chatType: 'ingredients_related_chat',
                                  initialMessage: message,
                                  draftMessage: message,
                                  hideInitial: true,
                                  imageId: currentPhoto?.id || null,
                                });
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <View style={styles.ingredientNameRow}>
                                  <Text style={styles.ingredientName}>{ingredientName}</Text>
                                  <ChevronRight size={24} color="#A9A29D" />
                                </View>
                                <View style={styles.routineChip}>
                                  <View
                                    style={[
                                      styles.routineDot,
                                      {
                                        backgroundColor: isFound ? '#12B76A' : '#A9A29D',
                                      },
                                    ]}
                                  />
                                  <Text style={styles.routineText}>
                                    {isFound ? 'In your Routine' : 'Not in Routine'}
                                  </Text>
                                </View>
                                {isFound &&
                                  foundEntry &&
                                  typeof foundEntry !== 'string' &&
                                  Array.isArray(foundEntry.products) &&
                                  foundEntry.products.length > 0 ? (
                                  <View>
                                    {foundEntry.products.map((product: string, pIdx: number) => (
                                      <Text key={pIdx} style={styles.productHighlight}>
                                        {product}
                                      </Text>
                                    ))}
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
                            onPress={() => toggleConcernExpanded(concern.name)}
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
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No concerns data available.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

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
    height: 105,
    backgroundColor: colors.white,
    borderBottomWidth: 0.4,
    borderBottomColor: '#E5E5E5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 55,
    paddingBottom: 10,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    color: colors.textPrimary,
    //fontFamily: fontFamily.bold,
    fontWeight: '500',
  },
  rightContainer: {
    width: 44,
    height: 44,
  },
  shadowContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#00839B',
    opacity: 0.1,
  },
  scrollView: {
    flex: 1,
    marginTop: 105,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryContainer: {
    backgroundColor: '#F5F5F4',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  routineSummaryText: {
    fontSize: 14,
    color: '#44403C',
    lineHeight: 20,
    fontFamily: fontFamily.medium,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#1C1917',
    fontFamily: fontFamily.bold,
  },
  concernSubtitle: {
    fontSize: 14,
    color: '#79716B',
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: fontFamily.regular,
  },
  concernCard: {
    backgroundColor: '#F5F5F4',
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
  scoreIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
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
  scoreOutOf: {
    color: '#A9A29D',
  },
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
  showMoreButton: {
    paddingVertical: 10,
  },
  showMoreText: {
    fontSize: 13,
    color: '#A8A29E',
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
});
