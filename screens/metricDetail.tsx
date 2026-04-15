// metricDetail.tsx
// Screen component for displaying detailed information about a specific skin metric

/* ------------------------------------------------------
WHAT IT DOES
- Displays detailed information for a single skin metric
- Shows overall score, breakdown, and additional details from Haut analysis
- Provides educational information about the metric
- Shows historical data and improvement suggestions

DATA USED
- route.params: Contains metric information passed from MetricsSheet
  - metricKey: The key name of the metric (e.g., "hydrationScore")
  - metricValue: The numeric value (0-100) or string value
  - photoData: Full photo document from Firestore with all metrics and results

DEVELOPMENT HISTORY
- Tue Mar 30 2025
  - Initial implementation
------------------------------------------------------*/

// Type definitions
interface RouteParams {
  metricKey: string;
  metricValue: string | number;
  photoData?: string;
  maskResults?: any;
  maskImages?: any;
  precomputedChange?: { arrow: string; value: number };
}

interface PhotoData {
  skin_result_id: string;
  created_at: { seconds: number; nanoseconds: number } | Date | string | number;
  skin_type?: string;
  skin_condition_score?: number;
  [key: string]: any;
}

interface Profile {
  birth_date?: string | Date;
  [key: string]: any;
}

interface User {
  [key: string]: any;
}

interface ProcessedData {
  photoId: string;
  date: Date;
  score: number | null;
  skinType?: string | null;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }>;
}

interface MetricInfo {
  title: string;
  description: string;
  characteristics?: string[];
  careApproach?: string;
  considerations?: string;
  maskVerbiage?: string[];
}

interface ScoreLevel {
  text: string;
  min?: number;
  max?: number;
}

interface AdviceData {
  disclaimer: string;
  ingredients: string[];
  Behavior: string[];
  'Lifestyle Tips'?: string[];
}

interface ConcernDetail {
  keyForLookup: string;
  displayName: string;
  overview: string;
  contextText?: string;
  scoreLevels: Record<string, ScoreLevel>;
  advice?: AdviceData;
  lifestyleTips?: string[];
  typeDescriptions?: Record<
    string,
    {
      description: string;
      characteristics: string;
      careApproach: string;
    }
  >;
  toneDescriptions?: Record<
    string,
    {
      description: string;
      characteristics: string;
      considerations: string;
    }
  >;
  ageGuidance?: {
    youngerThanActual: string;
    matchesActual: string;
    olderThanActual: string;
  };
  ageConsiderations?: {
    earlierAging: string;
    expressionLines: string;
    prevention: string;
  };
  metricType?: string;
  _isProfileMetric?: boolean;
  maskVerbiage?: string[];
}

const dummyPhotos: PhotoData[] = [];

const SKIN_TYPES: string[] = ['Dry', 'Normal', 'Combinational', 'Oily'];

const CHART_HEIGHT = 180;
const PADDING = 25;

import * as React from 'react';
const { useState, useEffect, useRef } = React;
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ImageStyle,
  ActivityIndicator,
  Dimensions,
  DeviceEventEmitter,
} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  AlertCircle,
  Star,
  CheckCircle,
  CircleCheck,
  Plus,
  RotateCcw,
  SoapDispenserDroplet,
  ShieldPlus,
} from 'lucide-react-native';
import { ConditionalImage } from '../utils/imageUtils';
import { useRoute, useNavigation } from '@react-navigation/native';
import { usePhotoContext } from '../contexts/PhotoContext';
import ListItem from '../components/ui/ListItem';
//import FloatingTooltip from '../../components/ui/FloatingTooltip';
import { colors, fontFamily, spacing } from '../styles';
import useAuthStore from '../stores/authStore';
import {
  getSkinTrendScores,
  getHautMaskImages,
  generateConcernMessage,
  toggleTopConcern,
} from '../utils/newApiService';
import { LineChart } from 'react-native-chart-kit';

// Import the JSON data
// @ts-ignore
import concernsData from '../data/concerns.json';
import ingredientsData from '../data/Ingredients.json';

import MetricsSeries_simple from '../components/analysis/MetricsSeries_simple';
import MetricsSeries, {
  MetricRow,
  processPhotoMetrics,
  METRIC_LABELS,
} from '../components/analysis/MetricsSeries';

// Helper functions for perceived age chart
const calculateActualAge = (
  birthDate: string | Date | undefined,
): number | null => {
  if (!birthDate) return null;
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const getAgeComparisonColor = (
  perceivedAge: number | null,
  actualAge: number | null,
): string => {
  if (!actualAge || !perceivedAge) return '#222';

  const ageDifference = perceivedAge - actualAge;

  if (ageDifference > 5) {
    return '#FF3B30'; // Red - perceived age is more than 5 years greater than actual age
  } else if (ageDifference > 0) {
    return '#FFB340'; // Yellow - perceived age is greater than actual age but within 5 years
  } else {
    return '#34C759'; // Green - perceived age is less than or equal to actual age (good)
  }
};

const getColorForScore = (score: number): string => {
  if (score <= 30) return '#FF3B30';
  if (score <= 70) return '#FFB340';
  return '#34C759';
};

// Helper function to generate light version of a color
const getLightColor = (hexColor: string): string => {
  if (!hexColor || hexColor === '#999999') return '#f0f0f0';

  switch (hexColor) {
    case '#FF3B30':
      return '#FFEBEA'; // Light red
    case '#FFB340':
      return '#FFF4E6'; // Light amber
    case '#34C759':
      return '#E8F5E8'; // Light green
    default:
      return '#f0f0f0';
  }
};

interface PerceivedAgeChartProps {
  photos: PhotoData[];
}

const PerceivedAgeChart: React.FC<PerceivedAgeChartProps> = ({ photos }) => {
  const { profile } = useAuthStore();
  const scrollViewRef = useRef<ScrollView>(null);

  // Process photos to get perceived age data
  const processedData: ProcessedData[] = photos
    .map(photo => {
      let dateValue;
      const ts = photo.created_at;
      if ((ts as any)?.seconds && typeof (ts as any).seconds === 'number') {
        dateValue = new Date(
          (ts as any).seconds * 1000 +
          ((ts as any).nanoseconds ? (ts as any).nanoseconds / 1000000 : 0),
        );
      } else if (ts instanceof Date) {
        dateValue = ts;
      } else if (typeof ts === 'string' || typeof ts === 'number') {
        dateValue = new Date(ts);
      } else {
        return null;
      }

      if (!(dateValue instanceof Date && !isNaN(dateValue.getTime()))) {
        return null;
      }

      return {
        photoId: photo.skin_result_id,
        date: dateValue,
        score: photo.skin_condition_score ?? null,
      };
    })
    .filter(item => item !== null) as ProcessedData[];

  // Scroll to the end (latest point) when component mounts or data changes
  useEffect(() => {
    if (scrollViewRef.current && processedData.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [processedData.length]);

  if (!processedData.length) {
    return (
      <Text style={styles.trendPlaceholderText}>
        No perceived age data available.
      </Text>
    );
  }

  // Chart constants
  const barWidth = 10;
  const barRadius = 5;
  const barSlotWidth = 16;
  const plotAreaWidth = processedData.length * barSlotWidth;
  const chartHeight = 48;

  const paddingTop = 28;
  const effectiveChartHeight = chartHeight;

  return (
    <View style={{ height: chartHeight + 40 }}>
      <View
        style={{
          flexDirection: 'row',
          height: chartHeight,
          paddingTop: paddingTop,
        }}
      >
        {/* Y-Axis Labels - Fixed, outside ScrollView */}
        <View
          style={[
            styles.yAxisLabelsContainerFixed,
            { height: effectiveChartHeight, marginLeft: -20 },
          ]}
        >
          <Text style={[styles.yAxisLabel, { position: 'absolute', top: 0 }]}>
            100
          </Text>
          <Text
            style={[
              styles.yAxisLabel,
              { position: 'absolute', top: effectiveChartHeight / 2 - 6 },
            ]}
          >
            50
          </Text>
          <Text
            style={[styles.yAxisLabel, { position: 'absolute', bottom: 0 }]}
          >
            0
          </Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1, height: effectiveChartHeight, marginLeft: 10 }}
          contentContainerStyle={{
            paddingRight: 16,
          }}
        >
          <View
            style={[
              styles.plotArea,
              { width: plotAreaWidth, height: effectiveChartHeight },
            ]}
          >
            {/* Y-Axis Grid Lines */}
            <View style={styles.gridContainer}>
              <View
                style={[
                  styles.yAxisGridLine,
                  { bottom: effectiveChartHeight - 1 },
                ]}
              />
              <View
                style={[
                  styles.yAxisGridLine,
                  { bottom: effectiveChartHeight / 2 },
                ]}
              />
              <View style={[styles.yAxisGridLine, { bottom: 0 }]} />
            </View>

            {/* Bars */}
            {processedData.map((scoreData, index) => {
              const actualAge = calculateActualAge(profile?.birth_date);
              const color = getAgeComparisonColor(scoreData.score, actualAge);

              if (!scoreData.score || scoreData.score === null) {
                // Render null data indicator
                const xPosition = index * barSlotWidth;
                return (
                  <View
                    key={scoreData.photoId}
                    style={[
                      styles.nullBarContainer,
                      {
                        left: xPosition,
                        bottom: effectiveChartHeight / 2 - 2,
                      },
                    ]}
                  >
                    <View style={styles.nullBar} />
                  </View>
                );
              }

              // Calculate bar height and position
              const barHeight = (scoreData.score / 100) * effectiveChartHeight;
              const xPosition = index * barSlotWidth;
              const isRecent = index >= processedData.length - 3;

              return (
                <View
                  key={scoreData.photoId}
                  style={{
                    position: 'absolute',
                    left: xPosition,
                    bottom: 0,
                    width: barSlotWidth,
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: barSlotWidth,
                      height: effectiveChartHeight,
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {/* Light background bar with shadow */}
                    <View
                      style={[
                        styles.bar,
                        {
                          width: barWidth,
                          height: Math.max(barHeight, 2),
                          borderRadius: barRadius,
                          backgroundColor: getLightColor(color),
                          opacity: isRecent ? 1 : 0.7,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.2,
                          shadowRadius: 2,
                          elevation: 2,
                        },
                      ]}
                    />

                    {/* Dark circle at top of bar */}
                    <View
                      style={[
                        styles.barCircle,
                        {
                          backgroundColor: color,
                          opacity: isRecent ? 1 : 0.7,
                          position: 'absolute',
                          bottom: Math.max(barHeight - 3, -1),
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.3,
                          shadowRadius: 2,
                          elevation: 3,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const SkinTypeTrendChart = ({ photos }: { photos: PhotoData[] }) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Process photos to get skin type data

  console.log('🔵 photos of SkinTypeTrendChart: in metricDetail.js', photos);

  const processedData = photos
    .map(photo => {
      let dateValue;
      const ts = photo.created_at;
      if ((ts as any)?.seconds && typeof (ts as any).seconds === 'number') {
        dateValue = new Date(
          (ts as any).seconds * 1000 +
          ((ts as any).nanoseconds ? (ts as any).nanoseconds / 1000000 : 0),
        );
      } else if (ts instanceof Date) {
        dateValue = ts;
      } else if (typeof ts === 'string' || typeof ts === 'number') {
        dateValue = new Date(ts);
      } else {
        return null;
      }

      if (!(dateValue instanceof Date && !isNaN(dateValue.getTime()))) {
        return null;
      }

      return {
        photoId: photo.skin_result_id,
        date: dateValue,
        skinType: photo.skin_condition_type || photo.skinType || null,
      };
    })
    .filter(item => item !== null) as {
      photoId: string;
      date: Date;
      skinType: string | null;
    }[];

  // Scroll to the end (latest point) when component mounts or data changes
  useEffect(() => {
    if (processedData.length > 0 && scrollViewRef.current) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [processedData.length]);

  if (!processedData.length) {
    return (
      <Text style={styles.trendPlaceholderText}>
        No skin type data available.
      </Text>
    );
  }

  // Map skin types to numeric values for chart
  const skinTypeMap: Record<string, number> = {
    Oily: 1, // bottom
    Combinational: 2, // above oily
    Normal: 3, // above combination
    Dry: 4, // top
  };

  // Reverse the data so latest point is at the very last position
  const reversedProcessedData = [...processedData].reverse();

  // Prepare data for chart (using reversed data)
  const realData = reversedProcessedData.map(item => {
    if (!item.skinType || item.skinType === 'Unknown') return 2;
    return skinTypeMap[item.skinType] || 2;
  });

  const chartData = {
    labels: reversedProcessedData.map((_, index) => `${index + 1}`),
    datasets: [
      {
        // 👀 Real user data
        data: realData,
        color: () => `#8b7ba8`,
        strokeWidth: 3,
      },
      {
        // 👻 Hidden scaling dataset
        data: [1, 4],
        color: () => `transparent`, // hide line
        withDots: false, // hide dots
        strokeWidth: 0, // hide stroke
      },
    ],
  };

  console.log(
    '🔵 chartData of SkinTypeTrendChart: in metricDetail.js',
    chartData,
  );

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32; // Account for margins

  const renderYAxisLabels = () => {
    return (
      <View
        style={{
          flexDirection: 'column',
          gap: 10,
          paddingVertical: 7,
          paddingHorizontal: 4,
        }}
      >
        {SKIN_TYPES.map((skinType, index) => {
          // const y = PADDING + (index / (SKIN_TYPES.length - 1)) * (CHART_HEIGHT - 2 * PADDING); // This 'y' is not used for positioning in this render method
          return (
            <View
              key={skinType} // Added key prop
              style={{
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.1)', // light border
                borderRadius: 16, // makes pill shape
                paddingHorizontal: 10,
                paddingVertical: 7,
                alignSelf: 'flex-start', // shrink to text size
                opacity: 0.7, // highlight active one
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: '#333',
                  fontWeight: '500',
                }}
              >
                {skinType}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.skinTypeChartContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <LineChart
          data={chartData}
          width={Math.max(chartWidth, processedData.length * 40)}
          height={160}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(110, 70, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6', // dot radius
              strokeWidth: '2', // border thickness
              stroke: '#fff', // border color (purple)
              fill: '#8b7ba8', // inside color (white makes border pop)
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#E0E0E0',
            },
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16,
            marginLeft: 0,
          }}
          bezier
          withVerticalLabels={false} // ❌ removes Y-axis numbers
          withHorizontalLabels={false} // ❌ removes X-axis numbers
          withInnerLines={true} // keep dashed lines if you want
          withOuterLines={false} // removes border lines
          yLabelsOffset={0} // no extra spacing for labels
          withDots={true}
          withShadow={false}
          //  withInnerLines={true}
          //  withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          segments={3}
          fromZero={false}
        // formatYLabel={(value) => {
        //   const numValue = parseFloat(value);
        //   if (numValue === 1) return 'Dry';
        //   if (numValue === 2) return 'Normal';
        //   if (numValue === 3) return 'Combination';
        //   if (numValue === 4) return 'Oily';
        //   return '';
        // }}
        // formatXLabel={(value) => {
        //   const index = parseInt(value) - 1;
        //   if (index >= 0 && index < processedData.length) {
        //     const date = processedData[index].date;
        //     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        //   }
        //   return value;
        // }}
        />
      </ScrollView>

      <View style={styles.floatingYAxis}>{renderYAxisLabels()}</View>

      {/* Legend */}
    </View>
  );
};

// Helper function to map metric keys to condition names for mask images
const getHeaderNameForMetric = (metricKey: string) => {
  const mapping: Record<string, string> = {
    rednessScore: 'Redness',
    hydrationScore: 'Dewiness',
    eyeAge: 'Perceived Eye Age',
    poresScore: 'Visible Pores',
    acneScore: 'Breakouts',
    linesScore: 'Lines',
    translucencyScore: 'Translucency',
    pigmentationScore: 'Pigmentation',
    uniformnessScore: 'Evenness',
    eyeAreaCondition: 'Dark Circles',
    perceivedAge: 'Perceived Age',
    skinTone: 'Skin Tone',
    skinType: 'Skin Type',
    puffinessScore: 'Eye Puffiness',
    saggingScore: 'Sagging',
  };

  return mapping[metricKey] || null;
};

// Helper function to map metric keys to condition names for mask images
const getConditionNameForMetric = (metricKey: string) => {
  const mapping: Record<string, string> = {
    rednessScore: 'redness',
    hydrationScore: 'hydration',
    eyeAge: 'dark_circles',
    poresScore: 'pores',
    acneScore: 'breakouts',
    linesScore: 'lines',
    translucencyScore: 'translucency',
    pigmentationScore: 'pigmentation',
    uniformnessScore: 'uniformness',
    eyeAreaCondition: 'dark_circles',
    skinTone: 'skin_tone',
    skinType: 'skin_type',
    puffinessScore: 'puffiness',
    saggingScore: 'sagging',
    darkCirclesScore: 'dark_circles',
    eyebags: 'dark_circles',
  };

  return mapping[metricKey] || null;
};

// Helper function to map metric keys to skin condition names for trend API
const getSkinConditionNameForMetric = (metricKey: string) => {
  const mapping: Record<string, string> = {
    rednessScore: 'redness',
    hydrationScore: 'hydration',
    eyeAge: 'eyes_age',
    poresScore: 'pores',
    acneScore: 'breakouts',
    linesScore: 'lines',
    translucencyScore: 'translucency',
    pigmentationScore: 'pigmentation',
    uniformnessScore: 'uniformness',
    eyeAreaCondition: 'dark_circles',
    perceivedAge: 'age',
    skinTone: 'skin_tone',
    skinType: 'skin_type',
    puffinessScore: 'puffiness',
    saggingScore: 'sagging',
  };

  return mapping[metricKey] || null;
};

const getSkinConditionAliases = (conditionName: string | null): string[] => {
  if (!conditionName) return [];
  if (conditionName === 'breakouts') return ['breakouts', 'acne'];
  if (conditionName === 'acne') return ['acne', 'breakouts'];
  return [conditionName];
};

// Helper function to convert metricKey to concern name for API
const getConcernNameForAPI = (metricKey: string) => {
  if (!metricKey) return null;

  // Remove "Score" suffix if present
  let processedKey = metricKey;
  if (processedKey.endsWith('Score')) {
    processedKey = processedKey.substring(
      0,
      processedKey.length - 'Score'.length,
    );
  }

  // Convert camelCase to Title Case
  // Handle special cases first
  const specialCases: Record<string, string> = {
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

  if (specialCases[processedKey]) {
    return specialCases[processedKey];
  }

  // Default: convert camelCase to Title Case
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

// Helper functions for processing metrics data
const metricHelpers = {
  // Convert camelCase metric key to snake_case tech_name format
  getMatchPattern: (key: string) => {
    if (!key) return '';
    return key
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  },

  // Get metrics related to a specific key from area_results
  getRelatedMetrics: (areaResults: any[], metricKey: string) => {
    if (!areaResults || !Array.isArray(areaResults) || !metricKey) {
      return [];
    }

    const techNamePattern = metricHelpers.getMatchPattern(metricKey);
    const baseName = techNamePattern.replace('_score', '');

    // console.log(`Finding metrics related to: ${techNamePattern} (base: ${baseName})`);

    return areaResults.filter(metric => {
      // Match exactly by tech_name or loosely by name
      return (
        metric.tech_name?.includes(techNamePattern) ||
        metric.tech_name?.includes(baseName) ||
        (metric.name && metric.name.toLowerCase().includes(baseName))
      );
    });
  },

  // Extract related metrics from FM3 results structure
  extractFm3RelatedMetrics: (fm3Results: any, metricKey: string) => {
    if (!fm3Results || !metricKey) return [];

    const fm3Mapping: Record<string, string> = {
      acneScore: 'breakouts',
      rednessScore: 'redness',
      poresScore: 'pores',
      perceivedAge: 'age',
      eyeAge: 'eyes_age',
      skinTone: 'skintone',
      skinType: 'skin_type',
      hydrationScore: 'hydration',
      pigmentationScore: 'pigmentation',
      linesScore: 'lines',
      uniformnessScore: 'uniformness',
      eyeAreaCondition: 'dark_circles',
    };

    const fm3Key = fm3Mapping[metricKey] || metricKey;
    const metricData = fm3Results[fm3Key];

    if (!metricData) return [];

    const related: any[] = [];

    // 1. Add the main metric as "Overall" or "face"
    related.push({
      tech_name: fm3Key,
      value:
        typeof metricData.score === 'number'
          ? metricData.score
          : metricData.age || metricData.eyes_age || metricData.classification,
      area_name: 'face',
      tag: metricData.tag,
      grade: metricData.grade,
    });

    // 2. Add area-specific metrics if available
    if (metricData.areas && typeof metricData.areas === 'object') {
      Object.keys(metricData.areas).forEach(area => {
        related.push({
          tech_name: `${fm3Key}_${area}`,
          value: metricData.areas[area].score || metricData.areas[area].value,
          area_name: area,
          tag: metricData.areas[area].tag,
        });
      });
    }

    return related;
  },

  // Group metrics by facial region
  groupByRegion: (metrics: any[]) => {
    const regions: Record<string, any[]> = {};

    metrics.forEach(metric => {
      const region = metric.area_name || 'Overall';
      if (!regions[region]) {
        regions[region] = [];
      }
      regions[region].push(metric);
    });

    return regions;
  },

  // Format metric value based on widget_type
  formatValue: (metric: any) => {
    if (metric.value === undefined) return 'N/A';

    // Round numerical values to 1 decimal place
    let formattedValue =
      typeof metric.value === 'number'
        ? Math.round(metric.value * 10) / 10
        : metric.value;

    // Add unit if available
    if (metric.unit) {
      formattedValue = `${formattedValue} ${metric.unit}`;
    }

    // Custom formatting based on widget_type
    switch (metric.widget_type) {
      case 'category':
        // For categorical values, no additional formatting
        return formattedValue;
      case 'density':
      case 'bad_good_line':
        // For score-type metrics, add /100 if no unit and value is numeric
        if (typeof metric.value === 'number' && !metric.unit) {
          return `${formattedValue}/100`;
        }
        return formattedValue;
      default:
        return formattedValue;
    }
  },

  // Helper function to find the appropriate score level based on value
  getScoreLevelForValue: (
    scoreLevels: Record<string, ScoreLevel>,
    value: number,
  ) => {
    if (!scoreLevels || value === undefined) return null;

    // Find the level where value is between min and max
    const levelKey = Object.keys(scoreLevels).find(key => {
      const level = scoreLevels[key];
      return value >= (level.min ?? 0) && value <= (level.max ?? 100);
    });

    return levelKey ? scoreLevels[levelKey] : null;
  },

  // Get appropriate description for a metric based on value and type
  getMetricDescription: (
    metric: any,
    defaultKey: string,
    displayType: string,
    currentConcernDetails: ConcernDetail | null,
  ) => {
    // First try to use the new scoreLevels structure from concerns.json
    if (
      currentConcernDetails &&
      currentConcernDetails.scoreLevels &&
      typeof metric === 'number'
    ) {
      const scoreLevel = metricHelpers.getScoreLevelForValue(
        currentConcernDetails.scoreLevels,
        metric,
      );
      if (scoreLevel && scoreLevel.text) {
        return scoreLevel.text;
      }
    }

    // Fallback to the old hardcoded descriptions for concerns that don't have scoreLevels yet
    const descriptions: Record<string, any> = {
      hydrationScore: {
        good: 'Your skin is well-hydrated.',
        fair: 'Your skin could use more hydration.',
        bad: 'Your skin is dehydrated.',
      },
      acneScore: {
        good: 'Your skin shows minimal acne activity.',
        fair: 'Your skin shows some acne activity.',
        bad: 'Your skin shows significant acne activity.',
      },
      poresScore: {
        good: 'Your pores appear small and refined.',
        fair: 'Your pores are somewhat visible.',
        bad: 'Your pores are enlarged and noticeable.',
      },
      rednessScore: {
        good: 'Your skin shows minimal redness.',
        fair: 'Your skin shows some areas of redness.',
        bad: 'Your skin shows significant redness.',
      },
      pigmentationScore: {
        good: 'Your skin tone is even with minimal pigmentation issues.',
        fair: 'Your skin shows some uneven pigmentation.',
        bad: 'Your skin shows significant pigmentation issues.',
      },
      default: {
        good: 'Your score is excellent!',
        fair: 'Your score is average.',
        bad: 'This metric needs improvement.',
      },
      skinType: {
        // Description for skinType category
        default: `Your skin is classified as {value}. Understanding your skin type helps in choosing the right products.`,
      },
      age: {
        // Description for age values
        default: `This estimates the age appearance of this feature. It is {value} years.`,
      },
      translucencyScore: {
        good: 'Your skin has good translucency.',
        fair: 'Your skin has fair translucency.',
        bad: 'Your skin has poor translucency.',
      },
    };

    if (displayType === 'skinType') {
      return descriptions.skinType.default.replace(
        '{value}',
        metric?.value || defaultKey,
      );
    }
    if (displayType === 'age') {
      return descriptions.age.default.replace(
        '{value}',
        metric?.value || defaultKey,
      );
    }

    // Determine rating category based on value (for fallback descriptions)
    let category = 'fair';
    if (typeof metric === 'number') {
      if (metric >= 70) category = 'good';
      else if (metric < 50) category = 'bad';
    } else if (
      metric?.value !== undefined &&
      typeof metric.value === 'number'
    ) {
      if (metric.value >= 70) category = 'good';
      else if (metric.value < 50) category = 'bad';
    }

    // Get the appropriate description set
    const descriptionSet = descriptions[defaultKey] || descriptions.default;
    return descriptionSet[category];
  },

  // Determine if a metric is a score-type (0-100) or standalone value
  isScoreMetric: (metricKey: string, metricValue: any, metric?: any) => {
    // Known score metrics (ending with "Score")
    if (metricKey && metricKey.endsWith('Score')) {
      return true;
    }

    // Check widget_type if available
    if (metric && metric.widget_type) {
      return metric.widget_type === 'bad_good_line';
    }

    // If numeric and between 0-100, likely a score
    if (
      typeof metricValue === 'number' &&
      metricValue >= 0 &&
      metricValue <= 100
    ) {
      // These known metrics are NOT scores despite being 0-100
      const nonScoreMetrics = ['eyeAge', 'perceivedAge', 'age'];
      return !nonScoreMetrics.some(m => metricKey.includes(m));
    }

    return false;
  },

  // Get the appropriate display format for a metric
  getMetricDisplayInfo: (
    metricKey: string,
    metricValue: any,
    metric: any,
    currentConcernDetails: ConcernDetail | null,
  ) => {
    // Determine display type: 'score', 'category' (for skinType), 'age'
    let displayType = 'score';
    if (['skinType'].includes(metricKey)) {
      // Can be expanded with other categorical non-score metrics
      displayType = 'category';
    } else if (['eyeAge', 'perceivedAge', 'age'].includes(metricKey)) {
      displayType = 'age';
    }

    const isScore =
      displayType === 'score' &&
      metricHelpers.isScoreMetric(metricKey, metricValue, metric);
    let suffix = '';
    let valueDisplay = metricValue;

    // Handle NaN or null/undefined values
    if (
      metricValue === undefined ||
      metricValue === null ||
      (typeof metricValue === 'number' && isNaN(metricValue))
    ) {
      return {
        displayType, // Add displayType
        isScore: false,
        valueDisplay: metric?.value || 'Not Available',
        description: 'This measurement is not available for this photo.',
        showTag: false,
      };
    }

    // For skin type (category display)
    if (displayType === 'category') {
      const actualValue = metric?.value || metricValue;
      return {
        displayType,
        isScore: false,
        valueDisplay: actualValue,
        description: metricHelpers.getMetricDescription(
          metric,
          actualValue,
          displayType,
          currentConcernDetails,
        ),
        showTag: false,
        // options: metricKey === 'skinTone' ? ['Light', 'Intermediate', 'Dark'] : // Original skinTone options
        //          metricKey === 'skinType' ? ['Dry', 'Normal', 'Oily', 'Combination'] : null // Original skinType options
        // For now, icon display for skinType, so options might not be directly used in the card
      };
    }

    // For age metrics (age display)
    if (displayType === 'age') {
      suffix = ' yrs';
      valueDisplay = `${metricValue}${suffix}`;
      return {
        displayType,
        isScore: false, // Age is not a 0-100 score in this context
        valueDisplay,
        description: metricHelpers.getMetricDescription(
          { value: metricValue },
          String(metricValue),
          displayType,
          currentConcernDetails,
        ),
        showTag: false,
      };
    }

    // For numeric count metrics
    if (
      metric &&
      metric.tech_name &&
      (metric.tech_name.includes('number') ||
        metric.tech_name.includes('count'))
    ) {
      return {
        displayType,
        isScore: false,
        valueDisplay: metricValue,
        description: `This measurement shows a count of ${metricValue}.`,
        showTag: false,
      };
    }

    // For density metrics
    if (metric && metric.widget_type === 'density') {
      return {
        displayType,
        isScore: true,
        valueDisplay: `${metricValue}/100`,
        description: metricHelpers.getMetricDescription(
          metricValue,
          metricKey,
          displayType,
          currentConcernDetails,
        ),
        showTag: true,
      };
    }

    // Default for score metrics (0-100)
    if (isScore) {
      return {
        displayType, // Add displayType
        isScore: true,
        valueDisplay: `${metricValue}/100`,
        description: metricHelpers.getMetricDescription(
          metricValue,
          metricKey,
          displayType,
          currentConcernDetails,
        ),
        showTag: true,
      };
    }

    // Default for other numeric, non-score, non-age metrics
    return {
      displayType, // Add displayType
      isScore: false,
      valueDisplay: `${metricValue}`,
      description: `This measurement is ${metricValue}.`, // Generic description
      showTag: false,
    };
  },
};

const sanitizeS3Uri = (
  uriString: string | null | undefined,
): string | null | undefined => {
  if (!uriString) return uriString;
  // Only touch the query part – a cheap approach is just replacing "+" with
  // its percent-encoded form and ensuring no literal spaces remain.
  return uriString.replace(/\+/g, '%2B').replace(/ /g, '%20');
  // return encodeURI(uriString);
};

// DetailSkeleton component for MetricDetail screen
const DetailSkeleton = () => (
  <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        {/* Metric Card Skeleton */}
        <SkeletonPlaceholder borderRadius={12}>
          <SkeletonPlaceholder.Item
            width="100%"
            height={160}
            marginBottom={16}
          />
        </SkeletonPlaceholder>

        {/* Mask Section Skeleton */}
        <SkeletonPlaceholder borderRadius={12}>
          <SkeletonPlaceholder.Item
            width="100%"
            height={300}
            marginBottom={16}
          />
        </SkeletonPlaceholder>

        {/* About Card Skeleton */}
        <SkeletonPlaceholder borderRadius={12}>
          <SkeletonPlaceholder.Item
            width="100%"
            height={200}
            marginBottom={16}
          />
        </SkeletonPlaceholder>

        {/* Ingredients Card Skeleton */}
        <SkeletonPlaceholder borderRadius={12}>
          <SkeletonPlaceholder.Item
            width="100%"
            height={250}
            marginBottom={16}
          />
        </SkeletonPlaceholder>
      </View>
    </ScrollView>
  </View>
);

export default function MetricDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  const { user, profile, topConcerns, setTopConcerns } = useAuthStore();

  // Extract parameters from navigation
  const { metricKey, metricValue, photoData, precomputedChange } = params || {};
  const paramIsTopConcern = (params as any)?.isTopConcern;

  // Handle toggling of top concern
  const [isTogglingConcern, setIsTogglingConcern] = useState(false);
  const concernName = getConcernNameForAPI(metricKey) || '';
  const isTopConcern = topConcerns?.includes(concernName);
  const isTopConcernDisplay = isTopConcern;

  const handleToggleTopConcern = async () => {
    if (!concernName || isTogglingConcern) return;

    // Optimistic update
    const previousConcerns = [...(topConcerns || [])];
    const newConcerns = isTopConcern
      ? previousConcerns.filter(c => c !== concernName)
      : [...previousConcerns, concernName];

    setTopConcerns(newConcerns);
    setIsTogglingConcern(true);

    try {
      const response: any = await toggleTopConcern(concernName);
      if (response.success && response.data?.top_concerns) {
        setTopConcerns(response.data.top_concerns);
        DeviceEventEmitter.emit('refreshTopConcerns');
      }
    } catch (error) {
      console.error('Failed to toggle top concern:', error);
      // Revert on failure
      setTopConcerns(previousConcerns);
    } finally {
      setIsTogglingConcern(false);
    }
  };

  // Parse the photoData if it's a string
  const parsedPhotoData = React.useMemo(() => {
    if (!photoData) return null;
    return typeof photoData === 'string' ? JSON.parse(photoData) : photoData;
  }, [photoData]);

  const [backgroundImageLoading, setBackgroundImageLoading] =
    useState<boolean>(true);
  const [maskImages, setMaskImages] = useState<any>(null);
  // Initialize to true if we have an imageId to fetch
  const [maskImagesLoading, setMaskImagesLoading] = useState<boolean>(
    !!parsedPhotoData?.hautUploadData?.imageId,
  );
  const [maskImageLoading, setMaskImageLoading] = useState<boolean>(true);

  // Reset loading states when navigating to a different metric
  useEffect(() => {
    setBackgroundImageLoading(true);
    setMaskImageLoading(true);

    // Safety timeout: if images don't load within 8 seconds, show whatever we have
    const timer = setTimeout(() => {
      setBackgroundImageLoading(false);
      setMaskImageLoading(false);
      setMaskImagesLoading(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, [metricKey]);

  // Fetch mask images when component loads
  useEffect(() => {
    const fetchMaskImages = async () => {
      const batchId =
        parsedPhotoData?.hautUploadData?.hautBatchId ||
        parsedPhotoData?.hautBatchId;
      if (!batchId) {
        console.log('🔴 No hautBatchId available for fetching mask images');
        setMaskImagesLoading(false);
        return;
      }

      try {
        setMaskImagesLoading(true);
        const batchId =
          parsedPhotoData.hautUploadData.hautBatchId ||
          parsedPhotoData.hautBatchId;
        console.log('🔵 Fetching mask images for batchId:', batchId);

        const maskImagesData = await getHautMaskImages(batchId);
        console.log('✅ Mask images fetched successfully:', maskImagesData);

        setMaskImages(maskImagesData);
      } catch (error) {
        console.error('🔴 Error fetching mask images:', error);
        setMaskImages(null);
      } finally {
        setMaskImagesLoading(false);
      }
    };

    fetchMaskImages();
  }, [
    parsedPhotoData?.hautUploadData?.hautBatchId,
    parsedPhotoData?.hautBatchId,
  ]);

  // State for whether the current concern is being tracked by the user
  // State for the detailed content of the current concern
  const [currentConcernDetails, setCurrentConcernDetails] =
    useState<ConcernDetail | null>(null);
  const lifestyleTips =
    currentConcernDetails?.lifestyleTips ||
    currentConcernDetails?.advice?.['Lifestyle Tips'] ||
    [];
  // State for tooltip
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: { primary?: string; secondary?: string };
  }>({ visible: false, x: 0, y: 0, content: {} });
  // State for skin trend scores
  const [trendScores, setTrendScores] = useState<any>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const forceScrollSyncRef = useRef<boolean>(false);
  const initialSelectionDoneRef = useRef<boolean>(false);

  // State for concern message API
  const [concernMessageData, setConcernMessageData] = useState<{
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
  } | null>(null);
  const [concernMessageLoading, setConcernMessageLoading] =
    useState<boolean>(false);
  const [concernMessageError, setConcernMessageError] = useState<string | null>(
    null,
  );

  // Fetch concern message when ingredients are available
  useEffect(() => {
    const fetchConcernMessage = async () => {
      const ingredients = getIngredientsForMetric(metricKey);
      const displayIngredients =
        ingredients.length > 0
          ? ingredients
          : currentConcernDetails?.advice?.ingredients || [];

      if (displayIngredients.length === 0) {
        return;
      }

      const concernName = getConcernNameForAPI(metricKey);
      console.log('🔵 concernName:', concernName);
      if (!concernName) {
        console.log('⚠️ No concern name found for metricKey:', metricKey);
        return;
      }

      try {
        setConcernMessageLoading(true);
        setConcernMessageError(null);
        console.log('🔵 Fetching concern message for:', concernName);

        const response = (await generateConcernMessage(concernName)) as any;

        if (response && response.success) {
          setConcernMessageData(response.data);
          console.log('Amber message fetched successfully:', response.data);
        } else {
          throw new Error('Failed to fetch concern message');
        }
      } catch (error: any) {
        console.error('🔴 Error fetching concern message:', error);
        setConcernMessageError(
          error?.message || 'Failed to fetch concern message',
        );
        setConcernMessageData(null);
      } finally {
        setConcernMessageLoading(false);
      }
    };

    fetchConcernMessage();
  }, [
    currentConcernDetails?.advice?.ingredients,
    metricKey,
    metricValue,
    photoData,
  ]);

  // Format the metric name for display (convert camelCase to Title Case)
  const formatMetricName = (key: string): string => {
    if (!key) return '';

    let processedKey = key;
    // If the key ends with "Score", remove it for a cleaner title
    if (processedKey.endsWith('Score')) {
      processedKey = processedKey.substring(
        0,
        processedKey.length - 'Score'.length,
      );
    }

    return processedKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Format date for tooltip
  const formatDateLabel = (date: any): string => {
    if (!date) return '';
    const d =
      typeof date === 'object' && date.seconds
        ? new Date(date.seconds * 1000)
        : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRelativeDayLabel = (dateInput: any): string => {
    if (!dateInput) return 'Today';
    const d =
      typeof dateInput === 'object' && dateInput.seconds
        ? new Date(dateInput.seconds * 1000)
        : new Date(dateInput);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate();
    if (isYesterday) return 'Yesterday';
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${monthNames[d.getMonth()]} ${d.getDate()}`;
  };

  // Handle chart selection changes
  const handleChartSelection = (selectionData: {
    visible: boolean;
    barIndex: number;
    dataPoint: { score: number; date: any };
  }) => {
    if (!selectionData.visible) {
      setTooltip({ visible: false, x: 0, y: 0, content: {} });
      return;
    }

    // Calculate screen position for the tooltip
    // This is a rough calculation - you might need to fine-tune based on your layout
    const chartContainerY = 400; // Approximate Y position of the chart on screen
    const chartLeftMargin = 50; // Approximate left margin
    const barWidth = 16; // From chart component

    const x =
      chartLeftMargin + selectionData.barIndex * barWidth + barWidth / 2;
    const y = chartContainerY - 20; // Position above the chart

    setTooltip({
      visible: true,
      x,
      y,
      content: {
        primary: selectionData.dataPoint.score.toString(),
        secondary: formatDateLabel(selectionData.dataPoint.date).replace(
          ', ',
          '\n',
        ),
      },
    });
  };

  // Parse photo date from timestamp if available
  const formatDate = (timestamp: any): string => {
    // Add proper checking for undefined or null values
    if (!timestamp || typeof timestamp !== 'string') {
      return 'No date available';
    }

    try {
      // Extract date from string format "30 March 2025 at 09:39:58 UTC-7"
      const dateMatch = timestamp.match(/(\d+)\s+(\w+)\s+(\d+)/);
      if (dateMatch) {
        return `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}`;
      }
      return timestamp; // Return the original string if regex doesn't match
    } catch (error) {
      // console.log('Error formatting date:', error);
      return 'Date format error';
    }
  };

  // Helper function to get tag and colors based on metric value
  const getMetricTag = (
    value: number,
  ): { tag: string; color: string; bg: string } => {
    if (value >= 70) return { tag: 'GOOD', color: '#2e7d32', bg: '#e6f4ea' };
    if (value < 50) return { tag: 'BAD', color: '#c62828', bg: '#fdecea' };
    return { tag: 'FAIR', color: '#f57c00', bg: '#fff8e1' };
  };

  // Get metric styling
  const {
    tag: metricTag,
    color: metricColor,
    bg: metricBg,
  } = getMetricTag(Number(metricValue));

  const [groupedMetrics, setGroupedMetrics] = useState<Record<string, any>>({});
  const [metricDisplayInfo, setMetricDisplayInfo] = useState<{
    displayType: string;
    isScore: boolean;
    valueDisplay: string;
    description: string;
    showTag: boolean;
  }>({
    displayType: 'score', // Default display type
    isScore: true,
    valueDisplay: '',
    description: '',
    showTag: true,
  });

  const { photos } = usePhotoContext();

  useEffect(() => {
    // Load concern details from JSON
    if (metricKey && concernsData) {
      // First check if this is a profile metric (non-scored)
      const profileMetrics = ['skinType', 'perceivedAge', 'eyeAge', 'skinTone'];
      const isProfileMetric = profileMetrics.includes(metricKey);

      // console.log('Metric type check:', { metricKey, isProfileMetric });

      let details: ConcernDetail | null = null;

      if (isProfileMetric && concernsData.skinProfiles) {
        // Look in skinProfiles for non-scored metrics
        details =
          (concernsData.skinProfiles as Record<string, any>)[metricKey] ||
          (concernsData.skinConcerns as Record<string, any>)[metricKey];
        if (details) {
          // Add a flag to indicate this is a profile metric
          details._isProfileMetric = true;
        }
      } else if (concernsData.skinConcerns) {
        // Look in skinConcerns for scored metrics
        // console.log('Looking for scored metric in skinConcerns:', metricKey);
        details = (concernsData.skinConcerns as Record<string, any>)[metricKey];
        if (!details) {
          // Try with "Score" suffix if it's not there
          const keyWithScore = metricKey.endsWith('Score')
            ? metricKey
            : `${metricKey}Score`;
          details = (concernsData.skinConcerns as Record<string, any>)[
            keyWithScore
          ];

          if (!details) {
            // Try without "Score" suffix
            const keyWithoutScore = metricKey.endsWith('Score')
              ? metricKey.replace('Score', '')
              : metricKey;
            details = (concernsData.skinConcerns as Record<string, any>)[
              keyWithoutScore
            ];
          }
        }
      }

      if (details) {
        setCurrentConcernDetails(details);
      } else {
        console.warn(`No details found for metricKey: ${metricKey}`);
        console.warn(
          'Available score keys:',
          Object.keys(concernsData.skinConcerns || {}),
        );
        console.warn(
          'Available profile keys:',
          Object.keys(concernsData.skinProfiles || {}),
        );
        setCurrentConcernDetails(null);
      }
    }

    const rawResults = parsedPhotoData.results || parsedPhotoData.apiData;
    const firstResult = Array.isArray(rawResults) ? rawResults[0] : rawResults;
    const areaResults = firstResult?.area_results;
    const fm3Results = firstResult?.fm3_results;

    if (!areaResults && !fm3Results) {
      return;
    }

    // Get all metrics related to the selected metric key
    let related = [];
    if (areaResults) {
      related = metricHelpers.getRelatedMetrics(areaResults, metricKey);
    } else if (fm3Results) {
      related = metricHelpers.extractFm3RelatedMetrics(fm3Results, metricKey);
    }

    console.log(`Found ${related.length} related metrics`);

    // Group metrics by facial region
    const grouped = metricHelpers.groupByRegion(related);
    setGroupedMetrics(grouped);
  }, [metricKey, photoData, parsedPhotoData]);

  // Separate useEffect to calculate display info when currentConcernDetails is available
  useEffect(() => {
    const rawResults = parsedPhotoData.results || parsedPhotoData.apiData;
    const firstResult = Array.isArray(rawResults) ? rawResults[0] : rawResults;
    const areaResults = firstResult?.area_results;
    const fm3Results = firstResult?.fm3_results;

    if (!areaResults && !fm3Results) {
      return;
    }

    // Get all metrics related to the selected metric key
    let related = [];
    if (areaResults) {
      related = metricHelpers.getRelatedMetrics(areaResults, metricKey);
    } else if (fm3Results) {
      related = metricHelpers.extractFm3RelatedMetrics(fm3Results, metricKey);
    }

    // Get primary metric for display info
    const primaryMetric = related.find(
      m =>
        m.area_name === 'face' ||
        m.area_name === 'Overall' ||
        m.tech_name?.includes(metricHelpers.getMatchPattern(metricKey)),
    );

    // Set display info based on metric type
    setMetricDisplayInfo(
      metricHelpers.getMetricDisplayInfo(
        metricKey,
        Number(metricValue),
        primaryMetric,
        currentConcernDetails,
      ),
    );
  }, [metricKey, metricValue, parsedPhotoData, currentConcernDetails]);

  // useEffect to fetch skin trend scores
  useEffect(() => {
    const fetchTrendScores = async () => {
      if (!metricKey) return;

      const skinConditionName = getSkinConditionNameForMetric(metricKey);
      if (!skinConditionName) {
        console.log(
          '⚠️ No skin condition mapping found for metric:',
          metricKey,
        );
        return;
      }

      setIsLoadingTrends(true);
      try {
        const conditionCandidates = getSkinConditionAliases(skinConditionName);
        let response: any = null;

        for (const candidate of conditionCandidates) {
          try {
            console.log('🔵 Fetching trend scores for:', candidate);
            response = (await getSkinTrendScores({
              skin_condition_name: candidate,
              sort_order: 'desc',
            })) as any;
            if (response?.success) break;
          } catch (err) {
            if (candidate === conditionCandidates[conditionCandidates.length - 1]) {
              throw err;
            }
          }
        }

        console.log('🔵 response of getSkinTrendScores:', response);

        if (response && response.success) {
          console.log('✅ Trend scores loaded:', response.data);
          setTrendScores(response.data);
        }
      } catch (error: any) {
        console.error('🔴 Error fetching trend scores:', error);
        setTrendScores(null);
      } finally {
        setIsLoadingTrends(false);
      }
    };

    fetchTrendScores();
  }, [metricKey]);

  // Auto-select last point and scroll to end when trendScores data is loaded (similar to Progress screen)
  useEffect(() => {
    if (
      !trendScores ||
      !Array.isArray(trendScores) ||
      trendScores.length === 0
    ) {
      return;
    }

    // Transform photos to get timestamps
    const transformedPhotos = trendScores.map((item: any) => ({
      id: item.skin_result_id || item.id || item.image_id,
      created_at: item.created_at,
      timestamp: item.created_at,
      metrics: {
        [metricKey]:
          metricKey === 'skinType'
            ? item.skin_condition_type || item.skinType || null
            : item.skin_condition_score || item.score || null,
      },
    }));

    const { timestamps, metrics } = processPhotoMetrics(transformedPhotos);
    const currentMetric = metrics.find(m => m.metricName === metricKey);

    if (
      !initialSelectionDoneRef.current &&
      timestamps &&
      timestamps.length > 0 &&
      currentMetric
    ) {
      const timer = setTimeout(() => {
        const lastIndex = timestamps.length - 1;
        if (lastIndex >= 0) {
          setSelectedIndex(lastIndex);

          // Calculate scroll position to scroll to end
          const barSlotWidth = 16;
          const plotAreaWidth = currentMetric.scores.length * barSlotWidth;
          const rightPadding = 120;
          const { width: screenWidth } = Dimensions.get('window');
          const totalContentWidth = plotAreaWidth + rightPadding;
          const maxScrollPosition = Math.max(
            0,
            totalContentWidth - screenWidth,
          );

          // Set scroll position and force sync
          setTimeout(() => {
            setScrollPosition(maxScrollPosition);
            forceScrollSyncRef.current = true;
            // Clear the force flag after a delay
            setTimeout(() => {
              forceScrollSyncRef.current = false;
            }, 500);
          }, 200);

          initialSelectionDoneRef.current = true;
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [trendScores, metricKey]);

  // Helper function to get smart context text using scoreLevels when available
  const getSmartContextText = (
    metricValue: string | number,
    metricKey: string,
    currentConcernDetails: ConcernDetail | null,
  ): string => {
    // Special handling for categorical metrics
    if (metricKey === 'skinType' || metricKey === 'skinTone') {
      if (currentConcernDetails) {
        // Try scoreLevels first (consistent with new structure)
        if (
          currentConcernDetails.scoreLevels &&
          (currentConcernDetails.scoreLevels as any)[metricValue]
        ) {
          return (currentConcernDetails.scoreLevels as any)[metricValue].text;
        }

        // Fallback to typeDescriptions for skinType
        if (
          metricKey === 'skinType' &&
          (currentConcernDetails as any).typeDescriptions &&
          (currentConcernDetails as any).typeDescriptions[metricValue]
        ) {
          return (currentConcernDetails as any).typeDescriptions[metricValue]
            .description;
        }

        // Fallback to toneDescriptions for skinTone
        if (
          metricKey === 'skinTone' &&
          (currentConcernDetails as any).toneDescriptions &&
          (currentConcernDetails as any).toneDescriptions[metricValue]
        ) {
          return (currentConcernDetails as any).toneDescriptions[metricValue]
            .description;
        }
      }
      return (
        currentConcernDetails?.contextText ||
        `Your skin is classified as ${metricValue}.`
      );
    }

    if (!Number.isFinite(Number(metricValue))) {
      return 'No measurement available for this metric.';
    }

    const numericValue = Number(metricValue);

    // Try to use scoreLevels for more specific context
    if (currentConcernDetails && currentConcernDetails.scoreLevels) {
      const scoreLevel = metricHelpers.getScoreLevelForValue(
        currentConcernDetails.scoreLevels,
        numericValue,
      );

      if (scoreLevel && scoreLevel.text) {
        return scoreLevel.text;
      }
    }

    // Fallback to generic template
    const level =
      numericValue >= 70 ? 'good' : numericValue >= 50 ? 'fair' : 'poor';
    return `Your ${formatMetricName(
      metricKey,
    ).toLowerCase()} score of ${numericValue} indicates ${level} skin health in this area.`;
  };

  // Helper function to get the level name and styling from scoreLevels
  const getScoreLevelInfo = (
    metricValue: string | number,
    currentConcernDetails: ConcernDetail | null,
  ): { levelName: string; color: string; bg: string } => {
    if (!currentConcernDetails || !currentConcernDetails.scoreLevels) {
      return { levelName: 'Unknown', color: '#666', bg: '#f5f5f5' };
    }

    // Check if it's a categorical value in scoreLevels
    if (
      typeof metricValue === 'string' &&
      (currentConcernDetails.scoreLevels as any)[metricValue]
    ) {
      const levelData = (currentConcernDetails.scoreLevels as any)[metricValue];
      let color = '#666',
        bg = '#f5f5f5';
      const lowerValue = metricValue.toLowerCase();

      // Assign colors based on common skin type/tone categories
      if (lowerValue.includes('normal') || lowerValue.includes('balanced')) {
        color = '#2e7d32';
        bg = '#e6f4ea';
      } else if (lowerValue.includes('oily') || lowerValue.includes('dry')) {
        color = '#f57c00';
        bg = '#fff8e1';
      } else if (
        lowerValue.includes('combination') ||
        lowerValue.includes('sensitive')
      ) {
        color = '#d84315';
        bg = '#ffebe9';
      }

      return {
        levelName: metricValue,
        color,
        bg,
      };
    }

    if (!Number.isFinite(Number(metricValue))) {
      // Fallback for non-numeric values that didn't match a category
      return { levelName: String(metricValue), color: '#666', bg: '#f5f5f5' };
    }

    const numericValue = Number(metricValue);

    // Find the level where value falls within min/max range
    for (const [levelName, levelData] of Object.entries(
      currentConcernDetails.scoreLevels,
    )) {
      if (
        numericValue >= (levelData.min ?? 0) &&
        numericValue <= (levelData.max ?? 100)
      ) {
        // Determine colors based on level name
        let color, bg;
        const lowerName = levelName.toLowerCase();
        if (lowerName.includes('excellent') || lowerName.includes('great')) {
          color = '#2e7d32';
          bg = '#e6f4ea'; // Green
        } else if (lowerName.includes('good')) {
          color = '#388e3c';
          bg = '#e8f5e8'; // Slightly different green
        } else if (
          lowerName.includes('average') ||
          lowerName.includes('fair')
        ) {
          color = '#f57c00';
          bg = '#fff8e1'; // Orange
        } else if (lowerName.includes('poor')) {
          color = '#d84315';
          bg = '#ffebe9'; // Red-orange
        } else if (lowerName.includes('bad')) {
          color = '#c62828';
          bg = '#fdecea'; // Red
        } else {
          // Default colors
          color = '#666';
          bg = '#f5f5f5';
        }

        return {
          levelName: levelName.charAt(0).toUpperCase() + levelName.slice(1), // Capitalize first letter
          color,
          bg,
        };
      }
    }

    // Fallback if no level found
    return { levelName: 'Unknown', color: '#666', bg: '#f5f5f5' };
  };

  if (!currentConcernDetails) {
    return <DetailSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <View style={styles.iconContainer}>
              <ChevronLeft size={30} color="#44403C" />
            </View>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>
              {getHeaderNameForMetric(metricKey)}
            </Text>
          </View>
          <View style={styles.rightContainer}>
            {!['skinType', 'skinTone', 'perceivedAge', 'eyeAge'].includes(
              metricKey,
            ) && (
                <TouchableOpacity
                  onPress={handleToggleTopConcern}
                  disabled={isTogglingConcern}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ padding: 8, opacity: isTogglingConcern ? 0.5 : 1 }}
                >
                  <Star
                    size={22}
                    color={isTopConcernDisplay ? '#00839B' : '#D6D3D1'}
                    fill={isTopConcernDisplay ? '#00839B' : 'transparent'}
                  />
                </TouchableOpacity>
              )}
          </View>
        </View>
        <View style={styles.shadowLine} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollContainer}>
        {/* <View style={{ marginHorizontal: 16 }}>

          <View style={styles.metricCard}>

            {currentConcernDetails?._isProfileMetric ? (
              <View style={{ width: '100%', marginBottom: 8 }}>
     
                <View style={{
                  width: '100%',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  marginBottom: 12,
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#222',
                    textAlign: 'center',
                  }}>
                    {metricValue}
                  </Text>
                </View>
       
                {metricKey === 'poresScore' && (
                  <Text style={{
                    fontSize: 10,
                    color: '#999',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    marginTop: 4,
                    marginBottom: 8,
                  }}>
                    Face a light source for best results
                  </Text>
                )}
                <Text style={{ fontSize: 14, lineHeight: 20, color: '#555' }}>
                  {(() => {

                    if (metricKey === 'perceivedAge' && currentConcernDetails?.ageGuidance) {
                      const actualAge = calculateActualAge(profile?.birth_date);
                      const perceivedAge = Number(metricValue);

                      if (!actualAge || !perceivedAge || isNaN(perceivedAge)) {
                        return 'Unable to compare ages. Please ensure your birth date is set in your profile.';
                      }

                      const ageDifference = perceivedAge - actualAge;
                      let guidanceText = currentConcernDetails.ageGuidance.matchesActual;

                      if (ageDifference < -2) {
                        guidanceText = currentConcernDetails.ageGuidance.youngerThanActual;
                      } else if (ageDifference > 2) {
                        guidanceText = currentConcernDetails.ageGuidance.olderThanActual;
                      }

                      return guidanceText;
                    }


                    if (metricKey === 'eyeAge' && currentConcernDetails?.ageGuidance) {
                      const actualAge = calculateActualAge(profile?.birth_date);
                      const perceivedAge = Number(metricValue);

                      if (!actualAge || !perceivedAge || isNaN(perceivedAge)) {
                        return 'Unable to compare ages. Please ensure your birth date is set in your profile.';
                      }

                      const ageDifference = perceivedAge - actualAge;
                      let guidanceText = currentConcernDetails.ageGuidance.matchesActual;

                      if (ageDifference < -2) {
                        guidanceText = currentConcernDetails.ageGuidance.youngerThanActual;
                      } else if (ageDifference > 2) {
                        guidanceText = currentConcernDetails.ageGuidance.olderThanActual;
                      }

                      return guidanceText;
                    }


                    if (metricKey === 'skinType' && currentConcernDetails?.typeDescriptions) {
                      const typeDesc = currentConcernDetails.scoreLevels?.[metricValue];
                      if (typeDesc && typeDesc.text) {
                        return typeDesc.text;
                      }
                    }


                    if (metricKey === 'skinTone' && currentConcernDetails?.toneDescriptions) {
                      const toneDesc = currentConcernDetails.toneDescriptions[metricValue as string];
                      if (toneDesc && toneDesc.description) {
                        return toneDesc.description;
                      }
                    }

                   
                    if (currentConcernDetails.scoreLevels) {

                      if (currentConcernDetails.metricType === 'category' && currentConcernDetails.scoreLevels[metricValue]) {
                        return currentConcernDetails.scoreLevels[metricValue].text;
                      }


                      const numericValue = Number(metricValue);
                      if (!isNaN(numericValue)) {
                        const scoreLevel = metricHelpers.getScoreLevelForValue(currentConcernDetails.scoreLevels, numericValue);
                        if (scoreLevel && scoreLevel.text) {
                          return scoreLevel.text;
                        }
                      }
                    }

         
                    if (currentConcernDetails.metricType === 'category' && currentConcernDetails.typeDescriptions) {

                      const typeDesc = currentConcernDetails.typeDescriptions[metricValue as string];
                      return typeDesc ? typeDesc.description : currentConcernDetails.contextText;
                    } else if (currentConcernDetails.metricType === 'age') {

                      return currentConcernDetails.contextText;
                    }
                    return currentConcernDetails.contextText;
                  })()}
                </Text>
              </View>
            ) : (

              <>

                {metricDisplayInfo.displayType === 'score' && metricDisplayInfo.isScore && (
                  <>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%', marginBottom: 8 }}>

                      <View style={{
                        width: '33%',
                        backgroundColor: metricBg,
                        borderRadius: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingVertical: 12,
                        marginRight: 12,
                      }}>
                        <Text style={{ fontSize: 18, fontWeight: '600', color: '#222', textAlign: 'center' }}>
                          {Number.isFinite(Number(metricValue)) ? Number(metricValue) : '--'}
                        </Text>
                      </View>
           
                      <View style={{ width: '67%', justifyContent: 'flex-start', paddingTop: 4 }}>
                        <Text style={{ fontSize: 14, lineHeight: 20, color: '#555' }}>
                          {getSmartContextText(metricValue, metricKey, currentConcernDetails)}
                        </Text>
                      </View>
                    </View>
                    {metricKey === 'poresScore' && (
                      <Text style={{
                        fontSize: 10,
                        color: '#999',
                        fontStyle: 'italic',
                        textAlign: 'center',
                        marginTop: 4,
                        marginBottom: 8,
                      }}>
                        Face a light source for best results
                      </Text>
                    )}
                  </>
                )}


                {(metricDisplayInfo.displayType === 'category' || metricDisplayInfo.displayType === 'age') && (
                  <View style={styles.iconTypeCardContent}>
                    <Text style={styles.iconTypeValueText}>
                      {metricDisplayInfo.valueDisplay}
                    </Text>
                    <Star size={48} color="gray" style={styles.placeholderIcon} />
                    <Text style={styles.metricDescription}>
                      {metricDisplayInfo.description}
                    </Text>
                  </View>
                )}


                {metricDisplayInfo.displayType === 'score' && !metricDisplayInfo.isScore && (
                  <View style={styles.iconTypeCardContent}>
                    <Text style={styles.iconTypeValueText}>
                      {metricDisplayInfo.valueDisplay}
                    </Text>

                    <Info size={48} color="gray" style={styles.placeholderIcon} />
                    <Text style={styles.metricDescription}>
                      {metricDisplayInfo.description}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View> */}

        {/* Mask Image Section */}
        {(() => {
          const conditionName = getConditionNameForMetric(metricKey);

          // Header with description only for age metrics and profile metrics - no image
          if (
            metricKey === 'eyeAge' ||
            metricKey === 'perceivedAge' ||
            metricKey === 'skinType' ||
            metricKey === 'skinTone'
          ) {
            const isCategorical =
              metricKey === 'skinType' || metricKey === 'skinTone';
            const actualAge = calculateActualAge(profile?.birth_date);
            const latestScore = isCategorical
              ? metricValue
              : Number(metricValue);

            // Resolve display value for categorical metrics (skinType/skinTone)
            const profileFieldKey =
              metricKey === 'skinTone' ? 'skinTone' : 'skinType';
            let displayValue: string | null = null;
            if (isCategorical) {
              const providedVal =
                typeof metricValue === 'string' && metricValue.trim()
                  ? metricValue.trim()
                  : null;
              let trendVal: string | null = null;
              if (Array.isArray(trendScores) && trendScores.length > 0) {
                const lastIdx = trendScores.length - 1;
                trendVal =
                  trendScores[lastIdx]?.skin_condition_type ||
                  trendScores[lastIdx]?.skinType ||
                  trendScores[lastIdx]?.type ||
                  null;
              }
              const parsedMetricsVal =
                parsedPhotoData?.metrics?.[profileFieldKey] || null;
              const profileVal = (profile as any)?.[profileFieldKey] || null;
              displayValue =
                providedVal || trendVal || parsedMetricsVal || profileVal;

              // Capitalize first letter for display
              if (displayValue && typeof displayValue === 'string') {
                displayValue =
                  displayValue.charAt(0).toUpperCase() +
                  displayValue.slice(1).toLowerCase();
              }
            }

            // Get color and level info
            const valueForLevel = isCategorical
              ? displayValue ?? '--'
              : metricValue;
            const scoreLevelInfo = getScoreLevelInfo(
              valueForLevel as any,
              currentConcernDetails,
            );
            const tagColor = isCategorical
              ? scoreLevelInfo.color
              : getAgeComparisonColor(Number(latestScore), actualAge);

            let changeArrow = '→';
            let changeAbs = 0;
            let showChange = !isCategorical;
            let chipDateLabel: string | null = null;
            if (Array.isArray(trendScores) && trendScores.length >= 1) {
              const lastIdx = trendScores.length - 1;
              chipDateLabel = getRelativeDayLabel(
                trendScores[lastIdx]?.created_at ||
                trendScores[lastIdx]?.timestamp,
              );
            }

            if (precomputedChange) {
              changeArrow = precomputedChange.arrow;
              changeAbs = precomputedChange.value;
            } else if (
              !isCategorical &&
              Array.isArray(trendScores) &&
              trendScores.length >= 2
            ) {
              const lastIdx = trendScores.length - 1;
              const s0 = Number(
                trendScores[lastIdx]?.skin_condition_score ??
                trendScores[lastIdx]?.score ??
                latestScore,
              );
              const s1 = Number(
                trendScores[lastIdx - 1]?.skin_condition_score ??
                trendScores[lastIdx - 1]?.score ??
                latestScore,
              );
              const diff = s0 - s1;
              changeAbs = Math.abs(Math.round(diff));
              changeArrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
            }

            // Determine if everything related to the image is loaded
            const backgroundImageUri = parsedPhotoData?.storageUrl;
            const hasBackgroundImage = !!backgroundImageUri;
            const baseImageReady =
              !hasBackgroundImage || !backgroundImageLoading;
            const everythingLoaded = baseImageReady;

            return (
              <View style={{ marginHorizontal: 16, marginTop: spacing.xxl }}>
                <View style={styles.metricCardRow}>
                  <View style={styles.maskImageContainer}>
                    <Image
                      source={{
                        uri: sanitizeS3Uri(backgroundImageUri) as string,
                      }}
                      style={[
                        styles.backgroundImage as any,
                        { opacity: everythingLoaded ? 1 : 0 },
                      ]}
                      resizeMode="cover"
                      onLoadEnd={() => setBackgroundImageLoading(false)}
                    />
                    {!everythingLoaded && (
                      <View style={styles.imageLoadingContainer}>
                        <SkeletonPlaceholder borderRadius={12}>
                          <SkeletonPlaceholder.Item width={250} height={250} />
                        </SkeletonPlaceholder>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.photoOverlayChip}
                      activeOpacity={0.7}
                      onPress={() => {
                        const photoDataWithMasks = {
                          ...parsedPhotoData,
                          maskImages: maskImages ?? parsedPhotoData?.maskImages,
                        };
                        (navigation as any).navigate('MaskViewer', {
                          photoData: JSON.stringify(photoDataWithMasks),
                          initialConditionName: conditionName,
                        });
                      }}
                    >
                      <Text style={styles.photoOverlayChipText}>
                        + Zoom / Masks
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.maskContentRight}>
                    <Text style={styles.smartContextText}>
                      {getSmartContextText(
                        metricValue,
                        metricKey,
                        currentConcernDetails,
                      )}
                    </Text>
                    <View style={styles.scoreRowContainer}>
                      <View
                        style={[
                          styles.combinedScoreChip,
                          { justifyContent: 'center' },
                        ]}
                      >
                        <View style={styles.scoreInfo}>
                          <View
                            style={[
                              styles.analysisDot,
                              { backgroundColor: tagColor },
                            ]}
                          />
                          <Text style={styles.scoreText}>
                            {isCategorical
                              ? displayValue ?? '--'
                              : metricValue
                                ? String(metricValue)
                                : '--'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          }

          // Check if we have mask images data - use fetched mask images
          let maskImageData = null;

          // First try to use fetched mask images – exact condition match only.
          if (maskImages && Array.isArray(maskImages)) {
            const conditionAliases = getSkinConditionAliases(conditionName);
            maskImageData =
              maskImages.find((image: any) =>
                conditionAliases.includes(image.skin_condition_name),
              ) ?? null;
          }

          // Fallback to photo data passed from snapshot screen
          if (!maskImageData) {
            if (parsedPhotoData?.maskImages && Array.isArray(parsedPhotoData.maskImages)) {
              const conditionAliases = getSkinConditionAliases(conditionName);
              maskImageData =
                parsedPhotoData.maskImages.find(
                  (image: any) =>
                    conditionAliases.includes(image.skin_condition_name),
                ) ?? null;
            } else if (parsedPhotoData?.maskResults && Array.isArray(parsedPhotoData.maskResults)) {
              const conditionAliases = getSkinConditionAliases(conditionName);
              maskImageData =
                parsedPhotoData.maskResults.find(
                  (result: any) =>
                    conditionAliases.includes(result.skin_condition_name),
                ) ?? null;
            }
          }

          // If mask image is unknown or missing, fallback so we don't display a broken image
          if (maskImageData && (maskImageData.mask_img_url === "Unknown" || !maskImageData.mask_img_url)) {
             maskImageData = {
               ...maskImageData,
               mask_img_url: null
             };
          }

          console.log('🔵 conditionName:', conditionName);
          console.log('🔵 maskImageData:', maskImageData);
          console.log('🔵 trendScores:', trendScores);

          // If no mask data, show the original photo instead
          if (
            conditionName &&
            (maskImageData?.mask_img_url || parsedPhotoData?.storageUrl)
          ) {
            const latestScore = Number(metricValue);
            const tagColor =
              latestScore >= 70
                ? '#22C55E'
                : latestScore < 50
                  ? '#EF4444'
                  : '#F59E0B';
            let changeArrow = '→';
            let changeAbs = 0;
            let chipDateLabel: string | null = null;
            if (Array.isArray(trendScores) && trendScores.length >= 1) {
              const lastIdx = trendScores.length - 1;
              chipDateLabel = getRelativeDayLabel(
                trendScores[lastIdx]?.created_at ||
                trendScores[lastIdx]?.timestamp,
              );
            }
            if (precomputedChange) {
              changeArrow = precomputedChange.arrow;
              changeAbs = precomputedChange.value;
            } else if (Array.isArray(trendScores) && trendScores.length >= 2) {
              const lastIdx = trendScores.length - 1;
              const s0 = Number(
                trendScores[lastIdx]?.skin_condition_score ??
                trendScores[lastIdx]?.score ??
                latestScore,
              );
              const s1 = Number(
                trendScores[lastIdx - 1]?.skin_condition_score ??
                trendScores[lastIdx - 1]?.score ??
                latestScore,
              );
              console.log('🔵 s0:', s0);
              console.log('🔵 s1:', s1);
              const diff = s0 - s1;
              changeAbs = Math.abs(Math.round(diff));
              changeArrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
            }

            console.log('🔵 latestScore:', latestScore);
            console.log('🔵 changeAbs:', changeAbs);
            console.log('🔵 changeArrow:', changeArrow);

            // Determine if everything related to the image is loaded
            const hasMaskOverlay = !!maskImageData?.mask_img_url;
            const backgroundImageUri =
              maskImageData?.image_url || parsedPhotoData?.storageUrl;
            const hasBackgroundImage = !!backgroundImageUri;

            // The content is "ready" only when:
            // 1. Data has been fetched from API (maskImagesLoading is false)
            // 2. IF there's a background image, it has finished loading (backgroundImageLoading is false)
            // 3. IF there's a mask overlay, it has finished loading (maskImageLoading is false)
            const baseImageReady =
              !hasBackgroundImage || !backgroundImageLoading;
            const maskOverlayReady = !hasMaskOverlay || !maskImageLoading;

            const everythingLoaded =
              !maskImagesLoading && baseImageReady && maskOverlayReady;

            console.log('mask_img_url', maskImageData?.mask_img_url)

            return (
              <View style={{ marginHorizontal: 16, marginTop: spacing.xxl }}>
                <View style={styles.metricCardRow}>
                  <View style={styles.maskImageContainer}>
                    <Image
                      source={{
                        uri: sanitizeS3Uri(backgroundImageUri) as string,
                      }}
                      style={[
                        styles.backgroundImage as any,
                        { opacity: everythingLoaded ? 1 : 0 },
                      ]}
                      resizeMode="cover"
                      onLoadEnd={() => setBackgroundImageLoading(false)}
                    />
                    {!everythingLoaded && (
                      <View style={styles.imageLoadingContainer}>
                        <SkeletonPlaceholder borderRadius={12}>
                          <SkeletonPlaceholder.Item width={250} height={250} />
                        </SkeletonPlaceholder>
                      </View>
                    )}
                    {hasMaskOverlay && (
                      <View
                        style={[
                          styles.svgOverlay,
                          { opacity: everythingLoaded ? 1 : 0 },
                        ]}
                      >
                        <ConditionalImage
                          source={
                            sanitizeS3Uri(maskImageData.mask_img_url) as string
                          }
                          style={styles.svgOverlay as any}
                          resizeMode="contain"
                          width="100%"
                          height="100%"
                          onLoad={() => setMaskImageLoading(false)}
                          onError={() => setMaskImageLoading(false)}
                        />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.photoOverlayChip}
                      activeOpacity={0.7}
                      onPress={() => {
                        const photoDataWithMasks = {
                          ...parsedPhotoData,
                          maskImages: maskImages ?? parsedPhotoData?.maskImages,
                        };
                        (navigation as any).navigate('MaskViewer', {
                          photoData: JSON.stringify(photoDataWithMasks),
                          initialConditionName: conditionName,
                        });
                      }}
                    >
                      <Text style={styles.photoOverlayChipText}>
                        + Zoom / Masks
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.maskContentRight}>
                    <Text style={styles.smartContextText}>
                      {getSmartContextText(
                        metricValue,
                        metricKey,
                        currentConcernDetails,
                      )}
                    </Text>
                    <View style={styles.scoreRowContainer}>
                      <View style={styles.combinedScoreChip}>
                        <View style={styles.changeInfo}>
                          {isLoadingTrends || !chipDateLabel ? (
                            <SkeletonPlaceholder borderRadius={8}>
                              <SkeletonPlaceholder.Item
                                width={25}
                                height={15}
                              />
                            </SkeletonPlaceholder>
                          ) : (
                            // <Text style={styles.changeText}>{`${changeArrow}${changeAbs} ${chipDateLabel}`}</Text>
                            <Text
                              style={styles.changeText}
                            >{`${changeArrow}${changeAbs}`}</Text>
                          )}
                        </View>
                        <View style={styles.scoreInfo}>
                          <View
                            style={[
                              styles.analysisDot,
                              { backgroundColor: tagColor },
                            ]}
                          />
                          <Text style={styles.scoreText}>
                            {Number.isFinite(Number(metricValue))
                              ? Number(metricValue)
                              : '--'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          }
          // While mask images are being fetched from API, show a skeleton card
          if (maskImagesLoading) {
            return (
              <View style={{ marginHorizontal: 16, marginTop: spacing.xxl }}>
                <SkeletonPlaceholder borderRadius={12}>
                  <SkeletonPlaceholder.Item
                    flexDirection="column"
                    alignItems="center"
                  >
                    <SkeletonPlaceholder.Item
                      width={250}
                      height={250}
                      borderRadius={12}
                      marginBottom={16}
                    />
                    <SkeletonPlaceholder.Item width="100%" alignItems="center">
                      <SkeletonPlaceholder.Item
                        width="80%"
                        height={14}
                        borderRadius={4}
                        marginBottom={8}
                      />
                      <SkeletonPlaceholder.Item
                        width="90%"
                        height={14}
                        borderRadius={4}
                        marginBottom={8}
                      />
                      <SkeletonPlaceholder.Item
                        width="60%"
                        height={14}
                        borderRadius={4}
                        marginBottom={16}
                      />
                      <SkeletonPlaceholder.Item
                        width={90}
                        height={32}
                        borderRadius={16}
                      />
                    </SkeletonPlaceholder.Item>
                  </SkeletonPlaceholder.Item>
                </SkeletonPlaceholder>
              </View>
            );
          }

          return null;
        })()}

        {/* Content Section: Overview or Age Guidance */}
        {/* <View style={styles.contentSectionContainer}>

          <>
            <Text style={styles.contentSectionTitle}>Overview</Text>
            <Text style={styles.contentSectionText}>
              {currentConcernDetails ? currentConcernDetails.overview : 'Loading overview...'}
            </Text>
          </>

        </View> */}

        {/* Skin Type Details Section */}
        {/* {metricKey === 'skinType' && currentConcernDetails?.typeDescriptions && (
          <View style={styles.contentSectionContainer}>
            <Text style={styles.contentSectionTitle}>Skin Type Details</Text>
            <View style={styles.descriptionCard}>
              {currentConcernDetails?.typeDescriptions[metricValue] && (
                <>
                  <View style={styles.descriptionHeader}>
                    <View style={styles.descriptionIconContainer}>
                      <Droplets size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.descriptionTitle}>{metricValue}</Text>
                  </View>
                  <Text style={styles.descriptionText}>
                    {currentConcernDetails?.typeDescriptions[metricValue]?.description}
                  </Text>
                  {currentConcernDetails?.typeDescriptions[metricValue]?.characteristics && (
                    <View style={styles.characteristicsContainer}>
                      <Text style={styles.characteristicsTitle}>Key Characteristics:</Text>
                      {Array.isArray(currentConcernDetails?.typeDescriptions[metricValue as string]?.characteristics) ? (
                        (currentConcernDetails!.typeDescriptions[metricValue as string].characteristics as unknown as string[]).map((char: string, index: number) => (
                          <View key={index} style={styles.characteristicItem}>
                            <View style={styles.characteristicBullet} />
                            <Text style={styles.characteristicText}>{char}</Text>
                          </View>
                        ))
                      ) : (
                        <View style={styles.characteristicItem}>
                          <View style={styles.characteristicBullet} />
                          <Text style={styles.characteristicText}>
                            {currentConcernDetails?.typeDescriptions[metricValue as string]?.characteristics as string}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {currentConcernDetails?.typeDescriptions[metricValue]?.careApproach && (
                    <View style={styles.careApproachContainer}>
                      <Text style={styles.careApproachTitle}>Care Approach:</Text>
                      <Text style={styles.careApproachText}>
                        {currentConcernDetails.typeDescriptions[metricValue].careApproach}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
          )}

        {/* Advice Details Section */}
        {(() => {
          const patienceNote = currentConcernDetails?.advice?.Behavior?.find(
            (b: string) =>
              b.toLowerCase().includes('patient') ||
              b.toLowerCase().includes('patience') ||
              b.toLowerCase().includes('consistency matters'),
          );

          const ingredients = getIngredientsForMetric(metricKey);
          const hasIngredients =
            ingredients.length > 0 ||
            (currentConcernDetails?.advice?.ingredients &&
              currentConcernDetails.advice.ingredients.length > 0);

          return (
            <>
              {/* Ingredients */}
              {hasIngredients && (
                <View style={styles.adviceItem}>
                  <View style={styles.ingredientCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderRow}>
                        {/* <SoapDispenserDroplet size={20} color="#414651" /> */}
                        <Text style={styles.cardHeaderTitle}>
                          Helpful Ingredients
                        </Text>
                      </View>
                      <Text style={styles.cardHeaderSubtitle}>
                        Dermatologists recommend at least one of the following
                        ingredients for your concerns
                      </Text>
                    </View>

                    {concernMessageLoading ? (
                      // Skeleton rows while routine-match API loads
                      <SkeletonPlaceholder borderRadius={8}>
                        <SkeletonPlaceholder.Item>
                          {[0, 1, 2].map(i => (
                            <SkeletonPlaceholder.Item
                              key={i}
                              flexDirection="row"
                              alignItems="center"
                              paddingVertical={14}
                              paddingHorizontal={4}
                              marginBottom={i < 2 ? 0 : 0}
                            >
                              <SkeletonPlaceholder.Item
                                width={36}
                                height={36}
                                borderRadius={18}
                                marginRight={12}
                              />
                              <SkeletonPlaceholder.Item flex={1}>
                                <SkeletonPlaceholder.Item
                                  width="50%"
                                  height={14}
                                  borderRadius={4}
                                  marginBottom={6}
                                />
                                <SkeletonPlaceholder.Item
                                  width="35%"
                                  height={12}
                                  borderRadius={4}
                                />
                              </SkeletonPlaceholder.Item>
                            </SkeletonPlaceholder.Item>
                          ))}
                        </SkeletonPlaceholder.Item>
                      </SkeletonPlaceholder>
                    ) : (
                      (() => {
                        const ingredients = getIngredientsForMetric(metricKey);
                        const displayIngredients =
                          ingredients.length > 0
                            ? ingredients
                            : currentConcernDetails.advice?.ingredients || [];

                        return displayIngredients.map(
                          (ingredient: string, index: number) => {
                            // Parse ingredient to get name and description
                            const colonIndex = ingredient.indexOf(':');
                            const ingredientName =
                              colonIndex > 0
                                ? ingredient.substring(0, colonIndex).trim()
                                : ingredient.trim();
                            const ingredientDesc =
                              colonIndex > 0
                                ? ingredient.substring(colonIndex + 1).trim()
                                : '';

                            // Find entry in found_ingredients
                            const foundEntry =
                              concernMessageData?.found_ingredients?.find(
                                found => {
                                  if (typeof found === 'string') {
                                    return (
                                      found.toLowerCase().trim() ===
                                      ingredientName.toLowerCase().trim()
                                    );
                                  }
                                  return (
                                    found?.ingredient?.toLowerCase().trim() ===
                                    ingredientName.toLowerCase().trim()
                                  );
                                },
                              );
                            const isFound = Boolean(foundEntry);
                            const foundProducts =
                              foundEntry &&
                                typeof foundEntry !== 'string' &&
                                Array.isArray(foundEntry.products)
                                ? foundEntry.products
                                : [];

                            const isLast =
                              index === (displayIngredients.length || 0) - 1;

                            return (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.ingredientRow,
                                  !isLast && styles.ingredientRowBorder,
                                ]}
                                activeOpacity={0.7}
                                onPress={() => {
                                  const message = `Tell me more about ${ingredientName.toLowerCase()} and how it can help my skin.`;
                                  (navigation as any).navigate('ThreadChat', {
                                    chatType: 'ingredients_related_chat',
                                    initialMessage: message,
                                    draftMessage: message,
                                    hideInitial: true,
                                    imageId:
                                      parsedPhotoData?.id ||
                                      parsedPhotoData?.imageId,
                                  });
                                }}
                              >
                                <View style={styles.ingredientIconContainer}>
                                  <SoapDispenserDroplet
                                    size={28}
                                    color={isFound ? '#414651' : '#D6D3D1'}
                                    strokeWidth={1.5}
                                  />
                                </View>
                                <View style={styles.ingredientContent}>
                                  <Text style={styles.ingredientName}>
                                    {ingredientName}
                                  </Text>

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

                                  {isFound && foundProducts.length > 0 ? (
                                    <Text style={styles.productHighlight}>
                                      {foundProducts.join(', ')}
                                    </Text>
                                  ) : ingredientDesc ? (
                                    <Text style={styles.ingredientDesc}>
                                      {ingredientDesc}
                                    </Text>
                                  ) : null}
                                </View>
                                <ChevronRight size={18} color="#D6D3D1" />
                              </TouchableOpacity>
                            );
                          },
                        );
                      })()
                    )}
                  </View>

                  {/* {concernMessageLoading ? (
                    // Skeleton for Amber's Insight card while API loads
                    <SkeletonPlaceholder borderRadius={12}>
                      <SkeletonPlaceholder.Item
                        flexDirection="row"
                        alignItems="center"
                        padding={16}
                      >
                        <SkeletonPlaceholder.Item
                          width={44}
                          height={44}
                          borderRadius={22}
                          marginRight={12}
                        />
                        <SkeletonPlaceholder.Item flex={1}>
                          <SkeletonPlaceholder.Item
                            width="40%"
                            height={14}
                            borderRadius={4}
                            marginBottom={8}
                          />
                          <SkeletonPlaceholder.Item
                            width="90%"
                            height={12}
                            borderRadius={4}
                            marginBottom={4}
                          />
                          <SkeletonPlaceholder.Item
                            width="70%"
                            height={12}
                            borderRadius={4}
                          />
                        </SkeletonPlaceholder.Item>
                      </SkeletonPlaceholder.Item>
                    </SkeletonPlaceholder>
                  ) : concernMessageData?.message ? (
                    <TouchableOpacity
                      style={styles.aiInsightCard}
                      onPress={() => {

                        (navigation as any).navigate('ThreadChat', {
                          chatType: 'ingredients_related_chat',
                          draftMessage: concernMessageData.message,
                          imageId: parsedPhotoData?.imageId
                        });

                        console.log("parsedPhotoData", parsedPhotoData)
                      }}
                    >
                      <View style={styles.aiAvatarContainer}>
                        <Image
                          source={require('../assets/images/amber-avatar-new.png')}
                          style={styles.aiAvatarIcon as ImageStyle}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.aiInsightContent}>
                        <Text style={styles.aiInsightTitle}>Amber's Insight</Text>
                        <Text style={styles.aiInsightSubtext}>
                          {concernMessageData.message}
                        </Text>
                      </View>
                      <View style={{ paddingTop: 2 }}>
                        <ChevronRight size={20} color="#9CA3AF" />
                      </View>
                    </TouchableOpacity>
                  ) : null} */}
                </View>
              )}
            </>
          );
        })()}

        <View style={[styles.ingredientCard, { marginHorizontal: 20 }]}>
          <Text style={styles.cardHeaderTitle}>
            About {getHeaderNameForMetric(metricKey)}
          </Text>
          <Text
            style={[
              styles.cardHeaderSubtitle,
              { marginTop: spacing.sm, marginBottom: spacing.md },
            ]}
          >
            {currentConcernDetails
              ? currentConcernDetails.overview
              : 'Loading overview...'}
          </Text>

          {lifestyleTips.length > 0 && (
            <View style={styles.lifestyleTipsSection}>
              <Text style={styles.lifestyleTipsTitle}>Lifestyle Tips</Text>
              {lifestyleTips.map((tip: string, index: number) => (
                <View key={`lifestyle-tip-${index}`} style={styles.lifestyleTipRow}>
                  <Text style={styles.lifestyleTipBullet}>•</Text>
                  <Text style={styles.lifestyleTipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Patience Note Box */}
          {(() => {
            const patienceNote = currentConcernDetails?.advice?.Behavior?.find(
              (b: string) =>
                b.toLowerCase().includes('patient') ||
                b.toLowerCase().includes('patience') ||
                b.toLowerCase().includes('consistency matters'),
            );

            if (!patienceNote) return null;

            return (
              <View style={styles.patienceBox}>
                <View style={styles.patienceIconContainer}>
                  <Info size={18} color="#5D6B98" />
                </View>
                <Text style={styles.patienceText}>{patienceNote}</Text>
              </View>
            );
          })()}

          {/* Medical Disclaimer Box */}
          {currentConcernDetails?.advice?.disclaimer && (
            <View style={styles.medicalBox}>
              <View style={styles.medicalIconContainer}>
                <ShieldPlus size={18} color="#5D6B98" />
              </View>
              <Text style={styles.medicalText}>
                {currentConcernDetails.advice.disclaimer}
              </Text>
            </View>
          )}
        </View>

        {/* Space at bottom for better scrolling */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Floating Tooltip */}
      {/* <FloatingTooltip
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
        content={tooltip.content}
      /> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  // header: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   paddingHorizontal: 16,
  //   paddingVertical: 12,
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#eee',
  // },
  // headerLeft: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  // },
  // backButton: {
  //   paddingRight: 10,
  //   paddingVertical: 4,
  // },
  // headerTitle: {
  //   fontSize: 18,
  //   fontWeight: '600',
  //   color: '#000',
  // },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: 105,
    backgroundColor: colors.background,
    borderBottomWidth: 0.4,
    justifyContent: 'flex-end',
    borderBottomColor: '#E5E5E5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
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
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rightContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadowLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trackButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  metricCard: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: 12,
    color: '#111', // Standardized color
  },
  tagContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  metricDescription: {
    fontSize: 16,
    color: '#555',
    marginTop: 8, // Added margin for spacing
    textAlign: 'center', // Center description for icon types
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  progressHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 16,
  },
  progressLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  progressLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 0,
    color: '#333',
  },
  placeholderText: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  learnMoreButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  learnMoreText: {
    color: '#6E46FF',
    fontWeight: '500',
  },
  placeholderChart: {
    height: 200,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  metricDetailItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  metricDetailName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  metricDetailValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '600',
  },
  subMetricsContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subMetricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  subMetricName: {
    fontSize: 14,
    color: '#555',
  },
  subMetricValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  regionContainer: {
    marginBottom: 20,
  },
  regionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  // Score bar styles
  scoreBarContainer: {
    marginTop: 16,
  },
  scoreBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scoreBarLabelBad: {
    fontSize: 12,
    color: '#999',
  },
  scoreBarLabelGood: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },

  // Distribution bar styles
  distributionContainer: {
    marginTop: 16,
  },
  distributionBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  distributionSegment: {
    height: '100%',
  },
  distributionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distributionLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  distributionLabelSelected: {
    color: '#6E46FF',
    fontWeight: '500',
  },

  // Simple advice styles
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  disclaimerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  disclaimerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1565c0',
    fontWeight: '500',
    flex: 1,
  },
  adviceItem: {
    // marginBottom: 16,
    marginHorizontal: 10,
    padding: 12,
    borderRadius: 8,
  },
  adviceLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  adviceText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  adviceListItem: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  adviceListItemText: {
    fontSize: 14,
    // lineHeight: 10,
    color: '#555',
    paddingRight: 6,
    marginBottom: 6,
  },

  // Numeric value styles
  numericContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  numericValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  numericUnit: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },

  // Timeline chart styles
  timelineContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  timelineBackground: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
    backgroundColor: '#f5f5f5',
  },
  timelineBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 8,
  },
  timelineBarColumn: {
    alignItems: 'center',
  },
  timelineBar: {
    width: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  timelineDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  timelinePlaceholder: {
    textAlign: 'center',
    marginTop: 16,
    color: '#777',
    fontStyle: 'italic',
  },
  timelineLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  timelineLegendText: {
    fontSize: 12,
    color: '#777',
  },
  timelineButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineButtonText: {
    fontSize: 12,
    color: '#6E46FF',
    marginRight: 4,
  },
  categoryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  // Styles for Icon/Category/Age type card
  iconTypeCardContent: {
    alignItems: 'center', // Center content for icon display
    paddingVertical: 10,
  },
  iconTypeValueText: {
    fontSize: 32, // Prominent value display
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
  },
  placeholderIcon: {
    marginVertical: 10,
  },
  trendPlaceholderContainer: {
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 10, // Adjusted padding if component has its own vertical padding
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  trendPlaceholderText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingVertical: 20, // Add some padding if only text is shown
  },
  contentSectionContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 0,
    marginTop: 16,
    // backgroundColor: '#fff',
    borderRadius: 8,
  },
  contentSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  contentSectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  microcopyText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#777',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  recommendationList: {
    marginTop: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center', // Vertically align items in the center
    justifyContent: 'space-between', // Push caret to the right
    marginBottom: 12,
    paddingVertical: 12, // Increased padding for better touch area
    paddingHorizontal: 8, // Added horizontal padding
    backgroundColor: '#f9f9f9', // Slight background for item
    borderRadius: 6,
  },
  recommendationItemContent: {
    // Wrapper for icon and text
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1, // Allow this part to take up available space
  },
  recommendationIcon: {
    marginRight: 12,
    marginTop: 2, // Align icon slightly better with multi-line text
  },
  recommendationText: {
    flex: 1, // Allow text to wrap
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  actionIcon: {
    marginRight: 10,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
  },
  ratingChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'center',
  },
  ratingChipText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileMetricContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  profileValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
  },
  profileIcon: {
    marginBottom: 12,
  },
  profileDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
    textAlign: 'center',
  },
  metricCardRow: {
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 4,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 16,
  },
  maskContentRight: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F4',
    borderRadius: 12,
    padding: 16,
  },
  smartContextText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#57534E',
    lineHeight: 22,
    marginBottom: 12,
  },
  scoreRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  combinedScoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7E5E4',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    // width: "100%",
    gap: 6,
    // justifyContent: "space-between",
  },
  changeInfo: {
    // paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changeText: {
    fontSize: 13,
    color: '#57534E',
    fontWeight: '500',
  },
  scoreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    // marginLeft: 4,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#364152',
    marginLeft: 6,
  },
  // Mask image styles
  maskImageContainer: {
    alignItems: 'center',
    position: 'relative',
    height: 250,
    width: 250,
    borderRadius: 12,
    overflow: 'hidden',
  },
  maskImage: {
    width: 450,
    height: 450,
    borderRadius: 12,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 250,
    height: 250,
    borderRadius: 12,
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
  maskImageDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    textAlign: 'center',
  },
  maskImageNote: {
    fontSize: 12,
    color: '#777',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  photoOverlayChip: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 20,
    opacity: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoOverlayChipText: {
    color: '#44403C',
    fontSize: 12,
    fontWeight: '600',
  },
  changeChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  changeChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  scoreChip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  analysisDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scoreChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#364152',
    minWidth: 24,
    textAlign: 'right',
  },
  // Trend scores styles
  trendScoresContainer: {
    marginTop: 12,
  },
  trendScoreItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  trendScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendScoreDate: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  // New Disclaimer and Patience Box Styles
  patienceBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF1F5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  patienceIconContainer: {
    marginRight: 10,
    marginTop: 2,
  },
  patienceText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#57534E',
    fontWeight: '400',
  },
  medicalBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF1F5',
    padding: 12,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  medicalIconContainer: {
    marginRight: 10,
    marginTop: 2,
  },
  medicalText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#57534E',
    fontWeight: '400',
  },
  lifestyleTipsSection: {
    marginBottom: 12,
  },
  lifestyleTipsTitle: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: '#44403C',
    marginBottom: 8,
  },
  lifestyleTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lifestyleTipBullet: {
    width: 14,
    fontSize: 14,
    lineHeight: 20,
    color: '#57534E',
  },
  lifestyleTipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#57534E',
    fontWeight: '400',
  },
  trendScoreValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  trendScoreBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trendScoreBarFill: {
    height: '100%',
    backgroundColor: '#6E46FF',
    borderRadius: 3,
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  maskLoadingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskLoadingText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 12,
  },
  maskImagesLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
  },
  maskImagesLoadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  // Chart styles for perceived age
  plotArea: {
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  // Age Guidance styles
  ageGuidanceContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  ageGuidanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  ageGuidanceContent: {
    alignItems: 'center',
  },
  ageComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  ageComparisonItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    minWidth: 60,
  },
  ageComparisonLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  ageComparisonValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  ageComparisonDivider: {
    marginHorizontal: 8,
    paddingVertical: 4,
  },
  guidanceTextContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    width: '100%',
  },
  guidanceText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    justifyContent: 'space-between',
  },
  yAxisGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  yAxisLabelsContainer: {
    position: 'absolute',
    left: -30,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  yAxisLabelsContainerFixed: {
    width: 35,
    paddingRight: 5,
    position: 'relative',
    alignItems: 'flex-end',
  },
  yAxisLabel: {
    fontSize: 10,
    // padding:10,
    color: '#999',
    fontWeight: '500',
    // textAlign: 'right',
  },
  nullBarContainer: {
    position: 'absolute',
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -8 }, { translateY: -8 }],
  },
  nullBar: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#dddddd',
  },
  bar: {
    width: 10,
    height: 2,
    borderRadius: 5,
    backgroundColor: '#333',
    opacity: 0.7,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  barCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  adviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  adviceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  floatingYAxis: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  adviceCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
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
  adviceCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  emptyIconPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  adviceCardText: {
    flex: 1,
    paddingRight: 8,
  },
  adviceCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  ingredientStatusText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontStyle: 'italic',
  },
  adviceCardSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },

  // Description card styles for skin type and tone
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 8,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  descriptionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
    marginBottom: 20,
    // textAlign: 'justify',
  },
  characteristicsContainer: {
    backgroundColor: '#fafbfc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  characteristicsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  characteristicItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  characteristicBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
    marginRight: 12,
    flexShrink: 0,
  },
  characteristicText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
    flex: 1,
  },

  // Care Approach styles for skin type
  careApproachContainer: {
    backgroundColor: '#fff8f0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffe4b3',
    marginTop: 16,
  },
  careApproachTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d97706',
    marginBottom: 8,
  },
  careApproachText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#92400e',
    textAlign: 'justify',
  },
  // AI Insight Card (Snapshot Style)
  aiInsightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBE9FE',
    borderRadius: 18,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  aiAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // justifyContent: 'center',
    // alignItems: 'center',
    // marginBottom: 8,
    marginRight: 12,
  },
  aiAvatarIcon: {
    width: 40,
    height: 40,
  },
  aiInsightContent: {
    // width: '100%',
    // alignItems: 'center',
    flex: 1,
    flexShrink: 1,
  },
  aiInsightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#404968',
    marginBottom: 4,
    // textAlign: 'center',
  },
  aiInsightSubtext: {
    fontSize: 14,
    color: '#5D6B98',
    lineHeight: 20,
    // textAlign: 'center',
  },

  // Ingredient Card (Routine Style)
  ingredientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
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
    color: '#44403C',
  },
  cardHeaderSubtitle: {
    fontSize: 13,
    color: '#4B5565',
    marginTop: 2,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    lineHeight: 18,
  },
  routineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#E9EAEB',
    alignSelf: 'flex-start',
    marginVertical: 6,
  },
  routineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  routineText: {
    fontSize: 12,
    color: '#57534E',
    fontWeight: '500',
  },
  productHighlight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1917',
    marginTop: 2,
  },

  // Considerations styles for skin tone
  considerationsContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginTop: 16,
  },
  considerationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  considerationsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0c4a6e',
    textAlign: 'justify',
  },

  // Mask verbiage styles
  maskVerbiageContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  maskVerbiageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    width: '100%',
  },
  maskVerbiageBullet: {
    width: 7,
    height: 7,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 10,
    marginTop: 8,
    flexShrink: 0,
  },
  maskVerbiageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    textAlign: 'left',
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
  },

  // Skin Type Chart styles
  skinTypeChartContainer: {
    // backgroundColor: '#F8F8F8',
    borderRadius: 12,
    // padding: 8,
    position: 'relative',
  },
  skinTypeLegend: {
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  skinTypeLegendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
