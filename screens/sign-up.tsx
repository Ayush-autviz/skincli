// sign-up.tsx
// Authentication screen for user registration

/* ------------------------------------------------------
WHAT IT DOES
- Handles user registration with email/password
- Calls external API to create user subject
- Provides navigation to sign in
- Displays form validation and error messages

DEV PRINCIPLES
- Consistent design with Sign-In screen
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
  Image,
  SafeAreaView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { signUp } from '../utils/newApiService';

export default function SignUp(): React.JSX.Element {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const navigation = useNavigation();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUp = async (): Promise<void> => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await signUp({ name: name.trim(), email: email.toLowerCase().trim(), password });

      if ((result as any).success) {
        // Navigate to OTP verification screen for signup flow
        (navigation as any).navigate('VerifyOTP', {
          email: email.toLowerCase().trim(),
          isSignup: 'true'
        });
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
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
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <SvgXml xml={magicIcon} width={100} height={100} />
            </View>
            <Text style={styles.welcomeBack}>Get Started</Text>
            <Text style={styles.subText}>Create your account below.</Text>
          </View>

          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText} accessibilityRole="alert">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  accessibilityLabel="Name input"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="Enter email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  accessibilityLabel="Email input"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  autoComplete="new-password"
                  textContentType="password"
                  accessibilityLabel="Password input"
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

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
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
                  onSubmitEditing={handleSignUp}
                  autoComplete="new-password"
                  textContentType="password"
                  accessibilityLabel="Confirm Password input"
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
              style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              <Text style={styles.signUpButtonText}>
                {isLoading ? 'Creating account...' : 'Sign up'}
              </Text>
            </TouchableOpacity>

            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('SignIn')}
              >
                <Text style={styles.signInLink}>
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
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
  },
  subText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '400',
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
  inputContainer: {
    marginBottom: 16,
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
  signUpButton: {
    backgroundColor: '#08879b',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  signUpButtonDisabled: {
    opacity: 0.7,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signInLink: {
    color: '#08879b',
    fontWeight: '700',
    fontSize: 14,
  },
});
