// name.tsx
// First onboarding screen - create user profile with image and birth date

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Camera, Calendar, User } from 'lucide-react-native';
import { createProfile, getProfile } from '../utils/newApiService';
import useAuthStore from '../stores/authStore';

export default function NameScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [profileImage, setProfileImage] = useState<ImagePicker.Asset | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  
  const { setProfile, setProfileStatus, user } = useAuthStore();

  const handleDateChange = (event: any, selectedDate?: Date): void => {
   // setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) setBirthDate(selectedDate);
  };

  const handleImagePicker = async (): Promise<void> => {
    try {
      // Launch image picker
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
      });

      if (result.assets && result.assets[0]) {
        setProfileImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleNext = async (): Promise<void> => {
    if (!birthDate) {
      setError('Please select your birth date');
      return;
    }

    // Validate birth date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    const selectedDate = new Date(birthDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
      setError('Cannot select future date for birth date');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Format birth date to YYYY-MM-DD
      const formattedDate = birthDate.toISOString().split('T')[0];

      // Create profile data
      const profileData: any = {
        birth_date: formattedDate
      };

      // Add profile image if selected
      if (profileImage) {
        profileData.profile_img = profileImage;
      }

      await createProfile(profileData);
      
      // Set profile status to complete
      setProfileStatus(true);
      
      // Fetch the created profile data
      const profileResult = await getProfile();
      if ((profileResult as any).success) {
        setProfile((profileResult as any).profile);
      }
      
      // Navigate to main app
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'Authenticated' }],
      });
    } catch (err: any) {
      console.error('Profile creation error:', err);
      setError(err.message || 'Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>      
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* Illustration header */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../assets/images/auth.png')}
          style={styles.headerImage}
          resizeMode="cover"
          accessibilityLabel="Onboarding illustration"
        />
      </View>

      <SafeAreaView style={styles.safeAreaBottom}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.formContainer}>         
              {/* Title */}
              <View style={styles.formHeader}>
                <Text style={styles.title}>Create Your Profile</Text>
                <View style={styles.titleUnderline} />
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Profile Image */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Profile Image (Optional)</Text>
                <TouchableOpacity
                  style={styles.imagePickerWrapper}
                  onPress={handleImagePicker}
                >
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage.uri }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Camera size={40} color="#9CA3AF" />
                      <Text style={styles.imagePlaceholderText}>
                        Tap to select photo
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Birth Date */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Birth Date</Text>
                <Text style={styles.labelSubtext}>Enter your real age for the most accurate results.</Text>
                <TouchableOpacity
                  style={styles.dateInputWrapper}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                >
                  <Text style={[styles.dateText, !birthDate && { color: '#9CA3AF' }]}> 
                    {birthDate ? birthDate.toDateString() : 'Select your birth date'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={birthDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date(new Date().getFullYear() - 110, 0, 1)}
                  textColor={Platform.OS === 'ios' ? '#1F2937' : '#FFFFFF'}
                  style={Platform.OS === 'ios' ? { backgroundColor: '#FFFFFF' } : undefined}
                  themeVariant="light"
                />
              )}

              {/* Continue button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleNext}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Creating Profile...' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  imageContainer: { width: '100%', height: 250 },
  headerImage: { width: '100%', height: '100%' },
  safeAreaBottom: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 50,
  },
  formHeader: { marginBottom: 40, alignItems: 'flex-start' },
  title: { fontSize: 32, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  titleUnderline: { width: 60, height: 3, backgroundColor: '#8B7355', borderRadius: 2 },
  errorContainer: {
    marginBottom: 20,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  errorText: { color: '#D73527', fontSize: 14, textAlign: 'center', fontWeight: '500' },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '500', color: '#6B7280', },
  labelSubtext: { fontSize: 13, color: '#8B7355', marginTop: 4 },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#8B7355',
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 4,
    minHeight: 44,
  },
  dateInputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#8B7355',
    paddingVertical: 12,
    marginTop: 6,
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
  },
  primaryButton: {
    backgroundColor: '#8B7355',
    borderRadius: 25,
    paddingVertical: 16,
    marginTop: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  imagePickerWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginVertical: 8,
    overflow: 'hidden',
    marginTop: 12,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    width: '90%',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
});
