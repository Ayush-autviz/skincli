import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

// Import authenticated screens
import TabNavigator from './TabNavigator';
import useAuthStore from '../stores/authStore';

// Import PhotoProvider
import { PhotoProvider } from '../contexts/PhotoContext';

// Import new screens
import ArchivedRoutines from '../screens/archived-routines';
import MetricDetailScreen from '../screens/metricDetail';
import ThreadChatScreen from '../screens/threadChat';
import UpdateRoutineScreen from '../screens/update-routine';
import CreateRoutineScreen from '../screens/create-routine';
import CameraScreen from '../screens/camera';
import MaskViewerScreen from '../screens/maskViewer';
import ProfileScreen from '../screens/profile';
import SnapshotScreen from '../screens/snapshot';

// Import auth store

const Stack = createNativeStackNavigator();

function AuthenticatedNavigator() {
  const { isAuthenticated, user } = useAuthStore();
  const navigation = useNavigation();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Redirect to sign in if not authenticated
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    }
  }, [isAuthenticated, user, navigation]);

  return (
    <PhotoProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      >
        {/* Tab Navigation - Main navigation with bottom tabs */}
        <Stack.Screen 
          name="Tabs"
          component={TabNavigator}
          options={{
            animation: 'fade',
            headerShown: false,
          }}
        />
        
        {/* New screens */}
        <Stack.Screen 
          name="ArchivedRoutines"
          component={ArchivedRoutines}
          options={{
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />

        <Stack.Screen 
          name="MetricDetail"
          component={MetricDetailScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
        

        
        <Stack.Screen 
          name="ThreadChat"
          component={ThreadChatScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
        
        <Stack.Screen 
          name="UpdateRoutine"
          component={UpdateRoutineScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
        
        <Stack.Screen 
          name="CreateRoutine"
          component={CreateRoutineScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
        
        <Stack.Screen 
          name="Camera"
          component={CameraScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
        
        <Stack.Screen 
          name="MaskViewer"
          component={MaskViewerScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
        
        <Stack.Screen 
          name="profile"
          component={ProfileScreen}
          options={{
            headerShown: false
          }}
        />
        
        <Stack.Screen 
          name="Snapshot"
          component={SnapshotScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </PhotoProvider>
  );
}

export default AuthenticatedNavigator;
