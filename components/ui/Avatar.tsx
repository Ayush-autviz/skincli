// Avatar.tsx
// UI component for displaying user avatars or initials

/* ------------------------------------------------------
WHAT IT DOES
- Displays user avatar image if provided
- Falls back to initials if no image
- Supports different sizes
- Maintains consistent styling

DEV PRINCIPLES
- Use theme colors and spacing
- Support multiple sizes
- Keep it simple and reusable
- TypeScript for type safety
------------------------------------------------------*/

import React from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { colors, spacing, borderRadius, typography, palette } from '../../styles';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  size?: AvatarSize | number;
  name?: string;
  source?: ImageSourcePropType;
  style?: any;
}

const getInitials = (name: string): string => {
  if (!name) return '';
  return name.charAt(0).toUpperCase();
};

const Avatar: React.FC<AvatarProps> = ({ 
  size = 'md', 
  name = '', 
  source,
  style 
}): React.JSX.Element => {
  const styles = getStyles(size);

  if (source) {
    return (
      <Image 
        source={source} 
        style={[styles.avatar, style]}
      />
    );
  }

  return (
    <View style={[styles.avatar, styles.initialsContainer, style]}>
      <Text style={styles.initials}>{getInitials(name)}</Text>
    </View>
  );
};

const getStyles = (size: AvatarSize | number) => {
  let avatarSize: number;
  
  if (typeof size === 'number') {
    avatarSize = size;
  } else {
    switch (size) {
      case 'sm':
        avatarSize = 32;
        break;
      case 'md':
        avatarSize = 48;
        break;
      case 'lg':
        avatarSize = 64;
        break;
      case 'xl':
        avatarSize = 80;
        break;
      default:
        avatarSize = 48;
    }
  }

  return StyleSheet.create({
    avatar: {
      width: avatarSize,
      height: avatarSize,
      borderRadius: avatarSize / 2,
    },
    initialsContainer: {
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    initials: {
      color: colors.textOnPrimary,
      fontSize: avatarSize * 0.4,
      fontWeight: '600',
    },
  });
};

export default Avatar;
