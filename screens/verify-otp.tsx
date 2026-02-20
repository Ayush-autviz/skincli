// verify-otp.tsx
// OTP verification screen for signup and forgot password flows

/* ------------------------------------------------------
WHAT IT DOES
- Handles OTP verification for both signup and forgot password
- Uses react-native-confirmation-code-field for reliable OTP input
- Provides visual feedback with auto-focusing OTP inputs
- Includes resend OTP functionality with cooldown
- Shows appropriate messaging based on flow type
- Navigates to correct destination after verification

DEV PRINCIPLES
- Consistent design with other auth screens  
- Uses React Native best practices
- Implements proper form validation
- Provides clear user feedback
- Uses accessibility guidelines
------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  SafeAreaView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Mail, ChevronLeft } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { verifyOtp, resendOtp, resendOtpForgotPassword } from '../utils/newApiService';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';

export default function VerifyOtp(): React.JSX.Element {
  const [otp, setOtp] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const navigation = useNavigation();
  const route = useRoute();

  const email = (route.params as any)?.email as string;
  const isSignup = (route.params as any)?.isSignup === 'true';

  const CELL_COUNT = 4;
  const ref = useBlurOnFulfill({ value: otp, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: otp,
    setValue: setOtp,
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (otp.length === CELL_COUNT) {
      setTimeout(() => {
        handleVerifyOtp();
      }, 100);
    }
  }, [otp]);

  const handleVerifyOtp = async (): Promise<void> => {
    if (otp.length !== CELL_COUNT) {
      setError('Please enter the complete 4-digit OTP');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await verifyOtp({
        signup: isSignup,
        email: email,
        otp: otp
      });

      if ((result as any).success) {
        setSuccessMessage((result as any).message);

        if (isSignup) {
          setTimeout(() => {
            (navigation as any).navigate('SignIn');
          }, 1500);
        } else {
          setTimeout(() => {
            (navigation as any).navigate('NewPassword', {
              email: email,
              resetToken: (result as any).reset_token
            });
          }, 1500);
        }
      }
    } catch (err: any) {
      setError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async (): Promise<void> => {
    if (resendCooldown > 0) return;

    setError('');
    setResendCooldown(60);

    try {
      let result;
      if (isSignup) {
        result = await resendOtp(email);
      } else {
        result = await resendOtpForgotPassword(email);
      }

      if ((result as any).success) {
        setSuccessMessage('OTP has been resent to your email');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP. Please try again.');
      setResendCooldown(0);
    }
  };

  const getTitle = (): string => {
    return isSignup ? 'Verify Your Email' : 'Verify OTP';
  };

  const getSubtitle = (): string => {
    return isSignup
      ? "We've sent a 4-digit code to"
      : "We've sent a password reset code to";
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
            style={styles.backButtonContainer}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={28} color="#111827" />
          </TouchableOpacity>

          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <SvgXml xml={magicIcon} width={100} height={100} />
            </View>
            <Text style={styles.welcomeBack}>{getTitle()}</Text>
            <Text style={styles.subText}>{getSubtitle()}</Text>
            <Text style={styles.emailDisplay}>{email}</Text>
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

            <View style={styles.otpContainer}>
              <CodeField
                ref={ref}
                {...props}
                value={otp}
                onChangeText={setOtp}
                cellCount={CELL_COUNT}
                rootStyle={styles.codeFieldRoot}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                renderCell={({ index, symbol, isFocused }) => (
                  <View
                    key={index}
                    style={[
                      styles.otpInput,
                      symbol && styles.otpInputFilled,
                      error && !otp.includes(symbol) ? styles.otpInputError : null,
                      isFocused && styles.otpInputFocused
                    ]}
                    onLayout={getCellOnLayoutHandler(index)}
                  >
                    <Text style={styles.otpInputText}>
                      {symbol || (isFocused ? <Cursor /> : null)}
                    </Text>
                  </View>
                )}
              />
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
              onPress={handleVerifyOtp}
              disabled={isLoading}
            >
              <Text style={styles.verifyButtonText}>
                {isLoading ? 'Verifying...' : 'Verify'}
              </Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={resendCooldown > 0}
              >
                <Text style={[
                  styles.resendLink,
                  resendCooldown > 0 && styles.resendLinkDisabled
                ]}>
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
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
  backButtonContainer: {
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
  },
  emailDisplay: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
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
  otpContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  codeFieldRoot: {
    width: '100%',
    paddingHorizontal: 10,
  },
  otpInput: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  otpInputFilled: {
    borderColor: '#08879b',
  },
  otpInputFocused: {
    borderColor: '#08879b',
    borderWidth: 2,
  },
  otpInputError: {
    borderColor: '#EF4444',
  },
  otpInputText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  verifyButton: {
    backgroundColor: '#08879b',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendLink: {
    color: '#08879b',
    fontWeight: '700',
    fontSize: 14,
  },
  resendLinkDisabled: {
    color: '#9CA3AF',
  },
});
