import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../../styles';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HeaderProps {
    title: string;
    onBackPress?: () => void;
    rightElement?: React.ReactNode;
    showBack?: boolean;
}

const Header = ({
    title,
    onBackPress,
    rightElement,
    showBack = true
}: HeaderProps) => {
    const navigation = useNavigation();

    const handleBack = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            navigation.goBack();
        }
    };

    return (
        <SafeAreaView style={styles.headerContainer}>
            <View style={styles.header}>
                {showBack ? (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                    >
                        <View style={styles.iconContainer}>
                            <ArrowLeft size={22} color={colors.primary} />
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.placeholderButton} />
                )}

                <View style={styles.titleContainer}>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <View style={styles.titleUnderline} />
                </View>

                {rightElement ? (
                    <View style={styles.rightContainer}>
                        {rightElement}
                    </View>
                ) : (
                    <View style={styles.placeholderButton} />
                )}
            </View>
            <View style={styles.shadowContainer} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: '#FFFFFF',
        zIndex: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 60,
    },
    backButton: {
        padding: 4,
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 131, 155, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '400',
        color: '#1C1917',
        fontFamily: 'Inter_18pt-Light',
    },
    titleUnderline: {
        width: 40,
        height: 2,
        backgroundColor: colors.primary,
        marginTop: 4,
        borderRadius: 1,
    },
    rightContainer: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderButton: {
        width: 40,
    },
    shadowContainer: {
        height: 1,
        backgroundColor: '#F5F5F4',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
});

export default Header;
