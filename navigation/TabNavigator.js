import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { TrendingUp, Calendar } from 'lucide-react-native';
import { colors, spacing } from '../styles';

// Import tab screens
import IndexScreen from '../screens/index';
import ProgressScreen from '../screens/progress';
import RoutineScreen from '../screens/routine';

const Tab = createBottomTabNavigator();

function CustomTabBar({ state, descriptors, navigation }) {
  // More robust active tab detection
  const getCurrentRoute = () => {
    if (!state || !state.routes || state.index === undefined) {
      return null;
    }
    return state.routes[state.index]?.name;
  };

  const handleTabPress = (tab) => {
    switch (tab) {
      case 'Progress':
        navigation.navigate('Progress');
        break;
      case 'Routine':
        navigation.navigate('Routine');
        break;
    }
  };

  const handleCameraPress = () => {
    navigation.navigate('Camera');
  };

  // Direct route comparison - more reliable
  const isTabActive = (tab) => {
    const currentRoute = getCurrentRoute();
    const isActive = currentRoute === tab;
    console.log(`🔵 Tab ${tab} active state:`, isActive, 'Current route:', currentRoute);
    return isActive;
  };

  return (
    <View style={styles.container}>
      <View style={styles.pillContainer}>
        {/* Progress Tab */}
        <TouchableOpacity 
          style={[
            styles.tabButton,
            isTabActive('Progress') && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('Progress')}
          activeOpacity={1} // Disable opacity change on press
        >
          <View style={styles.tabContent}>
            <TrendingUp 
              size={20} 
              color={isTabActive('Progress') ? colors.textOnPrimary : colors.textTertiary}
            />
            <Text style={[
              styles.tabText,
              isTabActive('Progress') ? styles.activeTabText : styles.inactiveTabText
            ]}>
              Progress
            </Text>
          </View>
        </TouchableOpacity>

        {/* Empty space for center button */}
        <View style={styles.centerSpace} />

        {/* Routine Tab */}
        <TouchableOpacity 
          style={[
            styles.tabButton,
            isTabActive('Routine') && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('Routine')}
          activeOpacity={1} // Disable opacity change on press
        >
          <View style={styles.tabContent}>
            <Calendar 
              size={20} 
              color={isTabActive('Routine') ? colors.textOnPrimary : colors.textTertiary}
            />
            <Text style={[
              styles.tabText,
              isTabActive('Routine') ? styles.activeTabText : styles.inactiveTabText
            ]}>
              Routine
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Add Button (Absolute positioned) */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleCameraPress}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Index"
        component={IndexScreen}
        options={{
          title: 'Home',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen 
        name="Progress"
        component={ProgressScreen}
        options={{
          title: 'Progress',
        }}
      />
      <Tab.Screen 
        name="Routine"
        component={RoutineScreen}
        options={{
          title: 'Routine',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F1EB',
    borderRadius: 30,
    padding: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 26,
    flex: 1,
    backgroundColor: 'transparent', // Explicitly set transparent background
    opacity: 1, // Ensure no opacity issues
  },
  activeTabButton: {
    backgroundColor: colors.primary,
    opacity: 1, // Ensure full opacity
  },
  centerSpace: {
    width: 60,
  },
  addButton: {
    position: 'absolute',
    top: -28,
    left: '50%',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  addButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textOnPrimary,
    marginTop: -2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.textOnPrimary,
  },
  inactiveTabText: {
    color: colors.textTertiary,
  },
});

export default TabNavigator;
