// (authenticated)/(tabs)/routine.tsx
// Routine tab screen for managing skincare routine and viewing recommendations

/* ------------------------------------------------------
WHAT IT DOES
- Displays routine management interface (under construction)
- Displays ingredient recommendations based on latest analysis
- Provides tab navigation between "My Routine" and "Recommendations"

DEV PRINCIPLES
- Uses TypeScript for type safety
- Clean component structure
- Consistent styling
------------------------------------------------------*/

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import TabHeader from '../components/ui/TabHeader';
import SettingsDrawer from '../components/layout/SettingsDrawer';

import MyRoutine from '../components/routine/MyRoutine';
import RecommendationsList from '../components/routine/RecommendationsList';
import ActivityList from '../components/routine/ActivityList';
import { colors, spacing, typography } from '../styles';

export default function RoutineTab(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<string>('myRoutine');
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);
  const myRoutineRef = useRef<any>(null);
  const navigation = useNavigation();

  useEffect(() => {
    console.log('🧴 Routine tab loaded');
  }, []);

  // Refetch routines when screen comes into focus (e.g., returning from thread chat)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🧴 Routine tab focused - refetching routines');
      // Trigger refetch in MyRoutine component
      if (myRoutineRef.current && myRoutineRef.current.refetchRoutines) {
        myRoutineRef.current.refetchRoutines();
      }
    }, [])
  );

  const handleMenuPress = (): void => {
    // setIsSettingsVisible(true);
    (navigation as any).navigate('Index');
  };

  return (
    <View style={styles.outerContainer}>
      <TabHeader 
        title="My Routine"
        onMenuPress={handleMenuPress}
        showBack={true}
      />
      <View style={styles.contentContainer}>
        {/* Tab Navigation */}
        <ScrollView 
          horizontal={true} 
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabContainer}
        >
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setActiveTab('myRoutine')}
          >
            <Text style={[styles.tabText, activeTab === 'myRoutine' && styles.activeTabText]}>My Routine</Text>
            {activeTab === 'myRoutine' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setActiveTab('recommendations')}
          >
            <Text style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}>Ingredients</Text>
            {activeTab === 'recommendations' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>Journal</Text>
            {activeTab === 'activity' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'myRoutine' && <MyRoutine ref={myRoutineRef} />}
          {activeTab === 'recommendations' && <RecommendationsList recommendations={[]} onRecommendationPress={() => {}} />}
          {activeTab === 'activity' && <ActivityList />}
        </View>
      </View>

      <SettingsDrawer 
        isVisible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    marginTop: 120, // Space for new header
    marginBottom: 100, // Space for bottom nav
  },
  tabScrollView: {
    flexGrow: 0,
    borderBottomColor: colors.border,
    marginTop: spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    paddingVertical: 0,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  activeTabText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  activeTabIndicator: {
    height: 3,
    width: '100%',
    backgroundColor: colors.primary,
  },
  tabContentContainer: {
    flex: 1,
  },
  text: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
