// BottomNav.js
// Bottom navigation bar with rounded pill design

/* ------------------------------------------------------
WHAT IT DOES
- Displays rounded pill-shaped navigation with 3 sections
- Shows Progress, Add button, and Routine
- Highlights active tab with dark background
- Center button handles camera/add actions

DATA USED
- onCameraPress: Function to handle camera button press
- currentRoute: To determine active tab

DEV PRINCIPLES
- Uses vanilla JavaScript
- Follows app-wide styling guidelines
- Modern rounded pill design
------------------------------------------------------*/

import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../../styles';
import { router, usePathname } from 'expo-router';

export default function BottomNav({ onCameraPress }) {
  const pathname = usePathname();
  
  // Determine active tab based on current route
  const getActiveTab = () => {
    if (pathname === '/(authenticated)/progress') {
      return 'progress';
    } else if (pathname === '/(authenticated)/routine') {
      return 'routine';
    }
    return null; // No active tab for center button or other routes
  };

  const activeTab = getActiveTab();

  const handleTabPress = (tab) => {
    switch (tab) {
      case 'progress':
        router.push('/(authenticated)/progress');
        break;
      case 'routine':
        router.push('/(authenticated)/routine');
        break;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.pillContainer}>
        {/* Progress Tab */}
        <TouchableOpacity 
          style={[
            styles.tabButton,
            activeTab === 'progress' && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('progress')}
        >
          <View style={styles.tabContent}>
            <Feather 
              name="trending-up"
              size={20} 
              color={activeTab === 'progress' ? colors.textOnPrimary : colors.textTertiary}
            />
            <Text style={[
              styles.tabText,
              activeTab === 'progress' ? styles.activeTabText : styles.inactiveTabText
            ]}>
              Progress
            </Text>
            {activeTab === 'progress' && <View style={styles.tabUnderline} />}
          </View>
        </TouchableOpacity>

        {/* Empty space for center button */}
        <View style={styles.centerSpace} />

        {/* Routine Tab */}
        <TouchableOpacity 
          style={[
            styles.tabButton,
            activeTab === 'routine' && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('routine')}
        >
          <View style={styles.tabContent}>
            <Feather 
              name="calendar"
              size={20} 
              color={activeTab === 'routine' ? colors.textOnPrimary : colors.textTertiary}
            />
            <Text style={[
              styles.tabText,
              activeTab === 'routine' ? styles.activeTabText : styles.inactiveTabText
            ]}>
              Routine
            </Text>
            {activeTab === 'routine' && <View style={styles.tabUnderline} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* Add Button (Absolute positioned) */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={onCameraPress}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
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
    backgroundColor: '#F5F1EB', // Cream/beige background
    borderRadius: 30,
    padding: 4,
    alignItems: 'center',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    // Android shadow
    elevation: 6,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 26,
    flex: 1,
  },
  activeTabButton: {
    backgroundColor: colors.primary, // #8B7355
  },
  centerSpace: {
    width: 60,
  },
  addButton: {
    position: 'absolute',
    top: -28,
    left: '50%',
   // marginLeft: -0, // Half of button width (56/2)
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    // Android shadow
    elevation: 8,
  },
  addButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textOnPrimary,
    marginTop: -2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.textOnPrimary, // White text on active tab
  },
  inactiveTabText: {
    color: colors.textTertiary, // Gray text on inactive tabs
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 2,
    backgroundColor: colors.textOnPrimary,
    borderRadius: 1,
  },
}); 
