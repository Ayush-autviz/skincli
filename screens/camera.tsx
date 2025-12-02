// camera.tsx
// Camera screen with react-native-vision-camera integration

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Linking, 
  Image, 
  Dimensions 
} from 'react-native';
import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'react-native-image-picker';
import useAuthStore from '../stores/authStore';
import Svg, { Path, Defs, Mask, Rect } from 'react-native-svg';
import { colors, spacing, typography, borderRadius, shadows } from '../styles';
import { Camera as CameraIcon, Settings, ArrowLeft, AlertCircle } from 'lucide-react-native';

/* ------------------------------------------------------
WHAT IT DOES
- Handles camera permissions
- Provides camera preview
- Allows camera flipping (front/back)
- Captures photos
- Integrates with react-native-vision-camera
- Processes images through Haut.ai API (NEW FLOW)
- Shows loading state during processing
- Navigates to snapshot view with analysis results

DATA USED
- facing: CameraType ('front' | 'back')
- permission: CameraPermissionStatus
- photo: Captured photo data
- userId: Current user's ID from auth store
- Haut.ai API integration for image analysis

IMPORTANT IMPLEMENTATION NOTES
1. Photo Capture Settings:
   - qualityPrioritization: 'speed' (balanced speed/quality)
   - flash: 'off' (consistent lighting)
   - enableAutoRedEye: true (better face detection)
   - enableAutoStabilization: true (better image quality)

2. NEW API Flow:
   - Capture photo with react-native-vision-camera
   - Process through Haut.ai API using processHautImage()
   - Navigate to snapshot view immediately
   - Snapshot view handles polling for analysis results

3. Critical Dependencies:
   - react-native-vision-camera: Image capture
   - Haut.ai API: Image analysis processing
   - PhotoContext: Local snapshot state management

TROUBLESHOOTING
- If images fail to process: Check API connection and user registration
- If images fail to analyze: Check image quality and orientation settings
- If analysis takes too long: Handled by polling timeout in snapshot view

EXIF DATA & ORIENTATION ISSUES
- EXIF (Exchangeable Image File Format) contains image metadata including orientation
- Mobile devices capture photos in their native orientation but add EXIF data to indicate how they should be displayed
- Problem: When a portrait mode photo is taken, the image data might still be in landscape orientation with EXIF data saying "rotate 90 degrees"
- Solution: react-native-vision-camera handles orientation automatically
- Analysis API: Our backend analysis service expects faces in portrait orientation and may fail if it receives sideways faces

------------------------------------------------------*/

/* ------------------------------------------------------
FACE OVERLAY CONFIGURATION
- All percentage values are decimal (0-1)
- Width/Height are relative to screen width
- Center position is relative to screen height
------------------------------------------------------*/
const FACE_OVERLAY = {
  // Width of face rectangle as percentage of screen width
  RECT_WIDTH_PCT: 0.76,
  
  // Height of face rectangle as percentage of screen width (to maintain aspect ratio)
  RECT_HEIGHT_PCT: 1.1,
  
  // Border radius of the face rectangle in pixels
  RECT_RADIUS_PCT: 0.3,
  
  // Vertical center position as percentage of screen height (0 = top, 1 = bottom)
  RECT_CENTERED_AT_PCT: 0.45,
  
  // Optional: Additional configuration
  BORDER_WIDTH: 2,
  BORDER_COLOR: 'rgba(255,255,255,.33)',
  OVERLAY_OPACITY: 0.45,
};

// Debug logging for Haut.ai API integration
console.log('🔵 CAMERA: Camera screen with Haut.ai API integration loaded');

// Add this component after the FACE_OVERLAY constants
const FaceOverlay = (): React.JSX.Element => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // Calculate dimensions
  const faceWidth = screenWidth * FACE_OVERLAY.RECT_WIDTH_PCT;
  const faceHeight = screenWidth * FACE_OVERLAY.RECT_HEIGHT_PCT;
  const borderRadius = faceWidth * FACE_OVERLAY.RECT_RADIUS_PCT;
  
  // Calculate position
  const centerY = screenHeight * FACE_OVERLAY.RECT_CENTERED_AT_PCT;
  const rectY = centerY - (faceHeight / 2);
  const rectX = (screenWidth - faceWidth) / 2;

  return (
    <Svg height={screenHeight} width={screenWidth} style={StyleSheet.absoluteFill}>
      <Defs>
        <Mask id="mask" x="0" y="0" height="100%" width="100%">
          <Rect width="100%" height="100%" fill="white" />
          <Rect
            x={rectX}
            y={rectY}
            width={faceWidth}
            height={faceHeight}
            rx={borderRadius}
            ry={borderRadius}
            fill="black"
          />
        </Mask>
      </Defs>
      
      <Rect
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.45)"
        mask="url(#mask)"
      />
      
      {/* Border for the face guide */}
      <Rect
        x={rectX}
        y={rectY}
        width={faceWidth}
        height={faceHeight}
        rx={borderRadius}
        ry={borderRadius}
        stroke="rgba(255,255,255,0.33)"
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
};

interface CameraScreenProps {}

const CameraScreen = (): React.JSX.Element => {
  // Only the hooks we actually use
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const devices = useCameraDevices();
  const device = facing === 'front' ? devices.find(d => d.position === 'front') : devices.find(d => d.position === 'back');
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    console.log('📸 Camera screen loaded');
    if (hasPermission === null) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Monitor authentication state
  useEffect(() => {
    console.log('🔵 AUTH: Current user state:', {
      isAuthenticated: !!user,
      uid: user?.user_id,
      email: user?.email
    });
    
    // Test API connection if user is authenticated
    if (user?.user_id) {
      testUserRegistration(user.user_id, user.email);
    }
  }, [user]);

  // Test if user is properly registered in external API
  const testUserRegistration = async (userId: string, userEmail: string): Promise<void> => {
    try {
      console.log('🔵 TEST: Testing user registration in external API');
      
      // Try to create user subject (this will fail if user already exists, which is fine)
      // const { subjectId } = await createUserSubject(userId, userEmail);
      console.log('✅ TEST: User registration check skipped (already registered)');
      
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('✅ TEST: User already exists in external API (this is expected)');
      } else {
        console.error('🔴 TEST: User registration test failed:', error);
        Alert.alert(
          'API Connection Issue', 
          'Unable to connect to analysis service. Please check your internet connection and try again.',
          [
            { text: 'OK', onPress: () => console.log('User acknowledged API issue') }
          ]
        );
      }
    }
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      // Ensure shutdown is called on unmount
      (async () => {
         await shutdownCamera();
      })();
    };
  }, []);

  // Wait for permission check
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  }

  // Handle denied permission
  // if (hasPermission === false) {
  //   return (
  //     <View style={styles.container}>
  //       <View style={styles.errorContainer}>
  //         <View style={styles.errorContent}>
  //           <View style={styles.errorIconContainer}>
  //             <CameraIcon size={48} color={colors.error} />
  //           </View>
  //           <Text style={styles.errorText}>Camera Access Required</Text>
  //           <Text style={styles.errorSubtext}>
  //             To take photos and analyze your skin, please grant camera permission in your device settings.
  //           </Text>
  //           <View style={styles.errorButtonContainer}>
  //             <TouchableOpacity 
  //               style={styles.primaryButton}
  //               onPress={() => {
  //                 Linking.openSettings();
  //               }}
  //             >
  //               <Settings size={20} color={colors.textOnPrimary} />
  //               <Text style={styles.primaryButtonText}>Open Settings</Text>
  //             </TouchableOpacity>
              
  //             <TouchableOpacity 
  //               style={styles.secondaryButton}
  //               onPress={() => (navigation as any).goBack()}
  //             >
  //               <ArrowLeft size={20} color={colors.textPrimary} />
  //               <Text style={styles.secondaryButtonText}>Go Back</Text>
  //             </TouchableOpacity>
  //           </View>
  //         </View>
  //       </View>
  //     </View>
  //   );
  // }

  // Check if user is authenticated
  if (!user?.user_id) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <View style={styles.errorIconContainer}>
              <AlertCircle size={48} color={colors.error} />
            </View>
            <Text style={styles.errorText}>Authentication Required</Text>
            <Text style={styles.errorSubtext}>
              Please sign in to use the camera and analyze your skin photos.
            </Text>
            <View style={styles.errorButtonContainer}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => (navigation as any).navigate('SignIn')}
              >
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => (navigation as any).goBack()}
              >
                <ArrowLeft size={20} color={colors.textPrimary} />
                <Text style={styles.secondaryButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Check if camera device is available
  // if (!device) {
  //   return (
  //     <View style={styles.container}>
  //       <View style={styles.errorContainer}>
  //         <View style={styles.errorContent}>
  //           <View style={styles.errorIconContainer}>
  //             <CameraIcon size={48} color={colors.error} />
  //           </View>
  //           <Text style={styles.errorText}>No Camera Available</Text>
  //           <Text style={styles.errorSubtext}>
  //             No camera device was found on this device. Please check your device settings or try again later.
  //           </Text>
  //           <View style={styles.errorButtonContainer}>
  //             <TouchableOpacity 
  //               style={styles.secondaryButton}
  //               onPress={() => (navigation as any).goBack()}
  //             >
  //               <ArrowLeft size={20} color={colors.textPrimary} />
  //               <Text style={styles.secondaryButtonText}>Go Back</Text>
  //             </TouchableOpacity>
  //           </View>
  //         </View>
  //       </View>
  //     </View>
  //   );
  // }

  const shutdownCamera = async (): Promise<void> => {
    setIsCameraActive(false);
    if (camera) {
      try {
        // Vision Camera doesn't have pausePreview method
        // Just set camera to null
      } catch (e) {
        console.error('🔴 CAMERA: Error during camera shutdown:', e);
      }
      setCamera(null);
    }
  };

  // Shared function for processing photos with Haut.ai API
  const processPhoto = async (photo: any): Promise<void> => {
    try {
      // Get user ID from Zustand store
      if (!user?.user_id) {
        console.error('🔴 PROCESS: No user ID available');
        console.log('🔴 PROCESS: Current user:', user);
        Alert.alert('Error', 'User not authenticated. Please sign in again.');
        return;
      }

      const userId = user.user_id;
      console.log('🔵 PROCESS: User ID found:', userId);
      
      const photoId = `${Date.now()}`;
      
      await shutdownCamera();
      await new Promise<void>(resolve => setTimeout(resolve, 200)); 
      
      // Navigate to snapshot screen immediately with photo data
      // The snapshot screen will handle Haut.ai API processing and polling for results
      (navigation as any).navigate('Snapshot', { 
        photoId, 
        localUri: photo.uri,
        userId: userId,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ PROCESS: Navigated to snapshot screen for Haut.ai processing');
      
    } catch (error: any) {
      console.error('🔴 PROCESS ERROR (General):', error);
      Alert.alert('Error', `Failed to process photo: ${error.message}`);
    }
  };

  // Update capture handler to use shared function
  const handleCapture = async (): Promise<void> => {
    if (!camera) {
      return;
    }

    try {
      const photo = await camera.takePhoto({});

      // Use the shared processing function
      await processPhoto({
        uri: `file://${photo.path}`,
        width: photo.width,
        height: photo.height,
      });

    } catch (error: any) {
      console.error('🔴 CAMERA ERROR:', error.message);
      console.error('🔴 CAMERA ERROR Stack:', error.stack);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      // Ensure camera is reactivated if processPhoto failed early
      setIsCameraActive(true); 
    }
  };

  // Update handleUpload to use shared function
  const handleUpload = async (): Promise<void> => {
    try {
      console.log('🔵 UPLOAD: Starting upload flow');
      
      // Using settings directly from the React Native Image Picker documentation
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        maxHeight: 2000,
        maxWidth: 2000,
        quality: 0.7,
      });

      console.log('🔵 UPLOAD: Image picker result:', {
        cancelled: result.didCancel,
        hasAssets: result.assets && result.assets.length > 0,
        dimensions: result.assets?.[0] ? `${result.assets[0].width}x${result.assets[0].height}` : 'none'
      });

      if (!result.didCancel && result.assets?.[0]) {
        // Use the shared processing function
        await processPhoto(result.assets[0]);
      } else {
        console.log('🔵 UPLOAD: User cancelled selection');
      }
    } catch (error: any) {
      console.error('🔴 UPLOAD ERROR:', error);
      Alert.alert('Error', 'Failed to access photo library');
    }
  };

  
  return (
    <View style={styles.container}>
      {isCameraActive ? (
        <>
        {device && (
          <Camera 
            ref={ref => setCamera(ref)}
            style={styles.camera}
            device={device}
            isActive={isCameraActive}
            photo={true}
          />
          )}
          <FaceOverlay />
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>Face a source of light</Text>
            <Text style={styles.instructionsText}>Center your face in full frame</Text>
            <Text style={styles.instructionsText}>Do not wear makeup</Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.textButton}
              onPress={async () => {
                await shutdownCamera();
                (navigation as any).goBack();
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.captureButton}
              onPress={handleCapture}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.textButton} />
          </View>
        </>
      ) : (
        <View style={[styles.container, { backgroundColor: 'black' }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  camera: {
    flex: 1,
  },
  
  // Instructions
  instructionsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  instructionsText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  
  // Camera Controls
  buttonContainer: {
    flex: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 80,
  },
  textButton: {
    padding: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  captureButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  
  // Error States - Matching app design
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  
  // Error State Button Container
  errorButtonContainer: {
    alignItems: 'center',
    width: '100%',
  },
  
  // Button Styles - Matching app design
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    minWidth: 200,
    ...shadows.sm,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 200,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  
  // Legacy styles (keeping for compatibility)
  message: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  liqaContainer: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  liqaButton: {
    padding: 10,
  },
  liqaText: {
    color: 'white',
    fontSize: 14,
  },
});

export default CameraScreen;
