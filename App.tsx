/**
 * Magic Mirror App
 * React Native CLI version
 */

import React, { useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  Platform,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import useAuthStore from './stores/authStore';
import { registerFCMToken } from './utils/newApiService';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const { isAuthenticated, accessToken, fcmToken, fcmTokenRegistered } =
    useAuthStore();

  useEffect(() => {
    setupNotifications();

    // Listen for FCM token refresh
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(
      async newToken => {
        console.log('🔄 FCM Token refreshed:', newToken);
        useAuthStore.getState().setFCMToken(newToken);
      },
    );

    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('🔥 Foreground message:', remoteMessage);

      await notifee.displayNotification({
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        android: {
          channelId: 'default',
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
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

  async function setupNotifications() {
    try {
      // Create Android notification channel first
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'default',
          name: 'Default Channel',
          importance: AndroidImportance.HIGH,
        });

        // On Android 13+ (API 33), request POST_NOTIFICATIONS permission
        const androidVersion = Platform.Version as number;
        if (androidVersion >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('❌ Android POST_NOTIFICATIONS denied');
            useAuthStore.getState().setFCMToken(null);
            return;
          }
          console.log('✅ Android POST_NOTIFICATIONS granted');
        }
      }

      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('❌ iOS notification permission denied');
          useAuthStore.getState().setFCMToken(null);
          return;
        }

        await messaging().registerDeviceForRemoteMessages();
        console.log('✅ Notification permission granted (iOS)');
      }

      // Get FCM token - retry on Android if Play Services not immediately ready
      let token = null;
      if (Platform.OS === 'android') {
        // On Android, getToken can fail if Play Services isn't connected yet
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            token = await messaging().getToken();
            break;
          } catch (tokenError) {
            console.warn(
              `⚠️ getToken attempt ${attempt + 1} failed, retrying...`,
              tokenError,
            );
            await new Promise<void>(resolve => setTimeout(resolve, 2000));
          }
        }
      } else {
        token = await messaging().getToken();
      }

      if (token) {
        console.log('📱 FCM Token:', token);
        useAuthStore.getState().setFCMToken(token);
      } else {
        console.log('❌ Failed to get FCM token after retries');
        useAuthStore.getState().setFCMToken(null);
      }

      if (Platform.OS === 'ios' && token) {
        const apnsToken = await messaging().getAPNSToken();
        console.log('🍏 APNs Token:', apnsToken);
      }
    } catch (error) {
      console.error('🔴 Error requesting notification permission:', error);
      useAuthStore.getState().setFCMToken(null);
    }
  }

  // Effect to handle FCM token registration when user logs in or token refreshes
  useEffect(() => {
    if (isAuthenticated && accessToken && fcmToken && !fcmTokenRegistered) {
      console.log('🔵 User logged in, registering FCM token...');
      registerFCMToken(fcmToken)
        .then(() => {
          console.log('✅ FCM token registered successfully');
          useAuthStore.getState().setFCMTokenRegistered(true);
        })
        .catch(error => {
          console.error('🔴 Failed to register FCM token:', error);
        });
    }
  }, [isAuthenticated, accessToken, fcmToken, fcmTokenRegistered]);

  // Effect to handle FCM token refresh registration
  useEffect(() => {
    if (isAuthenticated && accessToken && fcmToken && fcmTokenRegistered) {
      console.log('🔄 FCM token refreshed while logged in, re-registering...');
      registerFCMToken(fcmToken)
        .then(() => {
          console.log('✅ FCM token re-registered successfully after refresh');
        })
        .catch(error => {
          console.error(
            '🔴 Failed to re-register FCM token after refresh:',
            error,
          );
        });
    }
  }, [fcmToken]);

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
