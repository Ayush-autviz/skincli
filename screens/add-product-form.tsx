// add-product-form.tsx
// Form screen for adding a product to routine - Custom UI

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronLeft, Calendar } from 'lucide-react-native';
import { colors, fontSize, spacing, typography, borderRadius, shadows } from '../styles';
import { createRoutineItem, updateRoutineItem } from '../utils/newApiService';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AddProductFormParams {
    productData?: any;
    upc?: string;
    prefilledName?: string;
    itemId?: string;
    mode?: 'add' | 'edit';
    routineData?: any;
}

const allConcerns = [
    'Anti-aging (eyes)',
    'Anti-Aging (Face)',
    'Breakouts',
    'Cleanser',
    'Crepey Skin',
    'Dewiness',
    'Dry Skin',
    'Enlarged Pores',
    'Evenness',
    'Eye Area',
    'Jowls',
    'Lines',
    'Looking Tired',
    'Other',
    'Pigmentation',
    'Redness',
    'Sagging',
    'Sensitive Skin',
    'Sun Damage',
    'Sun Protection',
    'Under Eye Circles',
    'Visible Pores',
    'Wrinkles',
    'I don\'t know'
];

const frequencyOptions = [
    'Daily',
    'Weekly',
    // 'As Needed'
];

const timeOptions = [
    'AM',
    'PM',
    'Both AM/PM',
    // 'As Needed'
];

const AddProductFormScreen = (): React.JSX.Element => {
    const navigation = useNavigation();
    const route = useRoute();
    const params = route.params as AddProductFormParams || {};
    const { productData, upc, prefilledName, itemId, mode, routineData } = params;
    const isEditMode = mode === 'edit';

    const [selectedConcerns, setSelectedConcerns] = useState<string[]>(routineData?.concerns || []);
    const [frequency, setFrequency] = useState<string>(() => {
        if (routineData?.frequency === 'daily') return 'Daily';
        if (routineData?.frequency === 'weekly') return 'Weekly';
        return 'Daily';
    });
    const [timeOfDay, setTimeOfDay] = useState<string>(() => {
        if (routineData?.usage === 'am') return 'AM / Mornings';
        if (routineData?.usage === 'pm') return 'PM / Evenings';
        if (routineData?.usage === 'both') return 'Both AM/PM';
        return 'AM / Mornings';
    });
    const [startDate, setStartDate] = useState<Date>(routineData?.dateStarted ? new Date(routineData.dateStarted) : new Date());
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const handleConcernToggle = (concern: string) => {
        setSelectedConcerns(prev => {
            if (prev.includes(concern)) {
                return prev.filter(c => c !== concern);
            } else {
                return [...prev, concern];
            }
        });
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (event.type === 'dismissed') {
            return;
        }

        if (selectedDate) {
            setStartDate(selectedDate);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Format parameters for backend
    const formatParameter = (value: string): string => {
        if (!value) return value;
        // Handle frequency
        if (value === 'Daily' || value === 'Weekly' || value === 'As Needed') {
            return value === 'As Needed' ? 'as_needed' : value.toLowerCase();
        }
        // Handle usage
        if (value === 'AM / Mornings') return 'am';
        if (value === 'PM / Evenings') return 'pm';
        if (value === 'Both AM/PM') return 'both';
        if (value === 'As Needed') return 'as_needed';

        return value.toLowerCase();
    };

    const handleSave = async () => {
        if (selectedConcerns.length === 0) {
            Alert.alert('Missing Information', 'Please select at least one concern.');
            return;
        }

        setIsSaving(true);

        try {
            const apiItemData: any = {
                name: prefilledName || productData?.product_name || routineData?.name || 'New Product',
                type: 'product',
                concern: selectedConcerns,
                extra: {
                    ...(routineData?.extra || {}),
                    dateUpdated: new Date().toISOString()
                }
            };

            if (!isEditMode) {
                apiItemData.extra.dateCreated = new Date().toISOString();
            }

            if (upc && productData) {
                apiItemData.upc = upc;
                apiItemData.extra = {
                    ...apiItemData.extra,
                    brand: productData.brand,
                    ingredients: productData.ingredients || [],
                    good_for: productData.good_for || [],
                    product_id: productData.product_id,
                    total_ingredients: productData.total_ingredients
                };
            }

            apiItemData.usage = formatParameter(timeOfDay);
            apiItemData.frequency = formatParameter(frequency);
            apiItemData.start_date = startDate.toISOString().split('T')[0];
            apiItemData.extra.dateStarted = startDate.toISOString();

            console.log('🟡 AddProductForm: API Item Data:', apiItemData);

            let response;
            if (isEditMode && itemId) {
                response = await updateRoutineItem(itemId, apiItemData);
            } else {
                response = await createRoutineItem(apiItemData);
            }

            if ((response as any).success) {
                Alert.alert('Success!', isEditMode ? 'Product updated successfully.' : 'Product added to your routine.', [
                    {
                        text: 'OK',
                        onPress: () => (navigation as any).navigate('Tabs', { screen: 'MyRoutine' })
                    }
                ]);
            }
        } catch (error: any) {
            console.error('🔴 AddProductForm: Error saving item:', error);
            Alert.alert('Error', error.message || 'Failed to save item.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            {/* Header - same as Product Detail */}
            <View style={styles.headerContainer}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <View style={styles.iconContainer}>
                            <ChevronLeft size={30} color={"#44403C"} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.titleContainer}>
                        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Product' : 'Add to Routine'}</Text>
                    </View>

                    <View style={styles.rightContainer} />
                </View>
                <View style={styles.shadowContainer} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 40 : 50 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Tell us why you are using this product</Text>

                <View style={styles.chipsContainer}>
                    {allConcerns.map((concern) => (
                        <TouchableOpacity
                            key={concern}
                            style={[
                                styles.chip,
                                selectedConcerns.includes(concern) && styles.selectedChip
                            ]}
                            onPress={() => handleConcernToggle(concern)}
                        >
                            <Text style={[
                                styles.chipText,
                                selectedConcerns.includes(concern) && styles.selectedChipText
                            ]}>{concern}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Frequency</Text>
                <View style={styles.chipsContainer}>
                    {frequencyOptions.map((opt) => (
                        <TouchableOpacity
                            key={opt}
                            style={[
                                styles.chip,
                                frequency === opt && styles.selectedChip
                            ]}
                            onPress={() => setFrequency(opt)}
                        >
                            <Text style={[
                                styles.chipText,
                                frequency === opt && styles.selectedChipText
                            ]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Time of day</Text>
                <View style={styles.chipsContainer}>
                    {timeOptions.map((opt) => (
                        <TouchableOpacity
                            key={opt}
                            style={[
                                styles.chip,
                                timeOfDay === opt && styles.selectedChip
                            ]}
                            onPress={() => setTimeOfDay(opt)}
                        >
                            <Text style={[
                                styles.chipText,
                                timeOfDay === opt && styles.selectedChipText
                            ]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>When did you start using this product?</Text>
                <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(!showDatePicker)}
                >
                    <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                    {showDatePicker ? (
                        <Text style={styles.doneText}>Done</Text>
                    ) : (
                        <Calendar size={20} color="#57534E" />
                    )}
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={startDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                        textColor="#1C1917"
                        themeVariant="light"
                        style={Platform.OS === 'ios' ? { backgroundColor: '#F5F5F4', borderRadius: 12, marginTop: 10 } : undefined}
                    />
                )}
                <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    <Text style={styles.saveButtonText}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>




        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: Platform.OS === 'ios' ? 105 : 85,
        backgroundColor: colors.background,
        borderBottomWidth: 0.4,
        justifyContent: 'flex-end',
        borderBottomColor: '#E5E5E5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // paddingTop: 55,
        backgroundColor: colors.background,
        paddingBottom: 10,
        paddingHorizontal: spacing.lg,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
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
    shadowContainer: {
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
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#44403C',
        marginTop: 24,
        marginBottom: 12,
    },
    subTitle: {
        fontSize: 14,
        color: '#A8A29E',
        marginBottom: 12,
        marginTop: 8,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#F5F5F4',
        borderWidth: 1,
        borderColor: '#E7E5E4',
    },
    selectedChip: {
        backgroundColor: '#57534E',
        borderColor: '#57534E',
    },
    chipText: {
        fontSize: 14,
        color: '#57534E',
        fontWeight: '500',
    },
    selectedChipText: {
        color: '#FFFFFF',
    },
    dateInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F5F5F4',
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
    },
    dateText: {
        fontSize: 16,
        color: '#1C1917',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F4',
        backgroundColor: '#FFFFFF',
    },
    saveButton: {
        backgroundColor: '#0498B3',
        paddingVertical: 12,
        paddingHorizontal: spacing.lg,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 50
    },
    disabledButton: {
        backgroundColor: '#A8A29E',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    doneText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0498B3',
    },
});

export default AddProductFormScreen;
