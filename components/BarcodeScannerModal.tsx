// BarcodeScannerModal.tsx
// Custom modal wrapper for barcode scanner with same design

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Camera, useCameraDevices, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';
import { colors, fontSize, spacing, typography, borderRadius, shadows } from '../styles';
import { searchProductByUPC } from '../utils/newApiService';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onProductScanned?: (productData: any) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onProductScanned,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    if (visible && hasPermission === null) {
      requestPermission();
    }
  }, [visible, hasPermission, requestPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'upc-a', 'upc-e'],
    onCodeScanned: async (codes) => {
      if (isProcessing || !isScanning) return;
      
      const code = codes[0];
      if (code?.value) {
        setIsScanning(false);
        setIsProcessing(true);
        
        try {
          const upcCode = '0' + code.value;
          console.log('🔍 Scanned UPC:', upcCode);
          const result = await searchProductByUPC(upcCode);

          console.log('🔍 Result:', result);
          
          if ((result as any).success && (result as any).data) {
            // Call the callback first to pass product data with UPC code
            if (onProductScanned) {
              const productDataWithUPC = {
                ...(result as any).data,
                upc: upcCode
              };
              onProductScanned(productDataWithUPC);
            }
            // Close modal after successful scan
            onClose();
          } else {
            // Show error and reset scanning
            setIsScanning(true);
            setIsProcessing(false);
          }
        } catch (error) {
          console.error('🔴 Error processing scanned product:', error);
          setIsScanning(true);
          setIsProcessing(false);
        }
      }
    }
  });

  // Reset states when modal opens/closes
  useEffect(() => {
    if (visible) {
      setIsScanning(true);
      setIsProcessing(false);
    }
  }, [visible]);

  // Wait for permission check
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

  // Handle denied permission
  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              Camera permission is required to scan barcodes.
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!device) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              Camera not available on this device.
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            device={device}
            isActive={isScanning && !isProcessing}
            codeScanner={codeScanner}
          />
          
          {/* Scanning overlay */}
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            
            <Text style={styles.scanPlaceholderText}>
              Scan Placeholder
            </Text>
            <Text style={styles.instructionText}>
              Position barcode within frame
            </Text>
          </View>
          
          {/* Processing overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingText}>Processing product...</Text>
            </View>
          )}
        </View>
        
        {/* Cancel Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
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
    width: 280,
    height: 180,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: "#fff",
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanPlaceholderText: {
    ...typography.h2,
    color: "#fff",
    textAlign: 'center',
    marginTop: spacing.lg,
    fontWeight: 'bold',
    fontSize: 18,
  },
  instructionText: {
    ...typography.body,
    color: "#fff",
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 14,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  closeButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 20,
    alignItems: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B7355',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25,
    minWidth: 200,
    minHeight: 56,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: '600',
  },
});

export default BarcodeScannerModal;