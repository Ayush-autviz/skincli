import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import auth screens
import SignInScreen from '../screens/sign-in';
import SignUpScreen from '../screens/sign-up';
import ForgotPasswordScreen from '../screens/forgot-password';
import VerifyOTPScreen from '../screens/verify-otp';
import NewPasswordScreen from '../screens/new-password';

const Stack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen 
        name="SignIn" 
        component={SignInScreen}
        options={{
          animation: 'slide_from_left'
        }}
      />
      <Stack.Screen 
        name="SignUp"
        component={SignUpScreen}
        options={{
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen 
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen 
        name="VerifyOTP"
        component={VerifyOTPScreen}
        options={{
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen 
        name="NewPassword"
        component={NewPasswordScreen}
        options={{
          animation: 'slide_from_right'
        }}
      />
    </Stack.Navigator>
  );
}

export default AuthNavigator;
