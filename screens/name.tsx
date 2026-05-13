// name.tsx
// First onboarding screen - create user profile with image and birth date

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Camera, Calendar, User, ChevronLeft } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { createProfile, getProfile } from '../utils/newApiService';
import useAuthStore from '../stores/authStore';

export default function NameScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [profileImage, setProfileImage] = useState<ImagePicker.Asset | null>(
    null,
  );
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const { setProfile, setProfileStatus, user } = useAuthStore();

  const handleDateChange = (event: any, selectedDate?: Date): void => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleImagePicker = async (): Promise<void> => {
    try {
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(birthDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      setError('Cannot select future date for birth date');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const d = birthDate;
      const formattedDate = `${d.getFullYear()}-${String(
        d.getMonth() + 1,
      ).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const profileData: any = {
        birth_date: formattedDate,
      };

      if (profileImage) {
        profileData.profile_img = profileImage;
      }

      await createProfile(profileData);
      setProfileStatus(true);

      const profileResult = await getProfile();
      if ((profileResult as any).success) {
        setProfile((profileResult as any).profile);
      }

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

  const magicIcon = `
<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
<mask id="mask0_18813_20448" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="80" height="80">
<circle cx="40" cy="40" r="40" fill="white"/>
</mask>
<g mask="url(#mask0_18813_20448)">
<mask id="mask1_18813_20448" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="2" y="38" width="79" height="34">
<rect x="2.47915" y="38.8075" width="77.7489" height="31.8929" fill="#D9D9D9" stroke="#0498B3" stroke-width="0.798147"/>
</mask>
<g mask="url(#mask1_18813_20448)">
<circle cx="39.7669" cy="37.9678" r="29.023" stroke="#0498B3" stroke-width="3.99074"/>
</g>
<circle cx="39.7641" cy="37.9687" r="22.9482" stroke="#0498B3" stroke-width="3.99074"/>
<line x1="63.6411" y1="38.3703" x2="69.6982" y2="38.3703" stroke="#0498B3" stroke-width="3.99074" stroke-linecap="round"/>
<line x1="9.22364" y1="38.3703" x2="15.731" y2="38.3703" stroke="#0498B3" stroke-width="3.99074" stroke-linecap="round"/>
<line x1="40.2893" y1="66.8212" x2="40.2893" y2="82.8351" stroke="#0498B3" stroke-width="3.99074"/>
<line x1="40.5586" y1="74.2447" x2="40.5586" y2="80.1182" stroke="#0498B3" stroke-width="7.98147" stroke-linecap="round"/>
</g>
</svg>
`;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        enableResetScrollToCoords={false}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <SvgXml xml={magicIcon} width={100} height={100} />
            </View>
            <Text style={styles.welcomeBack}>Create Your Profile</Text>
            <Text style={styles.subText}>Tell us a bit about yourself.</Text>
          </View>

          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Profile Image */}
            <View style={styles.imagePickerSection}>
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
                    <Camera size={32} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.addIconBadge}>
                  <Text style={styles.addIconText}>+</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.imagePickerLabel}>
                Profile Image (Optional)
              </Text>
            </View>

            {/* Birth Date */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Birth Date</Text>
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Calendar size={20} color="#9CA3AF" style={styles.inputIcon} />
                <Text
                  style={[styles.dateText, !birthDate && { color: '#9CA3AF' }]}
                >
                  {birthDate
                    ? birthDate.toDateString()
                    : 'Select your birth date'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.labelSubtext}>
                Enter your real age for the most accurate results.
              </Text>
            </View>

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={birthDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(new Date().getFullYear() - 110, 0, 1)}
                  textColor="#1F2937"
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                loading && styles.primaryButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Creating Profile...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  safeArea: {
    flex: 1,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
    marginBottom: 40,
  },
  welcomeBack: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '400',
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 24,
    marginTop: 10,
  },
  errorContainer: {
    marginBottom: 20,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  imagePickerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  imagePickerWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  addIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#08879b',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: -2,
  },
  imagePickerLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
  },
  labelSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 24,
    overflow: 'hidden',
  },
  primaryButton: {
    backgroundColor: '#08879b',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
