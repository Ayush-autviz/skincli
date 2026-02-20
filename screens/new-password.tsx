// new-password.tsx
// New password screen for password reset flow

/* ------------------------------------------------------
WHAT IT DOES
- Allows users to set a new password after OTP verification
- Uses reset token from OTP verification for security
- Provides password confirmation and validation
- Navigates to sign in after successful password reset

DEV PRINCIPLES
- Consistent design with other auth screens  
- Uses React Native best practices
- Implements proper form validation
- Provides clear user feedback
- Uses accessibility guidelines
------------------------------------------------------*/

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Lock, Eye, EyeOff, ChevronLeft } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { newPassword } from '../utils/newApiService';

export default function NewPassword(): React.JSX.Element {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const navigation = useNavigation();
  const route = useRoute();

  const email = (route.params as any)?.email as string;
  const resetToken = (route.params as any)?.resetToken as string;

  const confirmPasswordRef = useRef<TextInput>(null);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&)';
    }
    return null;
  };

  const handleSetNewPassword = async (): Promise<void> => {
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await newPassword({
        email: email,
        password: password,
        reset_token: resetToken
      });

      if ((result as any).success) {
        setSuccessMessage((result as any).message);

        setTimeout(() => {
          (navigation as any).navigate('SignIn');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
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
`

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={28} color="#111827" />
          </TouchableOpacity>

          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <SvgXml xml={magicIcon} width={100} height={100} />
            </View>
            <Text style={styles.welcomeBack}>Create New Password</Text>
            <Text style={styles.subText}>Create a strong password for your account.</Text>
          </View>

          <View style={styles.formContainer}>
            {successMessage ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={confirmPasswordRef}
                  style={styles.input}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="done"
                  onSubmitEditing={handleSetNewPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.updateButton, isLoading && styles.updateButtonDisabled]}
              onPress={handleSetNewPassword}
              disabled={isLoading}
            >
              <Text style={styles.updateButtonText}>
                {isLoading ? 'Updating Password...' : 'Update Password'}
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
  backButton: {
    paddingTop: 20,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 30,
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
    paddingHorizontal: 20,
  },
  formContainer: {
    paddingHorizontal: 24,
    marginTop: 10,
  },
  successContainer: {
    marginBottom: 20,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
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
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 8,
  },
  updateButton: {
    backgroundColor: '#08879b',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
