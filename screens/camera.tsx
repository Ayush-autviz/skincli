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
import { Camera, useCameraDevices, CameraPermissionStatus } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'react-native-image-picker';
import useAuthStore from '../stores/authStore';
import Svg, { Path, Defs, Mask, Rect } from 'react-native-svg';
import { colors, spacing, typography } from '../styles';

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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const devices = useCameraDevices();
  const device = devices[facing];

  useEffect(() => {
    console.log('📸 Camera screen loaded');
    (async () => {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'authorized');
    })();
  }, []);

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
    return null;
  }

  // Handle denied permission
  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.message}>No access to camera</Text>
        <Text style={styles.debugText}>
          Permission state: {JSON.stringify({hasPermission, isCameraActive}, null, 2)}
        </Text>
        <View style={styles.permissionButtonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => {
              Linking.openSettings();
            }}
          >
            <Text style={styles.buttonText}>Grant Access</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => (navigation as any).goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Check if user is authenticated
  if (!user?.user_id) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.message}>Authentication Required</Text>
        <Text style={styles.debugText}>
          Please sign in to use the camera
        </Text>
        <View style={styles.permissionButtonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => (navigation as any).reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            })}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => (navigation as any).goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const shutdownCamera = async (): Promise<void> => {
    setIsCameraActive(false);
    if (camera) {
      try {
        await camera.pausePreview();
      } catch (e) {
        console.error('🔴 CAMERA: Error during pausePreview():', e);
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
      const photo = await camera.takePhoto({
        qualityPrioritization: 'speed',
        flash: 'off',
        enableAutoRedEye: true,
        enableAutoStabilization: true,
      });

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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('🔵 UPLOAD: Permission status:', status);
      
      if (status !== 'granted') {
        console.log('🔴 UPLOAD: Permission denied');
        Alert.alert(
          'Permission needed',
          'Library access is required to upload photos',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Using settings directly from the React Native Image Picker documentation
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // Use array form as per docs
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.7,
        exif: false,
        
        // iOS specific options that might help
        presentationStyle: 'formSheet', // iOS - use a specific presentation style
        
        // Disable width/height settings as they might conflict with aspect ratio
        // Let the system handle the resizing based on aspect ratio
      });

      console.log('🔵 UPLOAD: Image picker result:', {
        cancelled: result.canceled,
        hasAssets: result.assets?.length > 0,
        dimensions: result.assets?.[0] ? `${result.assets[0].width}x${result.assets[0].height}` : 'none'
      });

      if (!result.canceled && result.assets?.[0]) {
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
          <Camera 
            ref={ref => setCamera(ref)}
            style={styles.camera}
            device={device}
            isActive={isCameraActive}
            photo={true}
          />
          <FaceOverlay />
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

            <TouchableOpacity
              style={styles.textButton}
              onPress={handleUpload}
            >
              <Text style={styles.buttonText}>Upload</Text>
            </TouchableOpacity>
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
  },
  camera: {
    flex: 1,
  },
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
  message: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
    marginBottom: 20,
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionButtonContainer: {
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
});

export default CameraScreen;
