// add-product-form.tsx
// Form screen for adding a product to routine - Custom UI

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, Calendar } from 'lucide-react-native';
import { colors, fontSize, spacing, typography, borderRadius, shadows } from '../styles';
import { createRoutineItem } from '../utils/newApiService';

interface AddProductFormParams {
    productData: any;
    upc?: string;
    prefilledName?: string;
}

const measurableConcerns = [
    'Pigmentation',
    'Dewiness',
    'Redness',
    'Lines',
    'Visible Pores',
    'Eye Area',
    'Dry Skin'
];

const allConcerns = [
    'Anti-aging (eyes)',
    'Evenness',
    'Other',
    'Dry Skin',
    'Enlarged Pores',
    'Jowls',
    'Looking Tired',
    'Sagging',
    'Sensitive Skin',
    'Sun Damage',
    'Under Eye Circles',
    'Wrinkles',
    'I don\'t know',
    'Other'
];

const frequencyOptions = [
    'Daily',
    'Weekly',
    'As Needed'
];

const timeOptions = [
    'AM / Mornings',
    'PM / Evenings',
    'Both AM/PM',
    'As Needed'
];

const AddProductFormScreen = (): React.JSX.Element => {
    const navigation = useNavigation();
    const route = useRoute();
    const params = route.params as AddProductFormParams || {};
    const { productData, upc, prefilledName } = params;

    const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
    const [frequency, setFrequency] = useState<string>('Daily');
    const [timeOfDay, setTimeOfDay] = useState<string>('AM / Mornings');
    const [startDate, setStartDate] = useState<Date>(new Date());
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
        setShowDatePicker(false);
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
                name: prefilledName || productData?.product_name || 'New Product',
                type: 'product',
                concern: selectedConcerns,
                extra: {
                    dateCreated: new Date().toISOString()
                }
            };

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

            const response = await createRoutineItem(apiItemData);

            if ((response as any).success) {
                Alert.alert('Success!', 'Product added to your routine.', [
                    {
                        text: 'OK',
                        onPress: () => (navigation as any).navigate('Tabs', { screen: 'Routine' })
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
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1C1917" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add to Routine</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Use this product for</Text>

                <Text style={styles.subTitle}>Measurable concerns</Text>
                <View style={styles.chipsContainer}>
                    {measurableConcerns.map((concern) => (
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

                <Text style={styles.subTitle}>All Concerns</Text>
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
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                    <Calendar size={20} color="#57534E" />
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={startDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                    />
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    <Text style={styles.saveButtonText}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F4',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1917',
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
        backgroundColor: '#00839B',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        backgroundColor: '#A8A29E',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default AddProductFormScreen;
