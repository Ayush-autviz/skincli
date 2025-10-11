// profile.tsx
// User profile screen with modern auth-style design

/* ------------------------------------------------------
WHAT IT DOES
- Displays user profile information with modern, clean design
- Allows editing of profile information with toggle functionality
- Shows user stats and join date
- Follows auth screen design patterns

DATA USED
- User profile from UserContext
- Firestore profile data: firstName, lastName, birthDate, createdAt

DEV PRINCIPLES
- Clean, modern UI following auth screen patterns
- Consistent typography and colors
- Proper input handling with icons
- Smooth transitions between view and edit modes
------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TextInput, 
  TouchableOpacity, 
  Platform,
  StatusBar,
  Image,
  SafeAreaView,
  Alert
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, typography, borderRadius } from '../styles';
import { User, Calendar, Mail, Edit3, Camera } from 'lucide-react-native';
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

interface UserData {
  user_name?: string;
  [key: string]: any;
}

interface AuthStore {
  user?: UserData;
  profile?: ProfileData;
  setProfile: (profile: ProfileData) => void;
}

interface EditForm {
  user_name: string;
  birth_date: Date | null;
  profile_img: string | null;
}

interface ApiResponse {
  success: boolean;
  profile?: ProfileData;
  message?: string;
}


// Design tokens matching auth screens
const PRIMARY_COLOR = '#8B7355';

export default function Profile(): React.JSX.Element {
  const { user, profile, setProfile } = useAuthStore();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  
  const [editForm, setEditForm] = useState<EditForm>({
    user_name: (profile as any)?.user_name || (user as any)?.user_name || '',
    birth_date: (profile as any)?.birth_date ? new Date((profile as any).birth_date) : null,
    profile_img: null // For new image selection
  });

  // Fetch profile data
  const fetchProfile = async (): Promise<void> => {
    try {
      setIsProfileLoading(true);
      const res: any = await getProfile();
      console.log(res,'profile')
      if (res.success) {
        setProfile(res.profile!);
      }
    } catch (err: any) {
      console.error('🔴 Profile fetch error:', err);
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
      await fetchProfile(); // Refresh profile data
      
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      setIsEditing(false);
    } catch (err: any) {
      console.error('🔴 Profile update error:', err);
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

  const calculateAge = (birthDate: any): number | null => {
    if (!birthDate) return null;
    const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatBirthDate = (date: any): string => {
    if (!date) return 'Not set';
    const birthDate = date instanceof Date ? date : new Date(date);
    return birthDate.toLocaleDateString('en-US', {
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
      console.error('🔴 Image picker error:', err);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  if (isProfileLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  const age = calculateAge((profile as any)?.birth_date);
  const fullName = (profile as any)?.user_name || (user as any)?.user_name || 'User';

  const handleSave = () => {
    if (!editForm.user_name.trim()) {
      setError('Please enter your name');
      return;
    }

    // Validate birth date is not in the future
    if (editForm.birth_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
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
      setIsEditing(false);
      return;
    }

    updateProfileData(updateData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      user_name: (profile as any)?.user_name || (user as any)?.user_name || '',
      birth_date: (profile as any)?.birth_date ? new Date((profile as any).birth_date) : null,
      profile_img: null
    });
    setError('');
    setSuccess('');
  };

  const handleDateChange = (event: any, selectedDate: any) => {
   // setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setEditForm(prev => ({ ...prev, birth_date: selectedDate }));
    }
  };

  return (
    // <View style={styles.container}>
    <KeyboardAwareScrollView
    style={styles.container}
    contentContainerStyle={styles.scrollContent}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
    bounces={false}
    enableOnAndroid={true}
    extraScrollHeight={20}
    enableResetScrollToCoords={false}
  >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      
      {/* Header illustration */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../assets/images/auth.png')}
          style={styles.headerImage}
          resizeMode="cover"
          accessibilityLabel="Profile illustration"
        />
        
        {/* Back button overlay */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        {/* Edit button overlay */}
        {!isEditing && (
          <TouchableOpacity 
            style={styles.editButtonOverlay}
            onPress={() => setIsEditing(true)}
            accessibilityLabel="Edit profile"
          >
            <Edit3 size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <SafeAreaView style={styles.safeAreaBottom}>
        {/* <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          enableOnAndroid={true}
          extraScrollHeight={20}
          enableResetScrollToCoords={false}
        > */}
          <View style={styles.formContainer}>
            {/* Title */}
            <View style={styles.formHeader}>
              <Text style={styles.title}>
                {isEditing ? 'Edit Profile' : 'Profile'}
              </Text>
              <View style={styles.titleUnderline} />
            </View>

            {/* Success message */}
            {success ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>
                  {success}
                </Text>
              </View>
            ) : null}

            {/* Error message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText} accessibilityRole="alert">
                  {error}
                </Text>
              </View>
            ) : null}

            {isEditing ? (
              // EDIT MODE
              <>
                {/* Profile Image */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Profile Image</Text>
                  <TouchableOpacity
                    style={styles.imagePickerWrapper}
                    onPress={handleImagePicker}
                  >
                    {editForm.profile_img ? (
                      <Image
                        source={{ uri: editForm.profile_img }}
                        style={styles.profileImage}
                      />
                    ) : (profile as any)?.profile_img ? (
                      <Image
                        source={{ uri: (profile as any).profile_img }}
                        style={styles.profileImage}
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Camera size={40} color="#9CA3AF" />
                        <Text style={styles.imagePlaceholderText}>
                          Tap to change photo
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Name */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Name</Text>
                  <View style={styles.inputWrapper}>
                    <User size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your name"
                      value={editForm.user_name}
                      onChangeText={(text) => setEditForm(prev => ({ ...prev, user_name: text }))}
                      autoCapitalize="words"
                      placeholderTextColor="#9CA3AF"
                      returnKeyType="next"
                    />
                  </View>
                </View>

                 {/* Birth Date */}
                 <View style={styles.inputContainer}>
                   <Text style={styles.label}>Birth Date</Text>
                   <View style={styles.inputWrapper}>
                     <Calendar size={20} color="#9CA3AF" style={styles.inputIcon} />
                     <TouchableOpacity
                       style={styles.dateInputButton}
                       onPress={() => setShowDatePicker(!showDatePicker)}
                     >
                       <Text style={[styles.dateText, !editForm.birth_date && { color: '#9CA3AF' }]}>
                         {editForm.birth_date ? editForm.birth_date.toDateString() : 'Select your birth date'}
                       </Text>
                     </TouchableOpacity>
                   </View>
                 </View>

                 {showDatePicker && (
                  
                     <DateTimePicker
                       value={editForm.birth_date || new Date()}
                       mode="date"
                       display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                       onChange={handleDateChange}
                       minimumDate={new Date(new Date().getFullYear() - 110, 0, 1)}
                       textColor={Platform.OS === 'ios' ? '#1F2937' : '#FFFFFF'}
                       style={Platform.OS === 'ios' ? { backgroundColor: '#FFFFFF' } : undefined}
                       themeVariant="light"
                     />
                   
                 )}

                 {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    accessibilityLabel="Cancel editing"
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={isUpdating}
                    accessibilityLabel={isUpdating ? 'Saving...' : 'Save changes'}
                  >
                    <Text style={styles.saveButtonText}>
                      {isUpdating ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // VIEW MODE
              <>
                {/* Profile Image */}
                {(profile as any)?.profile_img && (
                  <View style={styles.profileImageContainer}>
                    <Image
                      source={{ uri: (profile as any).profile_img }}
                      style={styles.profileImageLarge}
                    />
                  </View>
                )}

                {/* Profile Info Card */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <User size={20} color={PRIMARY_COLOR} />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Name</Text>
                      <Text style={styles.infoValue}>{fullName}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Mail size={20} color={PRIMARY_COLOR} />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{user?.email}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Calendar size={20} color={PRIMARY_COLOR} />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Birth Date</Text>
                      <Text style={styles.infoValue}>
                        {formatBirthDate((profile as any)?.birth_date)}
                        {age && ` (${age} years old)`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Edit Button */}
                {/* <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditing(true)}
                  accessibilityLabel="Edit profile"
                >
                  <Edit3 size={20} color="#FFFFFF" style={styles.editButtonIcon} />
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity> */}

                {/* Logout Button */}
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={() => {
                    const { logout } = useAuthStore.getState();
                    logout();
                    // Navigation will be handled by auth state change
                  }}
                  accessibilityLabel="Logout"
                >
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAwareScrollView>
    // </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  editButtonOverlay: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeAreaBottom: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 50,
  },
  formHeader: {
    marginBottom: 40,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
  },
  successContainer: {
    marginBottom: 20,
    backgroundColor: '#E6F9ED',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  successText: {
    color: '#28A745',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    marginBottom: 20,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  errorText: {
    color: '#D73527',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY_COLOR,
    paddingBottom: 8,
    minHeight: 44,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 4,
    minHeight: 44,
  },
     dateInputButton: {
     flex: 1,
     paddingVertical: 4,
     minHeight: 44,
     justifyContent: 'center',
   },
     dateText: {
    fontSize: 16,
    color: '#1F2937',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    paddingVertical: 16,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 25,
    paddingVertical: 16,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 56,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  editButtonIcon: {
    marginRight: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 56,
    marginTop: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: PRIMARY_COLOR,
  },
  imagePickerWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginVertical: 8,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 