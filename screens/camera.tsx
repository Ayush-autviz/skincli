// camera.tsx
// Camera screen with Haut.ai LIQA (single face capture) integration
// Optimized with preloading: uses global LIQA WebView from LiqaContext

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import useAuthStore from '../stores/authStore';
import { colors, spacing, typography, borderRadius, shadows } from '../styles';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { useLiqa } from '../contexts/LiqaContext';

const CameraScreen = (): React.JSX.Element => {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute();
  const fromScanTab = (route.params as any)?.fromScanTab;
  const { showLiqa, hideLiqa, setOnLiqaEvent, setOnCloseLiqa, resetLiqa } = useLiqa();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Show the global preloaded LIQA WebView (it's behind the stack)
    showLiqa();

    // Small delay to ensure the overlay is ready
    const timer = setTimeout(() => setIsInitializing(false), 500);

    // Set the event handler for this specific screen
    setOnLiqaEvent(() => (name: string, payload?: any) => {
      handleLiqaEvent(name, payload);
    });

    // Set the close handler for the global back button
    setOnCloseLiqa(() => () => navigation.goBack());

    return () => {
      // Hide the LIQA WebView and clear the event handler when leaving
      hideLiqa();
      setOnLiqaEvent(null);
      setOnCloseLiqa(null);
      resetLiqa(); // Remount in background
      clearTimeout(timer);
    };
  }, []);

  const handleLiqaEvent = (name: string, payload?: any) => {
    console.log(`📡 CameraScreen: LIQA Event: ${name}`);

    if (name === 'captures' && payload?.captures) {
      const captures = payload.captures;
      // For "face" preset, we only have one capture
      const capturedImage = captures[0];

      if (!capturedImage) {
        console.error('🔴 LIQA: No capture found');
        return;
      }

      const userId = user?.user_id;
      if (!userId) {
        Alert.alert('Error', 'User not authenticated.');
        return;
      }

      // Important: Hide the global WebView before navigating
      hideLiqa();

      (navigation as any).replace('Snapshot', {
        photoId: `${Date.now()}`,
        localUri: capturedImage.base64,
        userId,
        timestamp: new Date().toISOString(),
        fromScanTab,
      });
    }

    if (name === 'error') {
      console.error('🔴 LIQA error:', payload?.message);
      Alert.alert(
        'Scan Error',
        payload?.message ||
          'An error occurred during face scan. Please try again.',
      );
    }
  };

  // Check if user is authenticated
  if (!user?.user_id) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 
          The LIQA WebView is rendered at the global level in AuthenticatedNavigator.
          We use a transparent container here so it shows through from behind.
      */}
      {isInitializing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Starting Scan...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Crucial: allow global LIQA to show through
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    zIndex: 5,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
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
  errorButtonContainer: {
    alignItems: 'center',
    width: '100%',
  },
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
});

export default CameraScreen;
