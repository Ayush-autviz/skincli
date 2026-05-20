import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    SafeAreaView,
    Platform,
    StatusBar,
    Alert,
    ActivityIndicator,
    Clipboard,
    KeyboardAvoidingView,
    Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, CheckCircle2, Copy, Share2 } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontFamily } from '../styles';
import { generateExpertReportLink } from '../utils/newApiService';

const SkinCheckScreen = () => {
    const navigation = useNavigation();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');

    const handleSend = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter an expert email');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        try {
            setIsLoading(true);
            const response: any = await generateExpertReportLink(email, comment);

            if (response.status === 200 || response.status === 201) {
                const linkPath = response.data?.link_path || response.result?.link_path;
                if (linkPath) {
                    const fullLink = `https://experts.projectmagicmirror.com/${linkPath}`;
                    setGeneratedLink(fullLink);
                    setEmail("");
                    setStep(2);
                } else {
                    Alert.alert('Error', 'Failed to generate report link. Please try again.');
                }
            } else {
                Alert.alert('Error', response.message || 'Failed to generate report link');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = async () => {
        if (generatedLink) {
            await Share.share({
                message: generatedLink,
                url: generatedLink, // iOS specific
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <View style={styles.iconContainer}>
                            <ChevronLeft size={30} color="#44403C" />
                        </View>
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.headerTitle}>SkinCheck</Text>
                    </View>
                    <View style={styles.rightContainer} />
                </View>
                <View style={styles.shadowLine} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {step === 1 ? (
                        <>
                            <View style={styles.iconContainer}>
                                <CheckCircle2 size={85} color="#00839B" strokeWidth={1.5} />
                            </View>

                            <Text style={styles.title}>SkinCheck</Text>

                            <Text style={styles.subtitle}>
                                Send this scan, your scores, and your routine to your skin health professional.
                            </Text>

                            <View style={styles.formContainer}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Skincare professional's email</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter email"
                                        placeholderTextColor="#A9A29D"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Add a comment (Optional)</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="E.g. Please outline any specific concerns..."
                                        placeholderTextColor="#A9A29D"
                                        value={comment}
                                        onChangeText={setComment}
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                    />
                                </View>

                                <Text style={styles.footerText}>
                                    Skinchecks are performed by professionals that you know and trust. If you are sending this SkinCheck request to a professional who has not joined the SkinCheck professional network, they will have to create an account to have secure access to the report you are sending them. Each professional sets their own terms for performing a SkinCheck.
                                </Text>

                                <View style={styles.developmentBanner}>
                                    <Text style={styles.developmentBannerText}>This feature is still in development</Text>
                                </View>
                            </View>
                        </>
                    ) : (
                        <View style={styles.successContent}>
                            <View style={styles.iconContainer}>
                                <CheckCircle2 size={44} color="#00839B" strokeWidth={2} />
                            </View>

                            <Text style={styles.successTitle}>Report Generated!</Text>
                            <Text style={styles.successSubtitle}>
                                Your skin analysis is ready to be shared with your professional.
                            </Text>

                            <View style={styles.fancyLinkCard}>
                                <View style={styles.linkHeader}>
                                    <Text style={styles.linkHeaderText}>REPORT LINK</Text>
                                </View>
                                <View style={styles.linkContent}>
                                    <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
                                        {generatedLink}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.fancyCopyButton}
                                        onPress={() => {
                                            Clipboard.setString(generatedLink);
                                            Alert.alert('Copied', 'Report link copied to clipboard');
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Copy size={20} color="#00839B" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.infoBox}>
                                <Text style={styles.infoText}>
                                    Share this link via your preferred message app.
                                </Text>
                            </View>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    {step === 1 ? (
                        <TouchableOpacity
                            style={styles.sendButton}
                            onPress={handleSend}
                            activeOpacity={0.8}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.sendButtonText}>Generate Link</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.sendButton}
                            onPress={handleShare}
                            activeOpacity={0.8}
                        >
                            <View style={styles.shareBtnContent}>
                                <Share2 size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                                <Text style={styles.sendButtonText}>Share Link</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: 105,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 0.4,
        justifyContent: 'flex-end',
        borderBottomColor: '#E5E5E5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingBottom: 10,
        paddingHorizontal: spacing.lg,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    rightContainer: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shadowLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: colors.primary,
        opacity: 0.1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: Platform.OS === 'ios' ? 40 : 100,
        alignItems: 'center',
        paddingBottom: 20,
    },
    iconContainer: {
        marginVertical: 20,
    },
    title: {
        fontSize: 28,
        // fontFamily: fontFamily.bold,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: fontFamily.regular,
        color: '#6B7280',
        textAlign: 'center',
        // lineHeight: 24,
        marginBottom: 40,
        paddingHorizontal: 15,
    },
    formContainer: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 15,
        // fontFamily: fontFamily.semiBold,
        fontWeight: '600',
        color: '#44403C',
        marginBottom: 8,
    },
    input: {
        height: 52,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#1F2937',
        fontFamily: fontFamily.regular,
        backgroundColor: '#FFFFFF',
    },
    textArea: {
        height: 100,
        paddingTop: 12,
    },
    shareBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successContent: {
        width: '100%',
        alignItems: 'center',
    },
    largeIconContainer: {
        marginBottom: 24,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#00839B',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00839B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    successTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center',
    },
    successSubtitle: {
        fontSize: 16,
        color: '#4B5563',
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    fancyLinkCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        marginBottom: 24,
        overflow: 'hidden',
    },
    linkHeader: {
        backgroundColor: '#F9FAFB',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    linkHeaderText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 1,
    },
    linkContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    linkText: {
        flex: 1,
        fontSize: 15,
        color: '#00839B',
        fontWeight: '500',
        marginRight: 12,
    },
    fancyCopyButton: {
        padding: 10,
        backgroundColor: '#F0FDFA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    infoBox: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        width: '100%',
    },
    infoText: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 18,
    },
    footerText: {
        fontSize: 12,
        fontFamily: fontFamily.regular,
        color: '#A9A29D',
        lineHeight: 15,
        marginBottom: 16,
    },
    footer: {
        padding: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 10 : spacing.lg,
        borderTopWidth: 1,
        borderTopColor: 'transparent',
    },
    sendButton: {
        backgroundColor: '#00839B',
        height: 52,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: fontFamily.bold,
    },
    developmentBanner: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    developmentBannerText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        fontFamily: fontFamily.medium,
    },
});

export default SkinCheckScreen;
