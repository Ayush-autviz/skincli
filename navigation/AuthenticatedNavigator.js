import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';

// Import authenticated screens
import TabNavigator from './TabNavigator';
import useAuthStore from '../stores/authStore';

// Import Providers
import { PhotoProvider } from '../contexts/PhotoContext';
import { LiqaProvider, useLiqa } from '../contexts/LiqaContext';

// Import components
import { LiqaWebView } from '../components/LiqaWebView';

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
import NameScreen from '../screens/name';
//import BarcodeScannerScreen from '../screens/barcode-scanner';
import ProductDetailScreen from '../screens/product-detail';
import TrackingReviewScreen from '../screens/tracking-review';
import FindProductScreen from '../screens/find-product';
import AddProductFormScreen from '../screens/add-product-form';
import AddTreatmentFormScreen from '../screens/add-treatment-form';
import SkinCheckScreen from '../screens/skin-check';

const Stack = createNativeStackNavigator();

/**
 * Global LIQA renderer that stays mounted for preloading.
 * Rendered behind the stack screens.
 */
const GlobalLiqa = () => {
  const { isLiqaVisible, onLiqaEvent } = useLiqa();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return null;

  return (
    <View
      pointerEvents={isLiqaVisible ? 'auto' : 'none'}
      style={[
        styles.liqaContainer,
        isLiqaVisible ? styles.liqaVisible : styles.liqaHidden,
      ]}
    >
      <LiqaWebView
        onLiqaEvent={(name, payload) => {
          if (onLiqaEvent) {
            onLiqaEvent(name, payload);
          }
        }}
      />
    </View>
  );
};

function AuthenticatedNavigator() {
  const { isAuthenticated, user, profileStatus } = useAuthStore();
  const navigation = useNavigation();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Redirect to sign in if not authenticated
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    }
  }, [isAuthenticated, user, navigation, profileStatus]);

  // Check if profile is incomplete (profile_status is false)
  const isProfileIncomplete = profileStatus === false;

  return (
    <LiqaProvider>
      <PhotoProvider>
        <View style={{ flex: 1, backgroundColor: 'white' }}>
          {/* Always mount the preloader behind the stack */}
          {!isProfileIncomplete && <GlobalLiqa />}

          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              gestureEnabled: true,
              // Note: Most screens have their own background color, 
              // but CameraScreen will be transparent to show the LIQA WebView below it.
              contentStyle: { backgroundColor: 'transparent' }
            }}
          >
            {isProfileIncomplete ? (
              /* Profile Setup Flow - for users with incomplete profiles */
              <Stack.Screen
                name="Name"
                component={NameScreen}
                options={{
                  animation: 'fade',
                  headerShown: false,
                }}
              />
            ) : (
              /* Main App Flow - for users with complete profiles */
              <>
                {/* Tab Navigation - Main navigation with bottom tabs */}
                <Stack.Screen
                  name="Tabs"
                  component={TabNavigator}
                  options={{
                    animation: 'fade',
                    headerShown: false,
                  }}
                />

                {/* New screens - only available for users with complete profiles */}
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
                    headerShown: false,
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

                <Stack.Screen
                  name="ProductDetail"
                  component={ProductDetailScreen}
                  options={{
                    animation: 'slide_from_right',
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="TrackingReview"
                  component={TrackingReviewScreen}
                  options={{
                    animation: 'slide_from_right',
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="AddProductForm"
                  component={AddProductFormScreen}
                  options={{
                    animation: 'slide_from_right',
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="AddTreatmentForm"
                  component={AddTreatmentFormScreen}
                  options={{
                    animation: 'slide_from_right',
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="FindProduct"
                  component={FindProductScreen}
                  options={{
                    animation: 'slide_from_right',
                    headerShown: false,
                  }}
                />

                <Stack.Screen
                  name="SkinCheck"
                  component={SkinCheckScreen}
                  options={{
                    animation: 'slide_from_right',
                    headerShown: false,
                  }}
                />
              </>
            )}
          </Stack.Navigator>
        </View>
      </PhotoProvider>
    </LiqaProvider>
  );
}

const styles = StyleSheet.create({
  liqaContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    backgroundColor: 'black',
  },
  liqaVisible: {
    opacity: 1,
    transform: [{ translateX: 0 }],
  },
  liqaHidden: {
    opacity: 0,
    transform: [{ translateX: 10000 }],
  },
});

export default AuthenticatedNavigator;
