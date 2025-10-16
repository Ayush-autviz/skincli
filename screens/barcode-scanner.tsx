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
import { Camera, useCameraDevices, useCodeScanner } from 'react-native-vision-camera';
import { ArrowLeft } from 'lucide-react-native';
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
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  
  const devices = useCameraDevices();
  const device = devices.back;

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
          
          if (result.success && result.data) {
            // Navigate back with product data
            navigation.goBack();
            if (params.onProductScanned) {
              params.onProductScanned(result.data);
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
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    try {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'authorized');
    } catch (error) {
      console.error('🔴 Camera permission error:', error);
      Alert.alert(
        'Camera Permission Required',
        'Please allow camera access to scan barcodes.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera permission is required to scan barcodes.
          </Text>
          <TouchableOpacity onPress={checkCameraPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera not available on this device.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
      
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
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => {
            setIsScanning(true);
            setIsProcessing(false);
          }}
          disabled={isProcessing}
        >
          <Text style={styles.scanButtonText}>Scan</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.primary,
    ...shadows.sm,
  },
  backButton: {
    padding: spacing.sm,
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
    width: 250,
    height: 150,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.text.primary,
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
  instructionText: {
    ...typography.body,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
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
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 120,
  },
  scanButtonText: {
    ...typography.button,
    color: colors.text.onPrimary,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  permissionButtonText: {
    ...typography.button,
    color: colors.text.onPrimary,
  },
});

export default BarcodeScannerScreen;
