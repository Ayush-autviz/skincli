export interface TreatmentSubcategory {
    name: string;
    description: string;
    concerns: string[];
    metricNames: string[];
}

export interface TreatmentCategory {
    name: string;
    apiType: string;
    subcategories: TreatmentSubcategory[];
}

export const treatmentCategories: TreatmentCategory[] = [
    {
        name: 'Injectables',
        apiType: 'treatment_injection',
        subcategories: [
            {
                name: 'Neuromodulators',
                description:
                    'Botulinum toxin injections are one option that may be used by a healthcare provider to reduce the appearance of facial wrinkles. These treatments work by temporarily decreasing muscle activity in targeted areas of the face. By relaxing muscles involved in facial expression, botulinum toxin injections can soften dynamic wrinkles, which are lines that form with repeated movements such as frowning, squinting, smiling, or raising the eyebrows.',
                concerns: [
                    'Dynamic facial lines',
                    'Frown lines',
                    "Crow's feet",
                    'Forehead lines',
                    'Brow positioning',
                    'Neck lines',
                    'Lines around lips',
                ],
                metricNames: [
                    'Lines',
                    'Dark Circles'
                ]
            },
            {
                name: 'Hyaluronic Acid Dermal Fillers',
                description:
                    'Dermal filler injections are one option that may be used by a healthcare provider to address age-related changes in facial volume and contour. These treatments involve the placement of injectable materials beneath the skin and may be considered to soften certain lines or folds and support facial structure. The procedure is typically performed in an outpatient setting, with effects that may be visible shortly after treatment and vary by individual.',
                concerns: [
                    'Age-related volume changes',
                    'Under-eye hollowing',
                    'Lines near the mouth',
                    'Changes in lip volume',
                    'Facial contour concerns',
                    'Acne scars',
                ],
                metricNames: [
                    'Lines',
                ]
            },
            {
                name: 'Biostimulatory Dermal Fillers',
                description:
                    "Work by supporting the skin’s natural collagen production. Rather than providing only immediate filling, these products help improve skin structure gradually over time. Some initial changes may be seen after treatment, with additional improvement developing over weeks to months. Results can vary by individual and treatment area. The effects are not permanent but tend to last longer than traditional hyaluronic acid fillers.",
                concerns: [
                    'Volume loss',
                    'Deeper facial folds',
                    'Contour support',
                ],
                metricNames: [
                    'Lines',
                ]
            },
            {
                name: 'Permanent Dermal Fillers',
                description:
                    'Permanent dermal fillers are injectable materials designed to provide long-lasting structural support. Unlike temporary fillers, these products are not naturally absorbed by the body and are used selectively in carefully chosen situations.',
                concerns: [
                    'Volume loss',
                    'Deeper facial folds',
                    'Contour support',
                ],
                metricNames: [
                    'Lines',
                ]
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
                    'Superficial microneedling involves shallow needle penetration limited to the upper layers of the skin. These treatments are often performed by licensed aestheticians or with at-home devices and are intended to support skin texture, tone, and product absorption. Temporary redness or mild swelling may occur, with little to no downtime. This approach is not designed to induce significant collagen remodeling.',
                concerns: ['Skin refresh'],
                metricNames: [
                    'Evenness',
                    'Visible Pores'
                ]
            },
            {
                name: 'Medical Microneedling',
                description:
                    'Medical microneedling uses greater needle depths to reach the dermis and is typically performed by a physician or trained medical provider. This approach is intended to stimulate collagen and elastin production and may be considered for concerns such as acne scarring, deeper wrinkles, or skin laxity. Swelling, redness, and downtime may be more pronounced, and results develop gradually over time as the skin remodels.',
                concerns: ['Acne scars', 'Fine lines', 'Mild laxity'],
                metricNames: [
                    'Evenness',
                    'Visible Pores'
                ]
            },
            {
                name: 'Superficial Chemical Peels',
                description:
                    'Superficial chemical peels gently exfoliate the outermost layer of skin to improve brightness, texture, and tone. They are commonly used to address dullness, mild discoloration, fine lines, and acne. These peels require little to no downtime and are often described as a “refresh” for the skin. Results are gradual and best achieved with a series of treatments.',
                concerns: [
                    'Skin refresh',
                    'Mild discoloration',
                    'Mild acne',
                    'Fine lines',
                    'Lines around lips',
                ],
                metricNames: [
                    'Evenness',
                    'Breakouts'
                ]
            },
            {
                name: 'Medium-Depth Chemical Peels',
                description:
                    'Medium-depth chemical peels penetrate beyond the surface to target more noticeable skin concerns such as uneven tone, sun damage, fine to moderate wrinkles, and acne scarring. These peels stimulate stronger skin renewal and collagen production than superficial peels. Some peeling and downtime are expected, with visible improvement as the skin heals. Results are longer-lasting and more dramatic than lighter peels.',
                concerns: [
                    'Hyperpigmentation',
                    'Melasma',
                    'Sun damage',
                    'Acne scarring',
                    'Fine lines',
                ],
                metricNames: [
                    'Evenness',
                ]
            },
            {
                name: 'Deep Chemical Peels',
                description:
                    'Deep chemical peels reach deeper layers of the skin to address significant sun damage, deep wrinkles, scars, and uneven texture. They provide the most dramatic skin resurfacing results and typically require a longer recovery period. Because of their intensity, deep peels are performed less frequently and under close medical supervision. The results can be transformative and long-lasting.',
                concerns: [
                    'Hyperpigmentation',
                    'Melasma',
                    'Sun damage',
                    'Acne scarring',
                    'Dullness',
                    'Deep lines',
                ],
                metricNames: [
                    'Evenness',
                ]
            },
            {
                name: 'Microdermabrasion',
                description:
                    'Microdermabrasion is a non-invasive exfoliating treatment that gently removes the outermost layer of dead skin cells to improve brightness, smoothness, and texture.',
                concerns: ['Dull skin', 'Rough texture', 'Congestion'],
                metricNames: [
                    'Evenness',
                ]
            },
            {
                name: 'Facials',
                description: 'Facials are a great way to care for and maintain your skin. They usually include cleansing, steam, extractions, exfoliation, masks, and hydration, helping keep your skin feeling refreshed and well cared for.',
                concerns: [],
                metricNames: []
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
                metricNames: [
                    'Evenness',
                    'Pigmentation'
                ]
            },
            {
                name: 'Laser Resurfacing',
                description:
                    'Laser resurfacing uses focused light energy to remove damaged skin layers and stimulate collagen, improving wrinkles, texture, scars, and tone.',
                concerns: [
                    'Fine lines',
                    'Acne scars',
                    'Sun damage',
                    'Texture',
                    'Skin tightening',
                ],
                metricNames: [
                    'Lines',
                    'Evenness'
                ]
            },
            {
                name: 'LED Light Therapy',
                description:
                    'LED light therapy uses specific wavelengths of light to support skin healing, reduce inflammation, and improve acne and redness without heat or downtime.',
                concerns: [
                    'Acne',
                    'Redness',
                    'Inflammation',
                    'Collagen stimulation',
                ],
                metricNames: [
                    'Redness',
                ]
            },
        ],
    },
];
