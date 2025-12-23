// (authenticated)/(tabs)/index.tsx
// Home tab screen with camera access, photo grid, and analysis features

/* ------------------------------------------------------
WHAT IT DOES
- Displays home screen content
- Provides camera access
- Handles user logout
- Shows photo grid with analysis status
- Navigates to detailed snapshot view
- Uses cached photos for faster loading

DEV PRINCIPLES
- Uses TypeScript for type safety
- Clean component structure
- Proper navigation handling
- Efficient photo grid rendering
- Implements caching for better performance
------------------------------------------------------*/

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Camera } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

import SettingsDrawer from '../components/layout/SettingsDrawer';
import PhotoGrid from '../components/photo/PhotoGrid';
import TabHeader from '../components/ui/TabHeader';
import { colors, spacing, typography, forms } from '../styles';
import useAuthStore from '../stores/authStore';
import { usePhotoContext } from '../contexts/PhotoContext';

export default function Home(): React.JSX.Element {
  const navigation = useNavigation();
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);
  const { user } = useAuthStore();
  const { photos, isLoading, refreshPhotos, lastUpdated, pagination, isLoadingMore, loadMorePhotos } = usePhotoContext();

  console.log("isLoading", isLoading);

  useEffect(() => {
    console.log('📱 Home screen loaded');
  }, []);

  // Refetch photos whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Home screen focused - refreshing photos');
      refreshPhotos();
    }, [refreshPhotos])
  );

  const handleMenuPress = (): void => {
    setIsSettingsVisible(true);
  };

  console.log('🔵 photos:', photos);

  const handleLogout = async (): Promise<void> => {
    try {
      const { logout } = useAuthStore.getState();
      logout();
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  console.log('🔵 photos:', photos);

  return (
    <View style={styles.container}>
      <TabHeader 
        title="Magic Mirror" 
        onMenuPress={handleMenuPress}
      />
      
      <View style={[styles.content, styles.photoGridContainer]}>
        {photos.length === 0 && !isLoading ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconWrapper}>
              <Camera size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No snapshots yet</Text>
            <Text style={styles.emptySubtitle}>Take a Selfie!</Text>
            <Text style={styles.emptySubtitle}>Look at a source of light.</Text>
            <Text style={styles.emptySubtitle}>Center your face in the frame.</Text>
            <Text style={styles.emptySubtitle}>No make up, please!</Text>
            <Text style={styles.emptySubtitle}>Click + below</Text>
            <Text style={styles.emptySubtitle}>On your first visit, repeat to unlock the Progress Charts</Text>
          </View>
        ) : (
          <PhotoGrid 
            photos={photos} 
            onRefresh={refreshPhotos}
            lastUpdated={lastUpdated}
            onLoadMore={loadMorePhotos}
            isLoadingMore={isLoadingMore}
            hasMore={pagination.has_next}
            isLoading={isLoading}
          />
        )}
      </View>

      <SettingsDrawer 
        isVisible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF', // Match creamy background of tab bar
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
   marginTop: 100,
  },
  content: {
    flex: 1,
    marginTop: 120,
    marginBottom: 140, // Extra space for floating add button
    paddingHorizontal: spacing.lg,
  },
  photoGridContainer: {
    justifyContent: 'flex-end',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  subText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconWrapper: {
    backgroundColor: '#E8E2DA',
    padding: spacing.lg,
    borderRadius: 50,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
