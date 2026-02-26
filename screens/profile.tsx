// profile.tsx
// User profile edit screen with professional stacked layout

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontFamily } from '../styles';
import { Image as ImageIcon, ChevronLeft, User, Mail, Calendar } from 'lucide-react-native';
import { getProfile, updateProfile } from '../utils/newApiService';
import useAuthStore from '../stores/authStore';

// Type definitions
interface ProfileData {
  user_name?: string;
  birth_date?: string | Date;
  profile_img?: string | null;
  created_at?: string | Date;
  [key: string]: any;
}

interface EditForm {
  user_name: string;
  birth_date: Date | null;
  profile_img: string | null;
}

export default function Profile(): React.JSX.Element {
  const { user, profile, setProfile } = useAuthStore();
  const navigation = useNavigation();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const [editForm, setEditForm] = useState<EditForm>({
    user_name: (profile as any)?.user_name || (user as any)?.user_name || '',
    birth_date: (profile as any)?.birth_date ? new Date((profile as any).birth_date) : null,
    profile_img: null
  });

  // Fetch profile data
  const fetchProfile = async (): Promise<void> => {
    try {
      setIsProfileLoading(true);
      const res: any = await getProfile();
      if (res.success) {
        setProfile(res.profile!);
      }
    } catch (err: any) {
      // console.error('🔴 Profile fetch error:', err);
      setError(err?.message || 'Failed to load profile');
    } finally {
      setIsProfileLoading(false);
    }
  };

  // Update profile data
  const updateProfileData = async (data: any): Promise<void> => {
    try {
      setIsUpdating(true);
      setError('');

      await updateProfile(data);
      await fetchProfile();

      setSuccess('Profile updated successfully');
      setTimeout(() => {
        setSuccess('');
        navigation.goBack();
      }, 1500);
    } catch (err: any) {
      // console.error('🔴 Profile update error:', err);
      setError(err?.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  // Load profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Keep edit form in sync when profile data arrives/changes
  useEffect(() => {
    setEditForm({
      user_name: (profile as any)?.user_name || (user as any)?.user_name || '',
      birth_date: (profile as any)?.birth_date ? new Date((profile as any).birth_date) : null,
      profile_img: null,
    });
  }, [profile, user]);

  const formatBirthDate = (date: Date | null): string => {
    if (!date) return 'Select birth date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleImagePicker = async (): Promise<void> => {
    try {
      const options = {
        mediaType: 'photo' as MediaType,
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
        quality: 1 as any,
      };

      launchImageLibrary(options, (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorMessage) {
          return;
        }

        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setEditForm(prev => ({
            ...prev,
            profile_img: asset.uri || null
          }));
        }
      });
    } catch (err: any) {
      // console.error('🔴 Image picker error:', err);
    }
  };

  const handleSave = () => {
    if (!editForm.user_name.trim()) {
      setError('Please enter your name');
      return;
    }

    // Validate birth date is not in the future
    if (editForm.birth_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(editForm.birth_date);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        setError('Cannot select future date for birth date');
        return;
      }
    }

    setError('');

    const updateData: any = {};

    // Add name if changed
    if (editForm.user_name.trim() !== ((profile as any)?.user_name || (user as any)?.user_name)) {
      updateData.user_name = editForm.user_name.trim();
    }

    // Add birth date if changed
    if (editForm.birth_date) {
      const formattedDate = editForm.birth_date.toISOString().split('T')[0];
      updateData.birth_date = formattedDate;
    }

    // Add profile image if selected
    if (editForm.profile_img) {
      updateData.profile_img = editForm.profile_img;
    }

    if (Object.keys(updateData).length === 0) {
      navigation.goBack();
      return;
    }

    updateProfileData(updateData);
  };

  const handleDateChange = (event: any, selectedDate: any) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setEditForm(prev => ({ ...prev, birth_date: selectedDate }));
    }
  };

  const currentProfileImage = editForm.profile_img || (profile as any)?.profile_img;



  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <View style={styles.iconContainer}>
              <ChevronLeft size={30} color="#44403C" />
            </View>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Edit Profile</Text>
          </View>
          <View style={styles.rightContainer} />
        </View>
        <View style={styles.shadowLine} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        {/* Success message */}
        {success ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        {/* Error message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Photo Upload Section */}
        <TouchableOpacity
          style={styles.photoUploadContainer}
          onPress={handleImagePicker}
          activeOpacity={0.7}
          disabled={isProfileLoading}
        >
          {isProfileLoading ? (
            <SkeletonPlaceholder borderRadius={60}>
              <SkeletonPlaceholder.Item width={120} height={120} borderRadius={60} />
            </SkeletonPlaceholder>
          ) : currentProfileImage ? (
            <Image
              source={{ uri: currentProfileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <User size={50} color="#0498B3" />
            </View>
          )}
          {/* <Text style={styles.photoUploadText}>Photo Upload +</Text> */}
        </TouchableOpacity>

        {/* Input Fields */}
        <View style={styles.inputsContainer}>
          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <View style={styles.inputWrapper}>
              <User size={20} color="#9CA3AF" style={styles.inputIcon} />
              {isProfileLoading ? (
                <SkeletonPlaceholder borderRadius={4}>
                  <SkeletonPlaceholder.Item width={200} height={20} />
                </SkeletonPlaceholder>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  value={editForm.user_name}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, user_name: text }))}
                  autoCapitalize="words"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            </View>
          </View>

          {/* Email Input (Read-only) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email ID</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
              {isProfileLoading ? (
                <SkeletonPlaceholder borderRadius={4}>
                  <SkeletonPlaceholder.Item width={250} height={20} />
                </SkeletonPlaceholder>
              ) : (
                <Text style={styles.readOnlyInput}>{user?.email || 'Not set'}</Text>
              )}
            </View>
          </View>

          {/* Birth Date Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Birth Date</Text>
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => !isProfileLoading && setShowDatePicker(!showDatePicker)}
              activeOpacity={0.7}
              disabled={isProfileLoading}
            >
              <Calendar size={20} color="#9CA3AF" style={styles.inputIcon} />
              {isProfileLoading ? (
                <SkeletonPlaceholder borderRadius={4}>
                  <SkeletonPlaceholder.Item width={150} height={20} />
                </SkeletonPlaceholder>
              ) : (
                <Text style={[
                  styles.inputText,
                  !editForm.birth_date && styles.placeholderText
                ]}>
                  {formatBirthDate(editForm.birth_date)}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={editForm.birth_date || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(new Date().getFullYear() - 110, 0, 1)}
              textColor="#1C1917"
              style={Platform.OS === 'ios' ? styles.datePickerIOS : undefined}
              themeVariant="light"
            />
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </KeyboardAwareScrollView>

      {/* Save Button - Fixed at bottom */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, (isUpdating || isProfileLoading) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isUpdating || isProfileLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {isUpdating || isProfileLoading ? 'Loading...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: 105,
    backgroundColor: colors.background,
    borderBottomWidth: 0.4,
    justifyContent: 'flex-end',
    borderBottomColor: '#E5E5E5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingBottom: 10,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rightContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadowLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },

  // Messages
  successContainer: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    // fontWeight: '500',
    fontFamily: fontFamily.medium,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    // fontWeight: '500',
    fontFamily: fontFamily.medium,
  },

  // Photo Upload
  photoUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: 14,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  photoUploadText: {
    fontSize: 16,
    color: '#00839B',
    // fontWeight: '500',
    fontFamily: fontFamily.medium,
  },

  // Input Fields
  inputsContainer: {
    marginTop: spacing.md,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    // fontWeight: '500',
    fontFamily: fontFamily.medium,
    color: '#6B7280',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingBottom: 8,
    minHeight: 40,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    padding: 0,
  },
  readOnlyInput: {
    flex: 1,
    fontSize: 16,
    color: '#4B5563',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  datePickerIOS: {
    marginTop: 10,
    backgroundColor: '#F5F5F4',
    borderRadius: 12,
  },

  // Save Button
  saveButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
  // saveButton: {
  //   backgroundColor: '#E0F4F7',
  //   borderRadius: 30,
  //   paddingVertical: 16,
  //   alignItems: 'center',
  // },
  // saveButtonDisabled: {
  //   opacity: 0.6,
  // },
  // saveButtonText: {
  //   fontSize: 16,
  //   // fontWeight: '600',
  //   fontFamily: fontFamily.semiBold,
  //   color: '#1C1917',
  // },
  // Save button
  saveButton: {
    backgroundColor: '#0498B3',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    // marginTop: 28,

  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});