import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
//import { GestureHandlerRootView } from 'react-native-gesture-handler';


// Import navigators

import OnboardingNavigator from './OnboardingNavigator';
import AuthNavigator from './AuthNavigator';
import AuthenticatedNavigator from './AuthenticatedNavigator';

// Import auth store
import useAuthStore from '../stores/authStore';
import { Text, View } from 'react-native';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { isAuthenticated, user } = useAuthStore();

  return (

            <NavigationContainer>
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                }}
              >
                {!isAuthenticated || !user ? (
                  <>
                    <Stack.Screen 
                      name="Auth" 
                      component={AuthNavigator}
                      options={{
                        animation: 'fade',
                      }}
                    />
                    <Stack.Screen 
                      name="Onboarding" 
                      component={OnboardingNavigator}
                      options={{
                        animation: 'fade',
                      }}
                    />
                  </>
                ) : (
                  <Stack.Screen 
                    name="Authenticated" 
                    component={AuthenticatedNavigator}
                    options={{
                      animation: 'fade',
                    }}
                  />
                )}
              </Stack.Navigator>
            </NavigationContainer>
  );
}

export default AppNavigator;
