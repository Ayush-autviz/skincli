// camera.tsx
// Camera screen with Haut.ai LIQA (triple-capture) integration

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import useAuthStore from '../stores/authStore';
import { colors, spacing, typography, borderRadius, shadows } from '../styles';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { LiqaWebView } from '../components/LiqaWebView';

const CameraScreen = (): React.JSX.Element => {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute();
  const fromScanTab = (route.params as any)?.fromScanTab;
  const [showLiqa, setShowLiqa] = useState<boolean>(true);

  const handleLiqaEvent = (name: string, payload?: any) => {
    console.log(`📡 LIQA Event: ${name}`);

    if (name === 'captures' && payload?.captures) {
      const captures = payload.captures;
      const frontCapture = captures.find((c: any) => c.side === 'front');
      const rightCapture = captures.find((c: any) => c.side === 'right');
      const leftCapture  = captures.find((c: any) => c.side === 'left');

      if (!frontCapture) {
        console.error('🔴 LIQA: No front capture found');
        return;
      }

      const userId  = user?.user_id;
      if (!userId) {
        Alert.alert('Error', 'User not authenticated.');
        return;
      }

      setShowLiqa(false);

      (navigation as any).replace('Snapshot', {
        photoId: `${Date.now()}`,
        localUri:  frontCapture.base64,
        rightUri:  rightCapture?.base64 ?? null,
        leftUri:   leftCapture?.base64  ?? null,
        userId,
        timestamp: new Date().toISOString(),
        fromScanTab,
      });
    }

    if (name === 'error') {
      console.error('🔴 LIQA error:', payload?.message);
      Alert.alert('Scan Error', payload?.message || 'An error occurred during face scan. Please try again.');
    }
  };

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

  return (
    <View style={styles.container}>
      {showLiqa ? (
        <View style={styles.container}>
          <LiqaWebView onLiqaEvent={handleLiqaEvent} />
          <TouchableOpacity
            style={styles.closeLiqaButton}
            onPress={() => (navigation as any).goBack()}
          >
            <ArrowLeft size={24} color="white" />
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.container, { backgroundColor: 'black' }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 8,
  },
  closeLiqaButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
    zIndex: 10,
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
