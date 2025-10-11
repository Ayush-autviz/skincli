import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import onboarding screens
import NameScreen from '../screens/name';
//import WelcomeScreen from '../screens/welcome';

const Stack = createNativeStackNavigator();

function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Name" component={NameScreen} />
      {/* <Stack.Screen name="Welcome" component={WelcomeScreen} /> */}
    </Stack.Navigator>
  );
}

export default OnboardingNavigator;
