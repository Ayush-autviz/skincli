import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors, spacing } from '../styles';

// Import tab screens
import IndexScreen from '../screens/index';
import HomeScreen from '../screens/home';
import ProgressScreen from '../screens/progress';
import RoutineScreen from '../screens/routine';
import AboutMeScreen from '../screens/about-me';

const Tab = createBottomTabNavigator();

// SVG Icons with color parameter
const getHomeSvg = (color) => `<svg width="32" height="32" viewBox="0 0 34 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20.6468 28V17.3333C20.6468 16.9797 20.5018 16.6406 20.2437 16.3905C19.9855 16.1405 19.6354 16 19.2704 16H13.7646C13.3995 16 13.0494 16.1405 12.7913 16.3905C12.5331 16.6406 12.3881 16.9797 12.3881 17.3333V28M4.12939 13.3333C4.1293 12.9454 4.21657 12.5622 4.38512 12.2103C4.55367 11.8584 4.79945 11.5464 5.1053 11.296L14.7405 3.29599C15.2373 2.8892 15.8669 2.66602 16.5175 2.66602C17.168 2.66602 17.7976 2.8892 18.2945 3.29599L27.9296 11.296C28.2355 11.5464 28.4812 11.8584 28.6498 12.2103C28.8183 12.5622 28.9056 12.9454 28.9055 13.3333V25.3333C28.9055 26.0406 28.6155 26.7188 28.0992 27.2189C27.5829 27.719 26.8827 28 26.1526 28H6.8823C6.15218 28 5.45197 27.719 4.9357 27.2189C4.41943 26.7188 4.12939 26.0406 4.12939 25.3333V13.3333Z" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const getRoutineSvg = (color) => `<svg width="32" height="32" viewBox="0 0 34 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16.6233 6.04788C14.7973 5.2628 12.7754 5.0078 10.8028 5.31381C8.83016 5.61981 6.99158 6.47368 5.51002 7.77184C4.02845 9.07 2.96756 10.7567 2.456 12.6273C1.94445 14.498 2.00421 16.4722 2.62804 18.3106C3.25187 20.1491 4.41296 21.7726 5.97051 22.9845C7.52805 24.1963 9.41512 24.9444 11.4029 25.1379" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.229 9.51074V15.5107L9.09965 17.5107" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M23.5243 5.18799V8.25806M21.0808 5.18799H25.9678C26.3381 5.18799 26.6932 5.34971 26.9551 5.63759M21.7789 11.3281V9.02557C21.7789 8.82202 21.8525 8.62679 21.9834 8.48286C22.1143 8.33892 22.2919 8.25806 22.4771 8.25806H24.5715C24.7566 8.25806 24.9342 8.33892 25.0651 8.48286C25.1961 8.62679 25.2696 8.82202 25.2696 9.02557V11.3281" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M17.1533 17.7894C17.1533 14.2021 20.0614 11.2939 23.6488 11.2939V11.2939C27.2361 11.2939 30.1442 14.2021 30.1442 17.7894V26.5264H17.1533V17.7894Z" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
<path d="M17.7407 17.6475H21.8454V22.5074H17.2847" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const getScanSvg = (color) => `<svg width="34" height="33" viewBox="0 0 34 33" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_18967_10472)">
<path d="M4 9.60872V6.94206C4 6.23481 4.28095 5.55654 4.78105 5.05644C5.28115 4.55634 5.95942 4.27539 6.66667 4.27539H9.33333M22.6667 4.27539H25.3333C26.0406 4.27539 26.7189 4.55634 27.219 5.05644C27.719 5.55654 28 6.23481 28 6.94206V9.60872M28 22.9421V25.6087C28 26.316 27.719 26.9942 27.219 27.4943C26.7189 27.9944 26.0406 28.2754 25.3333 28.2754H22.6667M9.33333 28.2754H6.66667C5.95942 28.2754 5.28115 27.9944 4.78105 27.4943C4.28095 26.9942 4 26.316 4 25.6087V22.9421" stroke="#79716B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M4.45166 17.9941H27.3003" stroke="#79716B" stroke-width="2" stroke-linecap="round"/>
<path d="M4.45166 17.9941H27.3003" stroke="#79716B" stroke-width="2" stroke-linecap="round"/>
<mask id="mask0_18967_10472" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="6" y="0" width="19" height="16">
<rect x="6.98828" y="0.275391" width="17.6133" height="15.6943" fill="#D92F2F"/>
</mask>
<g mask="url(#mask0_18967_10472)">
<path d="M15.7227 4.94507C12.2058 4.94507 10.5937 8.08505 10.2273 9.42383V12.051C9.5979 12.6206 9.26836 14.1822 10.2273 15.3012" stroke="#79716B" stroke-width="2" stroke-linecap="round"/>
<path d="M15.7241 4.94482C19.241 4.94482 20.853 8.08481 21.2194 9.42358V12.0508C21.8488 12.6203 22.1783 14.182 21.2194 15.3009" stroke="#79716B" stroke-width="2" stroke-linecap="round"/>
</g>
<path d="M11.4316 18.5096C11.8963 19.1821 12.9498 20.6302 13.4459 21.0424C14.0659 21.5578 15.1119 22.3305 15.8868 22.3305M12.8977 20.4619C12.9622 21.3778 12.5162 23.8777 12.3353 24.6261C12.2253 25.0809 12.0165 25.501 11.7566 25.8874" stroke="#79716B" stroke-width="2" stroke-linecap="round"/>
<path d="M20.34 18.5098C19.8753 19.1823 18.8218 20.6303 18.3257 21.0426C17.7057 21.5579 16.6597 22.3307 15.8848 22.3307M18.8739 20.4621C18.8094 21.378 19.2554 23.8778 19.4363 24.6263C19.5463 25.081 19.7551 25.5012 20.015 25.8875" stroke="#79716B" stroke-width="2" stroke-linecap="round"/>
</g>
<defs>
<clipPath id="clip0_18967_10472">
<rect width="32" height="32" fill="white" transform="translate(0 0.275391)"/>
</clipPath>
</defs>
</svg>`;

const getTrendsSvg = (color) => `<svg width="32" height="32" viewBox="0 0 34 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.12939 4V25.3333C4.12939 26.0406 4.41943 26.7189 4.9357 27.219C5.45197 27.719 6.15218 28 6.8823 28H28.9055M26.1526 12L19.2704 18.6667L13.7646 13.3333L9.6352 17.3333" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const getProfileSvg = (color) => `<svg width="32" height="32" viewBox="0 0 34 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M24.7761 26.6667C24.7761 24.5449 23.906 22.5101 22.3572 21.0098C20.8084 19.5095 18.7078 18.6667 16.5174 18.6667M16.5174 18.6667C14.3271 18.6667 12.2265 19.5095 10.6777 21.0098C9.12884 22.5101 8.25873 24.5449 8.25873 26.6667M16.5174 18.6667C19.5582 18.6667 22.0232 16.2788 22.0232 13.3333C22.0232 10.3878 19.5582 7.99999 16.5174 7.99999C13.4767 7.99999 11.0116 10.3878 11.0116 13.3333C11.0116 16.2788 13.4767 18.6667 16.5174 18.6667ZM30.2819 16C30.2819 23.3638 24.1194 29.3333 16.5174 29.3333C8.91551 29.3333 2.75293 23.3638 2.75293 16C2.75293 8.63619 8.91551 2.66666 16.5174 2.66666C24.1194 2.66666 30.2819 8.63619 30.2819 16Z" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Tab icon component
const TabIcon = ({ svgGetter, focused }) => {
  const color = focused ? colors.tabSelected : colors.tabUnselected;
  return <SvgXml xml={svgGetter(color)} />;
};

// Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              // Handle Scan tab specially - navigate to Camera
              if (route.name === 'Scan') {
                navigation.navigate('Camera', { fromScanTab: true });
              } else {
                navigation.navigate(route.name);
              }
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Get the SVG getter for each tab
          let svgGetter;
          switch (route.name) {
            case 'Home':
              svgGetter = getHomeSvg;
              break;
            case 'MyRoutine':
              svgGetter = getRoutineSvg;
              break;
            case 'Scan':
              svgGetter = getScanSvg;
              break;
            case 'Progress':
              svgGetter = getTrendsSvg;
              break;
            case 'AboutMe':
              svgGetter = getProfileSvg;
              break;
            default:
              svgGetter = getHomeSvg;
          }

          const color = isFocused ? colors.tabSelected : colors.tabUnselected;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <TabIcon svgGetter={svgGetter} focused={isFocused} />
              <Text style={[styles.tabLabel, { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="MyRoutine"
        component={RoutineScreen}
        options={{
          tabBarLabel: 'My Routine',
        }}
      />
      <Tab.Screen
        name="Scan"
        component={IndexScreen}
        options={{
          tabBarLabel: 'Scan',
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: 'Progress',
        }}
      />
      <Tab.Screen
        name="AboutMe"
        component={AboutMeScreen}
        options={{
          tabBarLabel: 'About Me',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default TabNavigator;
