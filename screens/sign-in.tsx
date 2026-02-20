// sign-in.tsx
// Authentication screen for user sign in

/* ------------------------------------------------------
WHAT IT DOES
- Handles user sign in with email/password
- Provides navigation to sign up and forgot password
- Displays form validation and error messages

DEV PRINCIPLES
- Uses React Native best practices
- Implements proper form validation
- Provides clear user feedback
- Uses global style system
- Follows accessibility guidelines
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
  SafeAreaView
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import { Mail, Lock, Eye, EyeOff, Search } from 'lucide-react-native';
import { signIn } from '../utils/newApiService';
import useAuthStore from '../stores/authStore';
import { SvgXml } from 'react-native-svg';

export default function SignIn(): React.JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const navigation = useNavigation();
  const { setUser, setTokens, setProfileStatus, setLoading: setStoreLoading } = useAuthStore();
  const passwordRef = useRef<TextInput>(null);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignIn = async (): Promise<void> => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await signIn({ email: email.toLowerCase().trim(), password });

      if ((result as any).success) {
        setUser((result as any).user);
        setTokens((result as any).access_token, (result as any).refresh_token);
        setProfileStatus((result as any).profile_status);
        // Let AuthProvider handle the routing after authentication
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
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
        bounces={true}
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
            <Text style={styles.welcomeBack}>Welcome back!</Text>
            <Text style={styles.subText}>Please enter your details.</Text>
          </View>

          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText} accessibilityRole="alert">
                  {error}
                </Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <TextInput
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
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  autoComplete="current-password"
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

            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => (navigation as any).navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>
                Forgot password
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
              onPress={handleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.signInButtonText}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Text>
            </TouchableOpacity>

            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>
                Don’t have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('SignUp')}
              >
                <Text style={styles.signUpLink}>
                  Sign up
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
    marginTop: 20,
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
    marginBottom: 20,
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
  forgotPasswordContainer: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#08879b',
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: '#08879b',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signUpLink: {
    color: '#08879b',
    fontWeight: '700',
    fontSize: 14,
  },
});
