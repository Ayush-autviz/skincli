// about-me.tsx
// About Me screen - User profile with photo gallery

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Dimensions,
    FlatList,
    Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { User, PencilLine } from 'lucide-react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { colors, spacing, fontFamily } from '../styles';
import HomeHeader from '../components/ui/HomeHeader';
import SettingsDrawer from '../components/layout/SettingsDrawer';
import useAuthStore from '../stores/authStore';
import { getProfile } from '../utils/newApiService';
import { usePhotoContext } from '../contexts/PhotoContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageWithSkeleton from '../components/ui/ImageWithSkeleton';
import ActivityList from '../components/routine/ActivityList';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16; // spacing.md
const PHOTO_GAP = 4;
const NUM_COLUMNS = 3;
const PHOTO_SIZE = (SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - (PHOTO_GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS;

type TabType = 'photos' | 'activity';

export default function AboutMeScreen(): React.JSX.Element {
    const navigation = useNavigation();
    const { user, profile, setProfile, logout } = useAuthStore();
    const { photos, isLoading: isPhotosLoading, refreshPhotos, loadMorePhotos, pagination, isLoadingMore, setSelectedSnapshot } = usePhotoContext();
    const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);
    const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<TabType>('photos');

    // Fetch profile on mount
    useEffect(() => {
        fetchProfile();
    }, []);

    // Refresh photos only on first mount, not every focus
    const hasLoadedPhotosRef = React.useRef(false);
    useFocusEffect(
        useCallback(() => {
            if (!hasLoadedPhotosRef.current) {
                hasLoadedPhotosRef.current = true;
                refreshPhotos();
            }
        }, [refreshPhotos])
    );

    const fetchProfile = async (): Promise<void> => {
        try {
            setIsProfileLoading(true);
            const res: any = await getProfile();
            if (res.success && res.profile) {
                setProfile(res.profile);
            }
        } catch (err: any) {
            // console.error('🔴 Profile fetch error:', err);
        } finally {
            setIsProfileLoading(false);
        }
    };

    const handleEditProfile = (): void => {
        (navigation as any).navigate('profile');
    };

    const handlePhotoPress = (photo: any): void => {
        // Convert timestamp to string if it's a date object or missing
        let timestampParam = photo.apiData?.created_at || null;
        if (photo.created_at) {
            timestampParam = new Date(photo.created_at).toString();
        } else if (photo.timestamp) {
            const ts = photo.timestamp;
            let dateObj;
            if (ts?.seconds) {
                dateObj = new Date(ts.seconds * 1000);
            } else {
                dateObj = new Date(ts);
            }
            if (!isNaN(dateObj.getTime())) {
                timestampParam = dateObj.toString();
            }
        }

        // Set selected snapshot in context before navigating
        setSelectedSnapshot({
            id: photo.id,
            url: photo.storageUrl,
            storageUrl: photo.storageUrl,
            threadId: photo.threadId,
            apiData: {
                created_at: timestampParam
            }
        });

        (navigation as any).navigate('Snapshot', {
            photoId: photo.id,
            thumbnailUrl: photo.storageUrl,
            localUri: photo.storageUrl,
            timestamp: timestampParam,
            fromPhotoGrid: 'true',
            hautBatchId: photo.hautUploadData?.hautBatchId || photo.hautBatchId,
            imageId: photo.hautUploadData?.imageId || photo.id,
        });
    };

    const formatBirthDate = (date: any): string => {
        if (!date) return 'Not set';
        const birthDate = new Date(date);
        return birthDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const fullName = profile?.user_name || user?.user_name || 'User';

    const renderPhotoItem = ({ item }: { item: any }) => (
        <ImageWithSkeleton
            uri={item.storageUrl}
            style={styles.photoImage}
            containerStyle={styles.photoItem}
            onPress={() => handlePhotoPress(item)}
            resizeMode="cover"
            width={PHOTO_SIZE}
            height={PHOTO_SIZE}
        />
    );

    const handleLoadMore = () => {
        if (pagination.has_next && !isLoadingMore) {
            loadMorePhotos();
        }
    };

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return (
            <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={colors.tabSelected} />
            </View>
        );
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            logout();

                            const delay = true ? 100 : 300;
                            setTimeout(() => {
                                if (navigation && typeof (navigation as any).navigate === 'function') {
                                    (navigation as any).navigate('SignIn');
                                } else {
                                    console.error('🔴 [SettingsDrawer] Navigation not available for sign out');
                                }
                            }, delay);
                        } catch (error) {
                            console.error('🔴 [SettingsDrawer] Error during sign out:', error);
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    // Filter photos to only include those with storageUrl
    const filteredPhotos = React.useMemo(() => {
        return photos.filter((photo: any) => !!photo.storageUrl);
    }, [photos]);

    return (
        <View style={styles.container}>
            <HomeHeader onMenuPress={() => setIsSettingsVisible(true)} title="About Me" />

            {/* Profile Card Section */}
            <View style={styles.profileCard}>
                {isProfileLoading ? (
                    <SkeletonPlaceholder borderRadius={4}>
                        <SkeletonPlaceholder.Item>
                            <SkeletonPlaceholder.Item flexDirection="row" alignItems="center">
                                {/* Avatar */}
                                <SkeletonPlaceholder.Item width={72} height={72} borderRadius={36} marginRight={spacing.md} />
                                {/* Text lines */}
                                <SkeletonPlaceholder.Item flex={1}>
                                    <SkeletonPlaceholder.Item width={120} height={20} borderRadius={4} marginBottom={8} />
                                    <SkeletonPlaceholder.Item width={160} height={14} borderRadius={4} marginBottom={8} />
                                    <SkeletonPlaceholder.Item width={100} height={14} borderRadius={4} />
                                </SkeletonPlaceholder.Item>
                            </SkeletonPlaceholder.Item>
                        </SkeletonPlaceholder.Item>
                    </SkeletonPlaceholder>
                ) : (
                    <>
                        {/* Edit Button - Top Right */}
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={handleEditProfile}
                            activeOpacity={0.7}
                        >
                            <PencilLine size={20} color="#A9A29D" />
                        </TouchableOpacity>

                        <View style={styles.profileHeader}>
                            {/* Profile Image */}
                            <View style={styles.profileImageContainer}>
                                {profile?.profile_img ? (
                                    <Image
                                        source={{ uri: profile.profile_img }}
                                        style={styles.profileImage}
                                    />
                                ) : (
                                    <View style={styles.profileImagePlaceholder}>
                                        <User size={32} color="#0498B3" />
                                    </View>
                                )}
                            </View>

                            {/* Profile Info */}
                            <View style={styles.profileInfo}>
                                <Text style={styles.profileName}>{fullName}</Text>
                                <Text style={styles.profileEmail}>{user?.email || 'Not set'}</Text>
                                <Text style={styles.profileBirthDate}>
                                    Birth Date {formatBirthDate(profile?.birth_date)}
                                </Text>
                            </View>
                        </View>
                    </>
                )}
            </View>

            {/* Tab Bar */}
            <View style={styles.tabContainer}>
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
                        onPress={() => setActiveTab('photos')}
                    >
                        <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>
                            Photos
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
                        onPress={() => setActiveTab('activity')}
                    >
                        <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>
                            Journal
                        </Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleLogout}>
                    <Text style={{ color: '#717680', fontWeight: '400',fontSize: 15 }}>Log Out</Text>
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'photos' ? (
                isPhotosLoading && filteredPhotos.length === 0 ? (
                    <View style={styles.photoGrid}>
                        <SkeletonPlaceholder borderRadius={4}>
                            <SkeletonPlaceholder.Item flexDirection="row" flexWrap="wrap">
                                {[...Array(12)].map((_, i) => (
                                    <SkeletonPlaceholder.Item
                                        key={i}
                                        width={PHOTO_SIZE}
                                        height={PHOTO_SIZE}
                                        marginRight={(i + 1) % NUM_COLUMNS === 0 ? 0 : PHOTO_GAP}
                                        marginBottom={PHOTO_GAP}
                                    />
                                ))}
                            </SkeletonPlaceholder.Item>
                        </SkeletonPlaceholder>
                    </View>
                ) : filteredPhotos.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No photos yet</Text>
                        <Text style={styles.emptySubtext}>
                            Start scanning to see your photos here
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredPhotos}
                        renderItem={renderPhotoItem}
                        keyExtractor={(item) => item.id}
                        numColumns={NUM_COLUMNS}
                        contentContainerStyle={styles.photoGrid}
                        showsVerticalScrollIndicator={false}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                    />
                )
            ) : (
                <ActivityList />
            )}

            <SettingsDrawer
                isVisible={isSettingsVisible}
                onClose={() => setIsSettingsVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: spacing.md,
        marginTop: spacing.md + 100,
        marginBottom: spacing.md,
        paddingVertical: 20,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.09,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E9EAEB',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImageContainer: {
        marginRight: spacing.md,
    },
    profileImage: {
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    profileImagePlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontFamily: fontFamily.semiBold,
        color: '#1C1917',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        color: '#78716C',
        marginBottom: 4,
    },
    profileBirthDate: {
        fontSize: 14,
        color: '#78716C',
    },
    editButton: {
        position: 'absolute',
        zIndex: 100,
        top: 12,
        right: 12,
        padding: 8,
    },
    tabContainer: {
        marginHorizontal: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#E3E8EF',
        alignItems: 'center',
    },
    tabBar: {
        flexDirection: 'row',
    },
    tab: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: '#00839B',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '500',
        fontFamily: fontFamily.medium,
        color: '#78716C',
    },
    activeTabText: {
        color: '#1C1917',
    },
    photoGrid: {
        paddingTop: 14,
        paddingHorizontal: spacing.md,
        paddingBottom: 100,
    },
    photoItem: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        marginRight: PHOTO_GAP,
        marginBottom: PHOTO_GAP,
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    loadingMoreContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: 150,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1917',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#78716C',
        textAlign: 'center',
    },
});
