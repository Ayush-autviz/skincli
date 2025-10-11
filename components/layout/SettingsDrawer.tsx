// SettingsDrawer.tsx
// Beautiful settings drawer component with modern design

/* ------------------------------------------------------
WHAT IT DOES
- Displays settings options with beautiful UI
- Handles user logout
- Provides smooth drawer animation
- Modern gradient design with card-based layout

DEV PRINCIPLES
- Modern, beautiful design
- Smooth animations
- Consistent with app design language
- TypeScript for type safety
------------------------------------------------------*/

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { User, Settings, Info, ChevronRight, LogOut, X } from 'lucide-react-native';
import { colors, spacing, typography, fontSize } from '../../styles';
import Avatar from '../ui/Avatar';
import useAuthStore from '../../stores/authStore';

interface SettingsDrawerProps {
  isVisible: boolean;
  onClose: () => void;
}

interface UserInfo {
  name: string;
  email: string;
  photoURL: string | null;
}

interface MenuItemProps {
  icon: React.ComponentType<any>;
  title: string;
  onPress: () => void;
  textColor?: string;
  iconColor?: string;
  showArrow?: boolean;
  disabled?: boolean;
}

export default function SettingsDrawer({ isVisible, onClose }: SettingsDrawerProps): React.JSX.Element {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const navigation = useNavigation();
  const { user, profile, logout } = useAuthStore();
  
  const fullName = profile?.user_name || user?.user_name || '';

  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: fullName || 'User',
    email: user?.email || '',
    photoURL: profile?.profile_img || null
  });

  const [isNavigationReady, setIsNavigationReady] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    setUserInfo({
      name: fullName || 'User',
      email: user?.email || '',
      photoURL: profile?.profile_img || null
    });
  }, [user, profile, fullName]);

  // Check navigation readiness and focus state
  useEffect(() => {
    // Consider navigation ready if we have a user and user is authenticated
    const isReady = !!(user && user.user_id);
    setIsNavigationReady(isReady);
    
    console.log('🧭 [SettingsDrawer] Navigation readiness:', { 
      hasUser: !!user, 
      hasUserId: !!user?.user_id,
      isReady 
    });
  }, [user]);

  // Listen for navigation focus state
  useEffect(() => {
    const focusListener = navigation?.addListener?.('focus', () => {
      console.log('🧭 [SettingsDrawer] Navigation focused');
      setIsFocused(true);
    });

    const blurListener = navigation?.addListener?.('blur', () => {
      console.log('🧭 [SettingsDrawer] Navigation blurred');
      setIsFocused(false);
    });

    // Set initial focus state
    setIsFocused(navigation?.isFocused?.() || false);

    return () => {
      focusListener?.();
      blurListener?.();
    };
  }, [navigation]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -350,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  const handleSignOut = async (): Promise<void> => {
    try {
      console.log('🔵 [SettingsDrawer] Sign out - Navigation ready:', isNavigationReady);
      logout();
      onClose();
      
      const delay = isNavigationReady ? 100 : 300;
      setTimeout(() => {
        if (navigation && typeof (navigation as any).navigate === 'function') {
          (navigation as any).navigate('SignIn');
        } else {
          console.error('🔴 [SettingsDrawer] Navigation not available for sign out');
        }
      }, delay);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleProfilePress = (): void => {
    console.log('🔵 [SettingsDrawer] Profile press attempt');
    console.log('🔵 [SettingsDrawer] Navigation available:', !!navigation);
    console.log('🔵 [SettingsDrawer] User authenticated:', !!user);
    console.log('🔵 [SettingsDrawer] Is focused:', isFocused);
    console.log('🔵 [SettingsDrawer] Navigation ready:', isNavigationReady);
    
    onClose();
    
    // Determine delay based on readiness state
    const baseDelay = isNavigationReady && isFocused ? 150 : 800;
    console.log(`🔵 [SettingsDrawer] Using base delay: ${baseDelay}ms`);
    
    // Try multiple navigation strategies with retry logic
    const tryNavigate = (attempt: number = 1): void => {
      console.log(`🔵 [SettingsDrawer] Navigation attempt ${attempt}`);
      console.log('🔵 [SettingsDrawer] Available methods:', {
        navigationNavigate: !!(navigation && (navigation as any).navigate),
        navigationGetParent: !!(navigation && (navigation as any).getParent),
        navigationReset: !!(navigation && (navigation as any).reset)
      });
    
      // Debug navigation structure
      try {
        const navState = (navigation as any)?.getState?.();
        console.log('🔵 [SettingsDrawer] Full navigation state:', JSON.stringify(navState, null, 2));
        const parentNav = (navigation as any)?.getParent?.();
        console.log('🔵 [SettingsDrawer] Parent navigation:', !!parentNav);
        if (parentNav) {
          console.log('🔵 [SettingsDrawer] Parent state:', JSON.stringify(parentNav.getState?.(), null, 2));
        }
      } catch (error) {
        console.log('🔵 [SettingsDrawer] Could not get navigation state:', (error as Error).message);
      }
        
        try {
          // Strategy 1: Use parent navigator (this is the correct approach based on the nav state)
          if (navigation && (navigation as any).getParent && typeof (navigation as any).getParent === 'function') {
            const parentNavigation = (navigation as any).getParent();
            if (parentNavigation && typeof parentNavigation.navigate === 'function') {
              parentNavigation.navigate('profile');
              console.log('✅ [SettingsDrawer] Navigation attempted with parent.navigate');
              return;
            }
          }
          
          // Strategy 2: Try React Navigation navigate directly
          if (navigation && typeof (navigation as any).navigate === 'function') {
            (navigation as any).navigate('profile');
            console.log('✅ [SettingsDrawer] Navigation attempted with navigation.navigate');
            return;
          }
          
          // Strategy 3: Try navigating with correct nested structure
          if (navigation && typeof (navigation as any).navigate === 'function') {
            // Navigate directly to profile within current stack
            (navigation as any).navigate('profile');
            console.log('✅ [SettingsDrawer] Navigation attempted with correct nested navigation');
            return;
          }
          
          throw new Error('No navigation methods available');
          
        } catch (error) {
          console.error(`🔴 [SettingsDrawer] Navigation attempt ${attempt} failed:`, error);
          
          // Retry up to 3 times with increasing delays
          if (attempt < 3) {
            const delay = attempt * 500; // 500ms, 1000ms delays
            console.log(`⏳ [SettingsDrawer] Retrying navigation in ${delay}ms...`);
            setTimeout(() => tryNavigate(attempt + 1), delay);
          } else {
            console.error('🔴 [SettingsDrawer] All navigation attempts failed');
            // Final fallback - try with much longer delay and simpler path
            console.log('🔄 [SettingsDrawer] Attempting manual navigation with long delay as last resort');
            setTimeout(() => {
              try {
                // Try just "profile" without the full path
                if ((navigation as any)?.navigate) {
                  (navigation as any).navigate('profile');
                  console.log('✅ [SettingsDrawer] Final attempt with simple path');
                }
              } catch (finalError) {
                console.error('🔴 [SettingsDrawer] Final navigation attempt failed:', finalError);
              }
            }, 2000); // Much longer delay
          }
        }
    };
    
    // Start navigation attempt after drawer closes
    setTimeout(tryNavigate, baseDelay);
  };

  const handleResetOnboarding = async (): Promise<void> => {
    try {
      // For now, just navigate to onboarding - could implement profile deletion later
      onClose();
      setTimeout(() => {
        (navigation as any).navigate('Name');
        console.log('✅ Navigating to onboarding');
      }, 100);
    } catch (error) {
      console.error('❌ Error resetting onboarding:', error);
    }
  };

  const MenuItem = ({ icon: IconComponent, title, onPress, textColor = colors.textPrimary, iconColor = colors.primary, showArrow = true, disabled = false }: MenuItemProps): React.JSX.Element => (
    <TouchableOpacity 
      style={[styles.menuItem, disabled && styles.menuItemDisabled]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <View style={styles.menuItemContent}>
        <View style={styles.menuItemLeft}>
          <View style={styles.iconContainer}>
            <IconComponent size={22} color={disabled ? colors.textTertiary : iconColor} />
          </View>
          <Text style={[styles.menuText, { color: disabled ? colors.textTertiary : textColor }]}>{title}</Text>
        </View>
        {showArrow && (
          <ChevronRight size={20} color={colors.textTertiary} />
        )}
      </View>
    </TouchableOpacity>
  );

  if (!isVisible) return <></>;

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          <View style={styles.drawerGradient}>
            {/* Header with Profile */}
            <View style={styles.header}>
              <View style={styles.profileCard}>
                <Avatar 
                  name={fullName}
                  source={profile?.profile_img ? { uri: profile.profile_img } : undefined}
                  size="xl"
                />
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{userInfo.name}</Text>
                  <Text style={styles.profileEmail}>{userInfo.email}</Text>
                  {/* <View style={styles.profileBadge}>
                    <Text style={styles.profileBadgeText}>Premium</Text>
                  </View> */}
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>Settings</Text>
              
              <MenuItem
                icon={User}
                title="Profile"
                onPress={handleProfilePress}
              />
              
              {/* <MenuItem
                icon={Settings}
                title="Notifications"
                onPress={() => {
                  onClose();
                  // TODO: Implement notifications screen navigation
                  setTimeout(() => {
                    // (navigation as any).navigate('notifications');
                  }, 100);
                }}
              /> */}
              
              {/* <MenuItem
                icon={Info}
                title="Help & FAQs"
                onPress={() => {
                  onClose();
                  // TODO: Implement FAQ screen navigation
                  setTimeout(() => {
                    // (navigation as any).navigate('help');
                  }, 100);
                }}
              /> */}
            </View>

            {/* Sign Out Section */}
            <View style={styles.bottomSection}>
              <TouchableOpacity 
                style={styles.signOutButton}
                onPress={handleSignOut}
                activeOpacity={0.7}
              >
                <View style={styles.signOutContent}>
                  <LogOut size={20} color="#FF6B6B" />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 320,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 4,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  drawerGradient: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingBottom: spacing.lg,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderBottomRightRadius: 20,
    paddingTop: 70,
    padding: spacing.lg,
    alignItems: 'center',
    // iOS shadow
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Android shadow
    elevation: 4,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  profileBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  menuSection: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  menuItem: {
    marginBottom: 10,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderColor: 'rgba(255, 107, 107, 0.7)',
    borderWidth: 0.2,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    minHeight: 56,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 999,
    marginBottom: spacing.lg,
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: spacing.sm,
  },
  versionText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    fontWeight: '500',
  },
});