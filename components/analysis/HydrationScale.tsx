import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { fontFamily } from '../../styles';

interface HydrationScaleProps {
  score?: number; // 0-100, where higher = more hydrated
  showScore?: boolean;
}

/**
 * Hydration Scale Component
 * Shows a gradient bar from blue (well hydrated) to red (low hydration)
 * with tick marks and optional score indicator.
 */
const HydrationScale: React.FC<HydrationScaleProps> = ({
  score,
  showScore = true,
}) => {
  // The visual scale shows "Well hydrated" on the LEFT (blue) and "Low hydration" on the RIGHT (red)
  // So we invert the score for positioning: low score (dehydrated) = right side, high score (hydrated) = left side
  const indicatorPosition = score !== undefined ? 100 - score : null;

  return (
    <View style={styles.container}>
      <View style={styles.gradientBarWrapper}>
        <LinearGradient
          colors={[
            '#6366F1', // Indigo (well hydrated)
            '#3B82F6', // Blue
            '#06B6D4', // Cyan
            '#22C55E', // Green
            '#84CC16', // Lime
            '#EAB308', // Yellow
            '#F97316', // Orange
            '#EF4444', // Red (low hydration)
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBar}
        >
          {/* Tick marks */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <View
              key={i}
              style={[styles.tickMark, { left: `${(i / 8) * 100}%` }]}
            />
          ))}

          {/* Score indicator */}
          {showScore && indicatorPosition !== null && (
            <View
              style={[styles.scoreIndicator, { left: `${indicatorPosition}%` }]}
            />
          )}
        </LinearGradient>
      </View>

      {/* Labels */}
      <View style={styles.labelsRow}>
        <Text style={styles.labelText}>Well hydrated</Text>
        <Text style={styles.labelText}>Low hydration</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  gradientBarWrapper: {
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  gradientBar: {
    flex: 1,
    borderRadius: 10,
    position: 'relative',
  },
  tickMark: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  scoreIndicator: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    width: 4,
    // backgroundColor: '#FFFFFF',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    transform: [{ translateX: -2 }],
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  labelText: {
    fontSize: 12,
    color: '#78716C',
    fontFamily: fontFamily.medium,
  },
});

export default HydrationScale;
