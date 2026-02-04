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


import HomeHeader from '../components/ui/HomeHeader';
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
      {/* Custom Magic Mirror Header */}
      {/* Custom Magic Mirror Header */}
      <HomeHeader onMenuPress={handleMenuPress} />

      <View style={styles.contentContainer}>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('myRoutine')}
          >
            <Text style={[styles.tabText, activeTab === 'myRoutine' && styles.activeTabText]}>Routine</Text>
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
        </View>

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'myRoutine' && <MyRoutine ref={myRoutineRef} />}
          {activeTab === 'recommendations' && <RecommendationsList recommendations={[]} onRecommendationPress={() => { }} />}
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
    backgroundColor: '#fff', // White background
  },
  contentContainer: {
    flex: 1,
    marginTop: 100,
  },
  // Custom Header "Magic Mirror"
  // screenHeader: {
  //   paddingTop: 60, // Top spacing for status bar
  //   paddingBottom: 16,
  //   alignItems: 'center',
  //   backgroundColor: '#fff',
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#F5F5F4',
  // },
  // screenTitle: {
  //   fontSize: 17,
  //   fontWeight: '500', // Medium weight like iOS titles
  //   color: '#000',
  //   letterSpacing: -0.4,
  // },

  // Tab Bar Styles
  tabScrollView: {
    flexGrow: 0,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  tabButton: {
    flex: 1, // Distribute space equally
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 100, // Ensure minimum width for touch target
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#414651', // Muted text for inactive
  },
  activeTabText: {
    color: '#414651', // Teal color for active
    fontWeight: '600',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '65%', // Width relative to tab button
    backgroundColor: '#00839B', // Teal indicator
    borderRadius: 1,
  },
  tabContentContainer: {
    flex: 1,
    backgroundColor: '#FAFAF9', // Slightly off-white background for list area
  },
});
