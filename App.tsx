/**
 * Magic Mirror App
 * React Native CLI version
 */

import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import {View, Text, Platform, Alert} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import useAuthStore from './stores/authStore';
import { registerFCMToken } from './utils/newApiService';


function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const { isAuthenticated, accessToken, fcmToken, fcmTokenRegistered } = useAuthStore();

  useEffect(() => {
    // Initial FCM setup
    requestPermissionAndToken();

    // Listen for FCM token refresh
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
      console.log('🔄 FCM Token refreshed:', newToken);
      // Update token in store
      useAuthStore.getState().setFCMToken(newToken);
    });

    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('🔥 Foreground message:', remoteMessage);

      // Display native notification while app is open
      await notifee.displayNotification({
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        android: {
          channelId: 'default',
          importance: 4, // High
          pressAction: {id: 'default'},
        },
        ios: {
          sound: 'default',
        },
      });
    });

    return () => {
      unsubscribe();
      unsubscribeTokenRefresh();
    };
  }, []);
  //registerFCMToken("d3WE4ql-g0s1gjpzbkN1A5:APA91bE5BBmKcKIaY9xTw3IIGzITk-gahrUdnEyaLutAXvY0FVvdNpIvB3q0DV5uSeGJOpzmIUubvUY-1KKr-yYRLhQFgAHXEDkR_t7rYVq7uPD4uuup480")

  // Effect to handle FCM token registration when user logs in or token refreshes
  useEffect(() => {
    if (isAuthenticated && accessToken && fcmToken && !fcmTokenRegistered) {
      console.log('🔵 User logged in, registering FCM token...');
      registerFCMToken(fcmToken)
        .then(() => {
          console.log('✅ FCM token registered successfully');
          useAuthStore.getState().setFCMTokenRegistered(true);
        })
        .catch((error) => {
          console.error('🔴 Failed to register FCM token:', error);
        });
    }
  }, [isAuthenticated, accessToken, fcmToken, fcmTokenRegistered]);

  // Effect to handle FCM token refresh registration
  useEffect(() => {
    if (isAuthenticated && accessToken && fcmToken && fcmTokenRegistered) {
      // If token was refreshed while user was logged in, re-register it
      console.log('🔄 FCM token refreshed while logged in, re-registering...');
      registerFCMToken(fcmToken)
        .then(() => {
          console.log('✅ FCM token re-registered successfully after refresh');
        })
        .catch((error) => {
          console.error('🔴 Failed to re-register FCM token after refresh:', error);
        });
    }
  }, [fcmToken]); // Only trigger when fcmToken changes

  async function requestPermissionAndToken() {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Notification permission granted');
        await messaging().registerDeviceForRemoteMessages();
        const token = await messaging().getToken();
        console.log('📱 FCM Token:', token);

        // Store FCM token in auth store
        useAuthStore.getState().setFCMToken(token);

        if (Platform.OS === 'ios') {
          const apnsToken = await messaging().getAPNSToken();
          console.log('🍏 APNs Token:', apnsToken);
        }
      } else {
        console.log('❌ Notifications permission denied');
        // Clear any existing FCM token if permission is denied
        useAuthStore.getState().setFCMToken(null);
      }
    } catch (error) {
      console.error('🔴 Error requesting notification permission:', error);
      // Clear FCM token on error
      useAuthStore.getState().setFCMToken(null);
    }
  }

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
