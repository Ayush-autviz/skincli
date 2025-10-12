/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, {AndroidImportance} from '@notifee/react-native';

messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('📩 Background message:', remoteMessage);
  
    await notifee.displayNotification({
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      android: {
        channelId: 'default',
        pressAction: {id: 'default'},
      },
    });
  });
  
  // Create channel on start
  async function createDefaultChannel() {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });
  }
  createDefaultChannel();

AppRegistry.registerComponent(appName, () => App);
