// maskViewer.tsx
// Mask viewer screen with enhanced zoom and pan functionality

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { X, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  useDerivedValue,
  interpolateColor
} from 'react-native-reanimated';
// import {
//   PinchGestureHandler,
//   PanGestureHandler,
//   TapGestureHandler,
//   GestureHandlerRootView
// } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConditionalImage } from '../utils/imageUtils';

// Import the concerns data
import concernsData from '../data/concerns.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 40;
const TAB_HEIGHT = 50;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

// App colors (from auth screens)
const colors = {
  primary: '#8B7355',
  background: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  error: '#FF6B6B',
};

// Enhanced spring config for smooth animations
const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

interface MaskViewerParams {
  photoData?: any;
}

interface MaskOption {
  skin_condition_name: string;
  mask_img_url: string;
  displayName: string;
  image_url?: string;
}

// Sanitize S3 URI function
const sanitizeS3Uri = (uriString: string): string => {
  if (!uriString) return uriString;
  return uriString.replace(/\+/g, '%2B').replace(/ /g, '%20');
};

// Helper function to format mask condition names for display
const formatConditionName = (conditionName: string): string => {
  if (!conditionName) return 'Original';
  
  const nameMap: { [key: string]: string } = {
    'none': 'Original',
    'redness': 'Redness',
    'hydration': 'Dewiness', 
    'eye_bags': 'Eye Area Condition',
    'pores': 'Visible Pores',
    'acne': 'Breakouts',
    'lines': 'Lines',
    'translucency': 'Translucency',
    'pigmentation': 'Pigmentation',
    'uniformness': 'Evenness'
  };
  
  return nameMap[conditionName] || conditionName.charAt(0).toUpperCase() + conditionName.slice(1);
};

// Enhanced zoomable mask image component
const ZoomableMaskImage = ({ 
  photoUri, 
  maskUri, 
  conditionName, 
  isActive 
}: { 
  photoUri: string; 
  maskUri: string; 
  conditionName: string; 
  isActive: boolean; 
}): React.JSX.Element => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [maskLoaded, setMaskLoaded] = useState<boolean>(true);

  // const pinchRef = useRef<PinchGestureHandler>(null);
  // const panRef = useRef<PanGestureHandler>(null);
  // const doubleTapRef = useRef<TapGestureHandler>(null);

  // Reset zoom when switching images
  useEffect(() => {
    if (!isActive) {
      scale.value = withSpring(1, springConfig);
      translateX.value = withSpring(0, springConfig);
      translateY.value = withSpring(0, springConfig);
    }
  }, [isActive]);

  // Pinch gesture handler
  // const pinchGestureHandler = useAnimatedGestureHandler({
  //   onStart: (_, context: any) => {
  //     context.startScale = scale.value;
  //   },
  //   onActive: (event: any, context: any) => {
  //     const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, context.startScale * event.scale));
  //     scale.value = newScale;
  //   },
  //   onEnd: () => {
  //     if (scale.value < MIN_SCALE) {
  //       scale.value = withSpring(MIN_SCALE, springConfig);
  //       translateX.value = withSpring(0, springConfig);
  //       translateY.value = withSpring(0, springConfig);
  //     } else if (scale.value > MAX_SCALE) {
  //       scale.value = withSpring(MAX_SCALE, springConfig);
  //     }
  //   },
  // });

  // Pan gesture handler
  // const panGestureHandler = useAnimatedGestureHandler({
  //   onStart: (_, context: any) => {
  //     context.startX = translateX.value;
  //     context.startY = translateY.value;
  //   },
  //   onActive: (event: any, context: any) => {
  //     if (scale.value > 1) {
  //       const maxTranslate = (scale.value - 1) * (IMAGE_SIZE / 2);
  //       translateX.value = Math.max(-maxTranslate, Math.min(maxTranslate, context.startX + event.translationX));
  //       translateY.value = Math.max(-maxTranslate, Math.min(maxTranslate, context.startY + event.translationY));
  //     }
  //   },
  //   onEnd: () => {
  //     if (scale.value <= 1) {
  //       translateX.value = withSpring(0, springConfig);
  //       translateY.value = withSpring(0, springConfig);
  //     }
  //   },
  // });

  // Double tap to zoom
  // const doubleTapGestureHandler = useAnimatedGestureHandler({
  //   onActive: () => {
  //     if (scale.value > 1) {
  //       scale.value = withSpring(1, springConfig);
  //       translateX.value = withSpring(0, springConfig);
  //       translateY.value = withSpring(0, springConfig);
  //     } else {
  //       scale.value = withSpring(2, springConfig);
  //     }
  //   },
  // });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const resetZoom = (): void => {
    scale.value = withSpring(1, springConfig);
    translateX.value = withSpring(0, springConfig);
    translateY.value = withSpring(0, springConfig);
  };

  const isLoading = !imageLoaded || !maskLoaded;

  return (
    <View style={styles.maskImageContainer}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      
      {/* <GestureHandlerRootView style={styles.gestureContainer}>
        <PanGestureHandler
          ref={panRef}
          onGestureEvent={panGestureHandler}
          simultaneousHandlers={[pinchRef]}
          minPointers={1}
          maxPointers={1}
          avgTouches
        > */}
          <Animated.View style={styles.gestureWrapper}>
            {/* <PinchGestureHandler
              ref={pinchRef}
              onGestureEvent={pinchGestureHandler}
              simultaneousHandlers={[panRef]}
            > */}
              <Animated.View style={styles.gestureWrapper}>
                {/* <TapGestureHandler
                  ref={doubleTapRef}
                  onGestureEvent={doubleTapGestureHandler}
                  numberOfTaps={2}
                > */}
                  <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                    {/* Check if maskUri is SVG or regular image */}
                    {maskUri && maskUri.toLowerCase().includes('.svg') ? (
                      // For SVG masks, show background image with mask overlay
                      <>
                        <Image
                          source={{ uri: sanitizeS3Uri(photoUri) }}
                          style={styles.backgroundImage}
                          resizeMode="cover"
                          onError={(error) => {
                            console.log('🔴 Error loading background image:', error.nativeEvent.error);
                          }}
                          onLoad={() => {
                            console.log('✅ Background image loaded successfully');
                            setImageLoaded(true)
                          }}
                        />
                        
                        <ConditionalImage
                          source={{ uri: sanitizeS3Uri(maskUri) }}
                          style={styles.maskOverlay}
                          resizeMode="cover"
                          onLoad={() => setMaskLoaded(true)}
                        />
                      </>
                    ) : maskUri ? (
                      // For non-SVG masks, show only the mask image
                      <Image
                        source={{ uri: sanitizeS3Uri(maskUri) }}
                        style={styles.backgroundImage}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('🔴 Error loading mask image:', error.nativeEvent.error);
                        }}
                        onLoad={() => {
                          console.log('✅ Mask image loaded successfully');
                          setImageLoaded(true)
                        }}
                      />
                    ) : (
                      // For original (no mask), show background image
                      <Image
                        source={{ uri: sanitizeS3Uri(photoUri) }}
                        style={styles.backgroundImage}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('🔴 Error loading background image:', error.nativeEvent.error);
                        }}
                        onLoad={() => {
                          console.log('✅ Background image loaded successfully');
                          setImageLoaded(true)
                        }}
                      />
                    )}
                  </Animated.View>
                {/* </TapGestureHandler> */}
              </Animated.View>
            {/* </PinchGestureHandler> */}
          </Animated.View>
      {/* //   </PanGestureHandler> */}
      {/* // </GestureHandlerRootView> */}
    </View>
  );
};

const MaskViewerScreen = (): React.JSX.Element => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as MaskViewerParams || {};

  console.log('🔵 params:', params);
  
  const parsedPhotoData = typeof params.photoData === 'string' 
    ? JSON.parse(params.photoData) 
    : params.photoData;

  console.log('🔵 parsedPhotoData:', parsedPhotoData);
  console.log('🔵 parsedPhotoData.maskImages:', parsedPhotoData?.maskImages);
  console.log('🔵 parsedPhotoData.maskImages type:', typeof parsedPhotoData?.maskImages);
  console.log('🔵 parsedPhotoData.maskImages length:', parsedPhotoData?.maskImages?.length);
  console.log('🔵 parsedPhotoData.storageUrl:', parsedPhotoData?.storageUrl);

  const scrollX = useSharedValue(0);
  const currentIndex = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Prepare mask data - filter out options with "Unknown" mask_img_url and sort by desired order
  const maskOptions: MaskOption[] = [
    { 
      skin_condition_name: 'none', 
      mask_img_url: parsedPhotoData?.storageUrl, 
      displayName: 'Original', 
      image_url: parsedPhotoData?.maskImages[0]?.image_url 
    },
    ...(parsedPhotoData?.maskImages || [])
      .filter((mask: any) => mask.mask_img_url !== "Unknown")
      .filter((mask: any) => {
        // Only include masks that have maskVerbiage in concerns.json
        const conditionToConcernKey: { [key: string]: string } = {
          'redness': 'rednessScore',
          'hydration': 'hydrationScore',
          'eye_bags': 'eyeAreaCondition',
          'pores': 'poresScore',
          'acne': 'acneScore',
          'lines': 'linesScore',
          'translucency': 'translucencyScore',
          'pigmentation': 'pigmentationScore',
          'uniformness': 'uniformnessScore'
        };
        
        const concernKey = conditionToConcernKey[mask.skin_condition_name];
        const concernDetails = concernsData?.skinConcerns?.[concernKey];
        
        // Only include if maskVerbiage exists
        return concernDetails?.maskVerbiage;
      })
      .map((mask: any) => ({
        ...mask,
        displayName: formatConditionName(mask.skin_condition_name)
      }))
      .sort((a: any, b: any) => {
        // Define the desired order for mask conditions
        const order = [
          'none',
          'uniformness',
          'pigmentation', 
          'redness',
          'pores',
          'acne',
          'lines',
          'hydration',
          'eye_bags'
        ];
        
        const indexA = order.indexOf(a.skin_condition_name);
        const indexB = order.indexOf(b.skin_condition_name);
        
        // If both are in the order array, sort by their position
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        
        // If only one is in the order array, prioritize it
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        
        // If neither is in the order array, sort alphabetically
        return a.skin_condition_name.localeCompare(b.skin_condition_name);
      })
  ];

  console.log('🔵 maskOptions:', maskOptions);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const index = Math.round(event.contentOffset.x / SCREEN_WIDTH);
      if (index !== currentIndex.value) {
        currentIndex.value = index;
        runOnJS(setActiveIndex)(index);
      }
    },
  });

  const scrollToIndex = (index: number): void => {
    scrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true
    });
  };

  const scrollRef = useRef<Animated.ScrollView>(null);
  const navigationScrollRef = useRef<Animated.ScrollView>(null);

  return (
    <SafeAreaView style={styles.container}>
      {/* <GestureHandlerRootView style={styles.container}> */}
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Header */}
        <SafeAreaView style={styles.headerContainer}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Face Mask</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => (navigation as any).goBack()}
              >
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* Main content */}
        <View style={styles.mainContent}>
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH}
            snapToAlignment="center"
          >
            {maskOptions.map((maskOption, index) => (
              <View key={index} style={styles.maskPage}>
                <ZoomableMaskImage
                  photoUri={maskOption?.image_url || ''}
                  maskUri={maskOption.mask_img_url}
                  conditionName={maskOption.skin_condition_name}
                  isActive={index === activeIndex}
                />
              </View>
            ))}
          </Animated.ScrollView>

          {/* Current mask label */}
          <View style={styles.currentLabelContainer}>
            <View style={styles.currentLabel}>
              <Text style={styles.currentLabelText}>
                {maskOptions[activeIndex]?.displayName}
              </Text>
              <View style={styles.currentLabelIndicator} />
            </View>
            
            {/* Mask Verbiage from concerns.json */}
            {(() => {
              const currentCondition = maskOptions[activeIndex]?.skin_condition_name;
              if (currentCondition && currentCondition !== 'none') {
                // Map condition names to concern keys
                const conditionToConcernKey: { [key: string]: string } = {
                  'redness': 'rednessScore',
                  'hydration': 'hydrationScore',
                  'eye_bags': 'eyeAreaCondition',
                  'pores': 'poresScore',
                  'acne': 'acneScore',
                  'lines': 'linesScore',
                  'pigmentation': 'pigmentationScore',
                  'uniformness': 'uniformnessScore'
                };
                
                const concernKey = conditionToConcernKey[currentCondition];
                const concernDetails = concernsData?.skinConcerns?.[concernKey];
                
                if (concernDetails?.maskVerbiage) {
                  return (
                    <View style={styles.maskVerbiageContainer}>
                      {Array.isArray(concernDetails.maskVerbiage) ? (
                        concernDetails.maskVerbiage.map((verbiage: string, index: number) => (
                          <View key={index} style={styles.maskVerbiageItem}>
                            <View style={styles.maskVerbiageBullet} />
                            <Text style={styles.maskVerbiageText}>
                              {verbiage}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.maskVerbiageText}>
                          {concernDetails.maskVerbiage}
                        </Text>
                      )}
                    </View>
                  );
                }
              }
              return null;
            })()}
          </View>
        </View>

        {/* Bottom navigation */}
        <View style={styles.bottomContainer}>
          <View style={styles.bottomGradient}>
            <View style={styles.bottomNavigation}>
              <Animated.ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.navigationContent}
                style={styles.navigationScroll}
                ref={navigationScrollRef}
              > 
                {maskOptions.map((maskOption, index) => {
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => scrollToIndex(index)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.navigationTab]}>
                        <Animated.Text style={[styles.navigationTabText, {color: '#FFF'}]}>
                          {maskOption.displayName}
                        </Animated.Text>
                        {index === activeIndex && (
                          <View style={styles.activeTabIndicator} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Animated.ScrollView>
            </View>
          </View>
        </View>
      {/* </GestureHandlerRootView> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollView: {
    //flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  maskPage: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskImageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 10,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  gestureContainer: {
    flex: 1,
  },
  gestureWrapper: {
    flex: 1,
  },
  imageWrapper: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  maskOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 1,
    zIndex: 100,
  },
  zoomControlsContainer: {
    alignItems: 'center',
  },
  zoomControls: {
    flexDirection: 'row',
    gap: 12,
  },
  zoomButton: {
    width: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  currentLabelContainer: {
    // position: 'absolute',
  },
  currentLabel: {
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  currentLabelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  currentLabelIndicator: {
    width: 30,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },
  bottomContainer: {
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomGradient: {
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  bottomNavigation: {
    paddingVertical: 10,
  },
  navigationScroll: {
    maxHeight: TAB_HEIGHT,
  },
  navigationContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  navigationTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 80,
    position: 'relative',
  },
  navigationTabText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 6,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 30,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },
  maskVerbiageContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    width: '90%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  maskVerbiageTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  maskVerbiageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  maskVerbiageBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  maskVerbiageText: {
    color: 'white',
    fontSize: 13,
    lineHeight: 16,
  },
});

export default MaskViewerScreen;
