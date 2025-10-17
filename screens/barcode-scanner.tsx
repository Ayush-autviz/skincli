// barcode-scanner.tsx
// Barcode scanning screen for UPC code scanning

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Camera, useCameraDevices, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';
import { colors, fontSize, spacing, typography, borderRadius, shadows } from '../styles';
import { searchProductByUPC } from '../utils/newApiService';

interface BarcodeScannerParams {
  onProductScanned?: (productData: any) => void;
}

const BarcodeScannerScreen = (): React.JSX.Element => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as BarcodeScannerParams || {};
  
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const devices = useCameraDevices();
  console.log('🔍 Devices:', devices);
  const device = devices.find(d => d.position === 'back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'upc-a', 'upc-e'],
    onCodeScanned: async (codes) => {
      if (isProcessing || !isScanning) return;
      
      const code = codes[0];
      if (code?.value) {
        setIsScanning(false);
        setIsProcessing(true);
        
        try {
          console.log('🔍 Scanned UPC:', code.value);
          const result = await searchProductByUPC(code.value);
          
          if ((result as any).success && (result as any).data) {
            // Navigate back with product data
            navigation.goBack();
            if (params.onProductScanned) {
              params.onProductScanned((result as any).data);
            }
          } else {
            Alert.alert(
              'Product Not Found',
              'We couldn\'t find this product in our database. Please try scanning again or add the product manually.',
              [
                {
                  text: 'Try Again',
                  onPress: () => {
                    setIsScanning(true);
                    setIsProcessing(false);
                  }
                },
                {
                  text: 'Cancel',
                  onPress: () => navigation.goBack()
                }
              ]
            );
          }
        } catch (error) {
          console.error('🔴 Error processing scanned product:', error);
          Alert.alert(
            'Error',
            'Failed to process the scanned product. Please try again.',
            [
              {
                text: 'Try Again',
                onPress: () => {
                  setIsScanning(true);
                  setIsProcessing(false);
                }
              },
              {
                text: 'Cancel',
                onPress: () => navigation.goBack()
              }
            ]
          );
        }
      }
    }
  });

  useEffect(() => {
    if (hasPermission === null) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);


  // Wait for permission check
  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.permissionText}>
            Requesting camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle denied permission
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera permission is required to scan barcodes.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera not available on this device.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
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
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  
  // Button Container
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 20, // Extra padding for safe area
    alignItems: 'center',
  },
  
  // Cancel Button - Matching auth screen secondary button style
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B7355',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25, // Same as auth screens
    minWidth: 200,
    minHeight: 56, // Same as auth screens
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
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

export default BarcodeScannerScreen;
