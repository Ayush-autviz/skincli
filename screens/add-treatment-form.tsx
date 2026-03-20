import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronLeft, Calendar, ChevronDown, ChevronUp, Info } from 'lucide-react-native';
import { treatmentCategories, TreatmentCategory, TreatmentSubcategory } from '../data/treatmentCategories';
import { colors, spacing } from '../styles';
import { createRoutineItem, updateRoutineItem } from '../utils/newApiService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';



const frequencyOptions = ['One-time', 'Weekly', 'Monthly', 'As Needed'];

const AddTreatmentFormScreen = (): React.JSX.Element => {
    const navigation = useNavigation();
    const route = useRoute();
    const params = route.params as any || {};
    const isEditMode = params.mode === 'edit';
    const itemId = params.itemId;

    const [selectedCategory, setSelectedCategory] = useState<TreatmentCategory | null>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<TreatmentSubcategory | null>(null);
    const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
    const [frequency, setFrequency] = useState<string>('One-time');
    const [treatmentDate, setTreatmentDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [expandedInfo, setExpandedInfo] = useState<boolean>(false);

    const scrollRef = useRef<ScrollView>(null);

    // Effect to pre-fill data in edit mode
    React.useEffect(() => {
        if (isEditMode && params.routineData) {
            const data = params.routineData;
            
            // Step 1: Find and set category
            const category = treatmentCategories.find(c => 
                c.name.toLowerCase() === data.type?.toLowerCase() || 
                c.apiType.toLowerCase() === data.type?.toLowerCase()
            );
            
            if (category) {
                setSelectedCategory(category);
                
                // Step 2: Find and set subcategory
                const subcategory = category.subcategories.find(s => 
                    s.name.toLowerCase() === data.name?.toLowerCase()
                );
                if (subcategory) {
                    setSelectedSubcategory(subcategory);
                }
            }

            // Step 3: Set Frequency
            if (data.frequency) {
                const freq = data.frequency.toLowerCase();
                if (freq === 'weekly') setFrequency('Weekly');
                else if (freq === 'as_needed' || freq === 'as needed') setFrequency('As Needed');
                else if (freq === 'monthly') setFrequency('Monthly');
                else setFrequency('One-time');
            }

            // Step 4: Set Treatment Date
            if (data.treatmentDate) {
                setTreatmentDate(new Date(data.treatmentDate));
            }
        }
    }, [isEditMode, params.routineData]);

    const handleCategorySelect = (category: TreatmentCategory) => {
        if (selectedCategory?.name === category.name) {
            setSelectedCategory(null);
            setSelectedSubcategory(null);
            setSelectedConcerns([]);
            return;
        }
        setSelectedCategory(category);
        setSelectedSubcategory(null);
        setSelectedConcerns([]);
    };

    const handleSubcategorySelect = (sub: TreatmentSubcategory) => {
        if (selectedSubcategory?.name === sub.name) {
            setSelectedSubcategory(null);
            setSelectedConcerns([]);
            return;
        }
        setSelectedSubcategory(sub);
        setSelectedConcerns([]);
        setExpandedInfo(false);
        setTimeout(() => scrollRef.current?.scrollTo({ y: 400, animated: true }), 200);
    };


    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setTreatmentDate(selectedDate);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatFrequencyForApi = (value: string): string => {
        switch (value) {
            case 'One-time': return 'as_needed';
            case 'Weekly': return 'weekly';
            case 'Monthly': return 'as_needed';
            case 'As Needed': return 'as_needed';
            default: return 'as_needed';
        }
    };

    const handleSave = async () => {
        if (!selectedCategory) {
            Alert.alert('Missing Information', 'Please select a treatment category.');
            return;
        }
        if (!selectedSubcategory) {
            Alert.alert('Missing Information', 'Please select a treatment type.');
            return;
        }
        // if (selectedConcerns.length === 0) {
        //     Alert.alert('Missing Information', 'Please select at least one concern.');
        //     return;
        // }

        setIsSaving(true);


        try {
            const apiItemData: any = {
                name: selectedSubcategory.name,
                type: selectedCategory.name,
                concern: selectedSubcategory.metricNames,
                frequency: formatFrequencyForApi(frequency),
                treatment_date: treatmentDate.toISOString().split('T')[0],
                extra: {
                    dateCreated: isEditMode && params.routineData?.extra?.dateCreated 
                        ? params.routineData.extra.dateCreated 
                        : new Date().toISOString(),
                    treatmentDate: treatmentDate.toISOString(),
                    category: selectedCategory.name,
                    subcategory: selectedSubcategory.name,
                    frequency: frequency,
                },
            };

            let response;
            if (isEditMode && itemId) {
                response = await updateRoutineItem(itemId, apiItemData);
            } else {
                response = await createRoutineItem(apiItemData);
            }

            if ((response as any).success) {
                Alert.alert('Success!', `Treatment ${isEditMode ? 'updated' : 'added to'} your routine.`, [
                    {
                        text: 'OK',
                        onPress: () =>
                            (navigation as any).navigate('Tabs', { screen: 'MyRoutine', params: { refresh: true } }),
                    },
                ]);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save treatment.');
        } finally {
            setIsSaving(false);
        }
    };

    const canSave =
        selectedCategory && selectedSubcategory

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
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
                        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Treatment' : 'Add Treatment'}</Text>
                    </View>
                    <View style={styles.rightContainer} />
                </View>
                <View style={styles.shadowLine} />
            </View>

            <ScrollView
                ref={scrollRef}
                style={styles.content}
                contentContainerStyle={{ paddingTop: 40, paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Step 1: Category */}
                <Text style={styles.sectionTitle}>Treatment category</Text>
                <View style={styles.categoryContainer}>
                    {treatmentCategories.map(cat => (
                        <TouchableOpacity
                            key={cat.name}
                            style={[
                                styles.categoryCard,
                                selectedCategory?.name === cat.name && styles.categoryCardSelected,
                            ]}
                            onPress={() => handleCategorySelect(cat)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.categoryCardText,
                                    selectedCategory?.name === cat.name && styles.categoryCardTextSelected,
                                ]}
                            >
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Step 2: Subcategory */}
                {selectedCategory && (
                    <>
                        <Text style={styles.sectionTitle}>Treatment type</Text>
                        <View style={styles.chipsContainer}>
                            {selectedCategory.subcategories.map(sub => (
                                <TouchableOpacity
                                    key={sub.name}
                                    style={[
                                        styles.chip,
                                        selectedSubcategory?.name === sub.name && styles.selectedChip,
                                    ]}
                                    onPress={() => handleSubcategorySelect(sub)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            selectedSubcategory?.name === sub.name && styles.selectedChipText,
                                        ]}
                                    >
                                        {sub.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                {/* Step 3: Description & Concerns */}
                {selectedSubcategory && (
                    <>
                        {/* Info card */}
                        {selectedSubcategory.name !== 'Facials' && (
                            <TouchableOpacity
                                style={styles.infoCard}
                                onPress={() => setExpandedInfo(!expandedInfo)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.infoCardHeader}>
                                    <Text style={styles.infoCardTitle}>
                                        About {selectedSubcategory.name}
                                    </Text>
                                </View>

                                <Text style={styles.infoCardDescription}>
                                    {selectedSubcategory.description}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Concerns */}
                        {selectedSubcategory.name !== 'Facials' && (
                            <>
                                <Text style={styles.sectionTitle}>This treatment generally addresses these concerns</Text>
                                <View style={styles.infoListContainer}>
                                    {selectedSubcategory.concerns.map(concern => (
                                        <View key={concern} style={styles.infoListItem}>
                                            <View style={styles.infoListDot} />
                                            <Text style={styles.infoListText}>{concern}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* Metric Names */}
                        {selectedSubcategory.name !== 'Facials' && selectedSubcategory.metricNames && selectedSubcategory.metricNames.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>This treatment will impact these scores</Text>
                                <View style={styles.infoListContainer}>
                                    {selectedSubcategory.metricNames.map(metric => (
                                        <View key={metric} style={styles.infoListItem}>
                                            <View style={styles.infoListDot} />
                                            <Text style={styles.infoListText}>{metric}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* Frequency */}
                        <Text style={styles.sectionTitle}>Frequency</Text>
                        <View style={styles.chipsContainer}>
                            {frequencyOptions.map(opt => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[
                                        styles.chip,
                                        frequency === opt && styles.selectedChip,
                                    ]}
                                    onPress={() => setFrequency(opt)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            frequency === opt && styles.selectedChipText,
                                        ]}
                                    >
                                        {opt}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Treatment Date */}
                        <Text style={styles.sectionTitle}>When was this treatment?</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={styles.dateText}>{formatDate(treatmentDate)}</Text>
                            <Calendar size={20} color="#57534E" />
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={treatmentDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDateChange}
                                maximumDate={new Date()}
                            />
                        )}
                    </>
                )}

                {/* Save Button - Only show when both category and treatment type are selected */}
                {selectedCategory && selectedSubcategory && (
                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            (!canSave || isSaving) && styles.disabledButton,
                        ]}
                        onPress={handleSave}
                        disabled={!canSave || isSaving}
                    >
                        <Text style={styles.saveButtonText}>
                            {isSaving ? 'Saving...' : (isEditMode ? 'Update Treatment' : 'Save Treatment')}
                        </Text>
                    </TouchableOpacity>
                )}
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
        height: 105,
        backgroundColor: colors.background,
        borderBottomWidth: 0.4,
        justifyContent: 'flex-end',
        borderBottomColor: '#E5E5E5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        marginTop: -4,
    },

    // Category cards
    categoryContainer: {
        gap: 10,
    },
    categoryCard: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: '#F5F5F4',
        borderWidth: 1.5,
        borderColor: '#E7E5E4',
    },
    categoryCardSelected: {
        backgroundColor: '#0498B3',
        borderColor: '#0498B3',
    },
    categoryCardText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#57534E',
    },
    categoryCardTextSelected: {
        color: '#FFFFFF',
    },

    // Chips
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
    infoListContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    infoListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%',
        marginBottom: 10,
        paddingRight: 8,
    },
    infoListDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#0498B3',
        marginRight: 10,
    },
    infoListText: {
        fontSize: 14,
        color: '#57534E',
        flex: 1,
        lineHeight: 18,
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

    // Info card
    infoCard: {
        marginTop: 20,
        backgroundColor: '#FAFAF9',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E7E5E4',
    },
    infoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoCardTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: '#44403C',
    },
    infoCardDescription: {
        fontSize: 14,
        color: '#4B5565',
        lineHeight: 20,
        marginTop: 10,
    },

    // Date input
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

    // Save button
    saveButton: {
        backgroundColor: '#0498B3',
        paddingVertical: 12,
        paddingHorizontal: spacing.lg,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 28,
        // marginBottom: 50,
    },
    disabledButton: {
        backgroundColor: '#D6D3D1',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default AddTreatmentFormScreen;
