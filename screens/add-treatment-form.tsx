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
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronLeft, Calendar, ChevronDown, ChevronUp, Info } from 'lucide-react-native';
import { colors, spacing } from '../styles';
import { createRoutineItem } from '../utils/newApiService';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TreatmentSubcategory {
    name: string;
    description: string;
    concerns: string[];
}

interface TreatmentCategory {
    name: string;
    apiType: string;
    subcategories: TreatmentSubcategory[];
}

const treatmentCategories: TreatmentCategory[] = [
    {
        name: 'Injectables',
        apiType: 'treatment_injection',
        subcategories: [
            {
                name: 'Neuromodulators',
                description:
                    'Botulinum toxin injections are one option that may be used by a healthcare provider to reduce the appearance of facial wrinkles. These treatments work by temporarily decreasing muscle activity in targeted areas of the face.',
                concerns: [
                    'Dynamic facial lines',
                    'Frown lines',
                    "Crow's feet",
                    'Forehead lines',
                    'Brow positioning',
                    'Neck lines',
                    'Lines around lips',
                ],
            },
            {
                name: 'Hyaluronic Acid Dermal Fillers',
                description:
                    'Dermal filler injections involve the placement of injectable materials beneath the skin to soften certain lines or folds and support facial structure. Effects may be visible shortly after treatment.',
                concerns: [
                    'Age-related volume changes',
                    'Under-eye hollowing',
                    'Lines near the mouth',
                    'Changes in lip volume',
                    'Facial contour concerns',
                    'Acne scars',
                ],
            },
            {
                name: 'Biostimulatory Dermal Fillers',
                description:
                    "These products support the skin's natural collagen production. Rather than providing only immediate filling, they help improve skin structure gradually over time with results developing over weeks to months.",
                concerns: [
                    'Volume loss',
                    'Deeper facial folds',
                    'Contour support',
                ],
            },
            {
                name: 'Permanent Dermal Fillers',
                description:
                    'Permanent dermal fillers are injectable materials designed to provide long-lasting structural support. Unlike temporary fillers, these products are not naturally absorbed by the body.',
                concerns: [
                    'Volume loss',
                    'Deeper facial folds',
                    'Contour support',
                ],
            },
        ],
    },
    {
        name: 'Non-Surgical Skin Treatments',
        apiType: 'treatment_facial',
        subcategories: [
            {
                name: 'Cosmetic Microneedling',
                description:
                    'Superficial microneedling involves shallow needle penetration limited to the upper layers of the skin. Intended to support skin texture, tone, and product absorption with little to no downtime.',
                concerns: ['Skin refresh'],
            },
            {
                name: 'Medical Microneedling',
                description:
                    'Uses greater needle depths to reach the dermis. Intended to stimulate collagen and elastin production for concerns such as acne scarring, deeper wrinkles, or skin laxity.',
                concerns: ['Acne scars', 'Fine lines', 'Mild laxity'],
            },
            {
                name: 'Superficial Chemical Peels',
                description:
                    'Gently exfoliate the outermost layer of skin to improve brightness, texture, and tone. Commonly used to address dullness, mild discoloration, fine lines, and acne.',
                concerns: [
                    'Skin refresh',
                    'Mild discoloration',
                    'Mild acne',
                    'Fine lines',
                ],
            },
            {
                name: 'Medium-Depth Chemical Peels',
                description:
                    'Penetrate beyond the surface to target more noticeable skin concerns. Stimulate stronger skin renewal and collagen production than superficial peels.',
                concerns: [
                    'Hyperpigmentation',
                    'Melasma',
                    'Sun damage',
                    'Acne scarring',
                    'Fine lines',
                ],
            },
            {
                name: 'Deep Chemical Peels',
                description:
                    'Reach deeper layers of the skin to address significant sun damage, deep wrinkles, scars, and uneven texture. Results can be transformative and long-lasting.',
                concerns: [
                    'Hyperpigmentation',
                    'Melasma',
                    'Sun damage',
                    'Acne scarring',
                    'Dullness',
                    'Deep lines',
                ],
            },
            {
                name: 'Microdermabrasion',
                description:
                    'A non-invasive exfoliating treatment that gently removes the outermost layer of dead skin cells to improve brightness, smoothness, and texture.',
                concerns: ['Dull skin', 'Rough texture', 'Congestion'],
            },
        ],
    },
    {
        name: 'Laser / Light Based Devices',
        apiType: 'treatment_other',
        subcategories: [
            {
                name: 'IPL / Photofacial',
                description:
                    'IPL uses broad-spectrum light to target pigment, redness, sun damage, and uneven tone while stimulating collagen production over time.',
                concerns: [
                    'Sunspots',
                    'Brown pigmentation',
                    'Redness',
                    'Broken capillaries',
                ],
            },
            {
                name: 'Laser Resurfacing',
                description:
                    'Uses focused light energy to remove damaged skin layers and stimulate collagen, improving wrinkles, texture, scars, and tone.',
                concerns: [
                    'Fine lines',
                    'Acne scars',
                    'Sun damage',
                    'Texture',
                    'Skin tightening',
                ],
            },
            {
                name: 'LED Light Therapy',
                description:
                    'Uses specific wavelengths of light to support skin healing, reduce inflammation, and improve acne and redness without heat or downtime.',
                concerns: [
                    'Acne',
                    'Redness',
                    'Inflammation',
                    'Collagen stimulation',
                ],
            },
        ],
    },
];

const frequencyOptions = ['One-time', 'Weekly', 'Monthly', 'As Needed'];

const AddTreatmentFormScreen = (): React.JSX.Element => {
    const navigation = useNavigation();

    const [selectedCategory, setSelectedCategory] = useState<TreatmentCategory | null>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<TreatmentSubcategory | null>(null);
    const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
    const [frequency, setFrequency] = useState<string>('One-time');
    const [treatmentDate, setTreatmentDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [expandedInfo, setExpandedInfo] = useState<boolean>(false);

    const scrollRef = useRef<ScrollView>(null);

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

    const handleConcernToggle = (concern: string) => {
        setSelectedConcerns(prev => {
            if (prev.includes(concern)) {
                return prev.filter(c => c !== concern);
            }
            return [...prev, concern];
        });
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
        if (selectedConcerns.length === 0) {
            Alert.alert('Missing Information', 'Please select at least one concern.');
            return;
        }

        setIsSaving(true);

        try {
            const apiItemData: any = {
                name: selectedSubcategory.name,
                type: selectedCategory.apiType,
                concern: selectedConcerns,
                frequency: formatFrequencyForApi(frequency),
                treatment_date: treatmentDate.toISOString().split('T')[0],
                extra: {
                    dateCreated: new Date().toISOString(),
                    treatmentDate: treatmentDate.toISOString(),
                    category: selectedCategory.name,
                    subcategory: selectedSubcategory.name,
                    frequency: frequency,
                },
            };

            const response = await createRoutineItem(apiItemData);

            if ((response as any).success) {
                Alert.alert('Success!', 'Treatment added to your routine.', [
                    {
                        text: 'OK',
                        onPress: () =>
                            (navigation as any).navigate('Tabs', { screen: 'Routine' }),
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
        selectedCategory && selectedSubcategory && selectedConcerns.length > 0;

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
                        <Text style={styles.headerTitle}>Add Treatment</Text>
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

                        {/* Concerns */}
                        <Text style={styles.sectionTitle}>What concerns are you addressing?</Text>
                        <Text style={styles.subTitle}>Select all that apply</Text>
                        <View style={styles.chipsContainer}>
                            {selectedSubcategory.concerns.map(concern => (
                                <TouchableOpacity
                                    key={concern}
                                    style={[
                                        styles.chip,
                                        selectedConcerns.includes(concern) && styles.selectedChip,
                                    ]}
                                    onPress={() => handleConcernToggle(concern)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            selectedConcerns.includes(concern) && styles.selectedChipText,
                                        ]}
                                    >
                                        {concern}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Frequency */}
                        <Text style={styles.sectionTitle}>How often?</Text>
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
                            {isSaving ? 'Saving...' : 'Save Treatment'}
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
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
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
        marginBottom: 50,
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
