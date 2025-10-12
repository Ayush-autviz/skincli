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


function App() {
  const isDarkMode = useColorScheme() === 'dark';
  useEffect(() => {
    requestPermissionAndToken();
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

    return unsubscribe;
  }, []);

  async function requestPermissionAndToken() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('✅ Notification permission granted');
      const token = await messaging().getToken();
      console.log('📱 FCM Token:', token);

      if (Platform.OS === 'ios') {
        const apnsToken = await messaging().getAPNSToken();
        console.log('🍏 APNs Token:', apnsToken);
      }
    } else {
      Alert.alert('Notifications Disabled', 'Enable them from Settings');
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
