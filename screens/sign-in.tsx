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
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { signIn } from '../utils/newApiService';
import useAuthStore from '../stores/authStore';

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
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/images/auth.png')}
            style={styles.headerImage}
            resizeMode="cover"
            accessibilityLabel="Sign in illustration"
          />
        </View>
            <View style={styles.formContainer}>
              <View style={styles.formHeader}>
                <Text style={styles.title}>Sign in</Text>
                <View style={styles.titleUnderline} />
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
              ) : <View style={{height: 65}} />}
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="demo@email.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    accessibilityLabel="Email input"
                    accessibilityHint="Enter your email address"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                    autoComplete="current-password"
                    textContentType="password"
                    accessibilityLabel="Password input"
                    accessibilityHint="Enter your password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    accessibilityRole="button"
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
                accessibilityRole="link"
                onPress={() => (navigation as any).navigate('ForgotPassword')}
              >
                <Text style={styles.forgotPasswordText}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
                onPress={handleSignIn}
                disabled={isLoading}
                accessibilityLabel={isLoading ? "Signing in" : "Sign in"}
              >
                <Text style={styles.signInButtonText}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>
                  Don't have an Account!{' '}
                </Text>
                <TouchableOpacity 
                  accessibilityRole="link"
                  onPress={() => (navigation as any).navigate('SignUp')}
                >
                  <Text style={styles.signUpLink}>
                    Sign up
                  </Text>
                </TouchableOpacity>
              </View>
        </View>
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
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#FFFFFF',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 50,
  },
  formHeader: {
    marginBottom: 20,
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
    backgroundColor: '#8B7355',
    borderRadius: 2,
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
    borderBottomColor: '#8B7355',
    paddingBottom: 8,
    minHeight: 44, // Accessibility minimum touch target
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 4,
    minHeight: 44, // Accessibility minimum touch target
  },
  eyeIcon: {
    padding: 8,
    minWidth: 44, // Accessibility minimum touch target
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
    minHeight: 24, // Accessibility minimum touch target
    justifyContent: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  signInButton: {
    backgroundColor: '#8B7355',
    borderRadius: 25,
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 10,
    minHeight: 56, // Better touch target
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  signInButtonDisabled: {
    opacity: 0.7,
    elevation: 0,
    shadowOpacity: 0,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  signUpText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  signUpLink: {
    color: '#FF6B6B',
    fontWeight: '500',
    fontSize: 16,
  },
});
