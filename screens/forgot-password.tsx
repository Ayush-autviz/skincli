// forgot-password.tsx
// Authentication screen for password reset

/* ------------------------------------------------------
WHAT IT DOES
- Handles password reset via email
- Provides navigation back to sign in
- Displays form validation and success messages

DEV PRINCIPLES
- Consistent design with Sign-In screen
- Uses React Native best practices
- Implements proper form validation
- Provides clear user feedback
- Uses accessibility guidelines
------------------------------------------------------*/

import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { forgotPassword } from '../utils/newApiService';

export default function ForgotPassword(): React.JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigation = useNavigation();

  const handleResetPassword = async (): Promise<void> => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await forgotPassword(email.toLowerCase().trim());

      if ((result as any).success) {
        // Navigate to OTP verification screen for forgot password flow
        (navigation as any).navigate('VerifyOTP', {
          email: email.toLowerCase().trim(),
          isSignup: 'false'
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <View style={styles.formContainer}>
            {/* Title Section */}
            <View style={styles.headerSection}>
              <Text style={styles.title}>Forgot password?</Text>
              <Text style={styles.subtitle}>
                No problem, we’ll send you a reset link
              </Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText} accessibilityRole="alert">
                  {error}
                </Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText} accessibilityRole="text">
                  {success}
                </Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                  accessibilityLabel="Email input"
                  textContentType="emailAddress"
                />
              </View>
            </View>

            {/* Send Reset Link Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Text>
            </TouchableOpacity>

            {/* Back to sign in */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ArrowLeft size={18} color="#6B7280" />
              <Text style={styles.backButtonText}>Back to log in</Text>
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
    marginTop: 150
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '400',
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
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  input: {
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  primaryButton: {
    backgroundColor: '#08879b',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 8,
  },
});
