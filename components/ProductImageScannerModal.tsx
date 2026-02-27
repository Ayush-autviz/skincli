// ProductImageScannerModal.tsx
// Modal for capturing product images and extracting product info using AI

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Text,
  Image,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { Camera, useCameraDevices, useCameraPermission, PhotoFile } from 'react-native-vision-camera';
import { X, Camera as CameraIcon, RotateCcw, Check, Sparkles, ArrowRight, RotateCw } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '../styles';
import { extractProductFromImage, searchProductByUPC } from '../utils/newApiService';

interface ProductImageScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onProductScanned?: (productData: any) => void;
  onError?: (message: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ProductImageScannerModal: React.FC<ProductImageScannerModalProps> = ({
  visible,
  onClose,
  onProductScanned,
  onError,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');

  const cameraRef = useRef<Camera>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    if (visible && hasPermission === null) {
      requestPermission();
    }
  }, [visible, hasPermission, requestPermission]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setCapturedImage(null);
      setIsProcessing(false);
      setProcessingStep('');
    }
  }, [visible]);

  // Pulse animation for capture button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'balanced',
      });

      const imageUri = `file://${photo.path}`;
      setCapturedImage(imageUri);
    } catch (error) {
      console.error('Error capturing image:', error);
      if (onError) {
        onError('Failed to capture image. Please try again.');
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setIsProcessing(false);
    setProcessingStep('');
  };

  const handleConfirm = async () => {
    if (!capturedImage || isProcessing) return;

    setIsProcessing(true);
    setProcessingStep('Analyzing product image...');

    try {
      // Extract product from image
      const result = await extractProductFromImage(capturedImage);

      if (result.success && result.data) {
        setProcessingStep('Fetching product details...');

        // If we have a UPC, try to get full product details
        if (result.data.upc) {
          try {
            const upcResult = await searchProductByUPC(result.data.upc);
            if ((upcResult as any).success && (upcResult as any).data) {
              // Merge the UPC data with extracted data
              const fullProductData = {
                ...(upcResult as any).data,
                upc: result.data.upc,
                search_product_name: result.data.search_product_name,
                search_brand_name: result.data.search_brand_name,
              };

              if (onProductScanned) {
                onProductScanned(fullProductData);
              }
              onClose();
              return;
            }
          } catch (upcError) {
            console.log('UPC lookup failed, using extracted data:', upcError);
          }
        }

        // Use extracted data if UPC lookup fails or no UPC
        if (onProductScanned) {
          onProductScanned(result.data);
        }
        onClose();
      } else {
        if (onError) {
          onError(result.message || 'Could not identify product. Please try again or enter product manually.');
        }
        handleRetake();
      }
    } catch (error) {
      console.error('Error processing image:', error);
      if (onError) {
        onError('Failed to process image. Please try again.');
      }
      handleRetake();
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Permission loading
  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.permissionText}>
              Requesting camera permission...
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
        <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
          <View style={styles.permissionContainer}>
            <View style={styles.logoCircle}>
              <CameraIcon size={48} color="#08879b" />
            </View>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              Camera permission is required to scan products. Please enable it in your device settings.
            </Text>

            <View style={styles.permissionActionContainer}>
              <TouchableOpacity
                onPress={() => Linking.openSettings()}
                style={styles.openSettingsButton}
              >
                <Text style={styles.openSettingsButtonText}>Open Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.stayCloseButton}>
                <Text style={styles.stayCloseButtonText}>Not Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // No camera device
  if (!device) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              Camera not available on this device.
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButtonLarge}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {/* <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity> */}
          <View style={{ width: 40 }} />
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Scan Product</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Camera or Preview */}
        <View style={styles.cameraContainer}>
          {capturedImage ? (
            // Show captured image preview
            <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          ) : (
            // Show camera
            <>
              <Camera
                ref={cameraRef}
                style={styles.camera}
                device={device}
                isActive={visible && !capturedImage}
                photo={true}
              />

              {/* Scan Frame Overlay */}
              <View style={styles.overlay}>
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
              </View>
            </>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <View style={styles.processingCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.processingText}>{processingStep}</Text>
                <Text style={styles.processingSubtext}>This may take a moment...</Text>
              </View>
            </View>
          )}
        </View>

        {/* Instructions */}
        {/* <View style={styles.instructionContainer}>
          {capturedImage ? (
            <Text style={styles.instructionText}>
              Confirm this image to identify the product
            </Text>
          ) : (
            <>
              <Text style={styles.instructionText}>
                Position product label within the frame
              </Text>
              <Text style={styles.instructionSubtext}>
                Make sure the product name is clearly visible
              </Text>
            </>
          )}
        </View> */}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {capturedImage ? (
            // Show Retake and Confirm buttons
            <>
              <TouchableOpacity
                style={styles.textButton}
                onPress={handleRetake}
                disabled={isProcessing}
              >
                {/* <Text style={styles.buttonText}>Retake</Text> */}
                <RotateCw size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, isProcessing && styles.buttonDisabled]}
                onPress={handleConfirm}
                disabled={isProcessing}
              >
                <Text style={styles.confirmButtonText}>
                  {isProcessing ? 'Processing...' : 'Identify Product'}
                </Text>
                <ArrowRight size={20} color="#fff" />
              </TouchableOpacity>

              {/* <View style={styles.textButton} /> */}
            </>
          ) : (
            // Show Capture button with Cancel
            <>
              <TouchableOpacity
                style={styles.textButton}
                onPress={onClose}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleCapture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>

              <View style={[styles.textButton, { minWidth: 60 }]} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.background,
    borderWidth: 6,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  instructionContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  instructionSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 80,
    backgroundColor: '#000',
  },
  textButton: {
    // padding: 10,
    // minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  captureContainer: {
    alignItems: 'center',
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
  captureHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.sm,
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.md,
    borderRadius: 25,
    gap: 8,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  confirmButton: {
    flex: 0,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor: '#00839B',
    paddingVertical: spacing.md,
    // paddingHorizontal: spacing.lg,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonText: {
    textDecorationLine: 'underline',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#FFFFFF',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
    marginBottom: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  permissionActionContainer: {
    width: '100%',
    gap: 12,
  },
  openSettingsButton: {
    backgroundColor: '#08879b',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  openSettingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stayCloseButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  stayCloseButtonText: {
    color: '#08879b',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButtonLarge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
});

export default ProductImageScannerModal;
