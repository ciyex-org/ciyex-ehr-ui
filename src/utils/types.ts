





export type ApiResponse<T> = {
    success: boolean;
    message?: string;
    data?: T;
};

export type Audit = {
    createdDate?: string | number[];
    lastModifiedDate?: string | number[];
};

export type EncounterDto = {
    id?: number;
    patientId: number;
    encounterDate?: string;
    reason?: string;
    status?: "OPEN" | "CLOSED";
    audit?: Audit;
    visitCategory?: string;
    type?: string;

    dateOfService?: string;
    reasonForVisit?: string;
};


export type PatientMedicalHistoryDto = {
    id?: number;
    patientId: number;
    encounterId: number;
    description: string;
    esigned?: boolean;
    signedAt?: string;
    signedBy?: string;
    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};

export type ChiefComplaintDto = {
    id?: number;
    patientId: number;
    encounterId: number;
    complaint: string;
    details?: string;
    esigned?: boolean;
    signedAt?: string;
    signedBy?: string;
    // Your backend returns createdAt/updatedAt either as strings or arrays (e.g., [2025,8,18,0,0])
    createdAt?: string | number[];
    updatedAt?: string | number[];
};
// --- HPI (History of Present Illness) ---

// --- HPI (History of Present Illness) — compact schema ---
export type HpiDto = {
    id?: number;
    externalId?: string | null;
    orgId?: number;
    patientId: number;
    encounterId: number;
    esigned?: boolean;
    signedAt?: string;
    signedBy?: string;
    // backend uses this single field
    description: string;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};


export type RosDto = {
    id?: number;
    externalId?: string;
    fhirId?: string;
    patientId: number;
    encounterId: number;

    constitutional?: RosConstitutional;
    eyes?: RosEyes;
    ent?: RosEnt;
    neck?: RosNeck;
    cardiovascular?: RosCardiovascular;
    respiratory?: RosRespiratory;
    gastrointestinal?: RosGastrointestinal;
    genitourinaryMale?: RosGenitourinaryMale;
    genitourinaryFemale?: RosGenitourinaryFemale;
    musculoskeletal?: RosMusculoskeletal;
    skin?: RosSkin;
    neurologic?: RosNeurologic;
    psychiatric?: RosPsychiatric;
    endocrine?: RosEndocrine;
    hematologicLymphatic?: RosHematologicLymphatic;
    allergicImmunologic?: RosAllergicImmunologic;

    eSigned?: boolean;
    signedAt?: string;
    signedBy?: string;
    printedAt?: string;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};

export type RosConstitutional = {
    fever?: boolean;
    chills?: boolean;
    nightSweats?: boolean;
    lossOfAppetite?: boolean;
    weightLoss?: boolean;
    weightGain?: boolean;
    fatigue?: boolean;
    weakness?: boolean;
    tiredness?: boolean;
    troubleSleeping?: boolean;
    note?: string;
};

export type RosEyes = {
    visionLoss?: boolean;
    doubleVision?: boolean;
    blurredVision?: boolean;
    eyeIrritation?: boolean;
    eyePain?: boolean;
    eyeDischarge?: boolean;
    lightSensitivity?: boolean;
    eyeRedness?: boolean;
    note?: string;
};

export type RosEnt = {
    earache?: boolean;
    earDischarge?: boolean;
    ringingInEars?: boolean;
    decreasedHearing?: boolean;
    frequentColds?: boolean;
    nasalCongestion?: boolean;
    nosebleeds?: boolean;
    bleedingGums?: boolean;
    difficultySwallowing?: boolean;
    hoarseness?: boolean;
    soreThroat?: boolean;
    dryLips?: boolean;
    redSwollenTongue?: boolean;
    toothAche?: boolean;
    sinusitis?: boolean;
    dryMouth?: boolean;
    note?: string;
};

export type RosNeck = {
    thyroidEnlargement?: boolean;
    neckPain?: boolean;
    note?: string;
};

export type RosCardiovascular = {
    difficultyBreathingAtNight?: boolean;
    chestPain?: boolean;
    irregularHeartbeats?: boolean;
    shortnessOfBreathOnExertion?: boolean;
    palpitations?: boolean;
    difficultyBreathingWhenLyingDown?: boolean;
    rapidHeartbeat?: boolean;
    slowHeartbeat?: boolean;
    lossOfConsciousness?: boolean;
    chestDiscomfort?: boolean;
    chestTightness?: boolean;
    legSwelling?: boolean;
    legCramps?: boolean;
    tortuousLegVeins?: boolean;
    note?: string;
};

export type RosRespiratory = {
    shortnessOfBreath?: boolean;
    wheezing?: boolean;
    cough?: boolean;
    chestDiscomfort?: boolean;
    snoring?: boolean;
    excessiveSputum?: boolean;
    coughingUpBlood?: boolean;
    painfulBreathing?: boolean;
    note?: string;
};

export type RosGastrointestinal = {
    changeInAppetite?: boolean;
    indigestion?: boolean;
    heartburn?: boolean;
    nausea?: boolean;
    vomiting?: boolean;
    excessiveGas?: boolean;
    abdominalPain?: boolean;
    abdominalBloating?: boolean;
    hemorrhoids?: boolean;
    diarrhea?: boolean;
    changeInBowelHabits?: boolean;
    constipation?: boolean;
    blackOrTarryStools?: boolean;
    bloodyStools?: boolean;
    abdominalSwelling?: boolean;
    enlargedLiver?: boolean;
    jaundice?: boolean;
    ascites?: boolean;
    vomitingBlood?: boolean;
    distendedAbdomen?: boolean;
    clayColoredStool?: boolean;
    note?: string;
};

export type RosGenitourinaryMale = {
    frequentUrination?: boolean;
    bloodInUrine?: boolean;
    foulUrinaryDischarge?: boolean;
    kidneyPain?: boolean;
    urinaryUrgency?: boolean;
    troubleStartingUrine?: boolean;
    inabilityToEmptyBladder?: boolean;
    burningOnUrination?: boolean;
    genitalRashesOrSores?: boolean;
    testicularPainOrMasses?: boolean;
    urinaryRetention?: boolean;
    leakingUrine?: boolean;
    excessiveNightUrination?: boolean;
    urinaryHesitancy?: boolean;
    kidneyStones?: boolean;
    hernia?: boolean;
    penileDischarge?: boolean;
    shortWeakErections?: boolean;
    painfulErection?: boolean;
    decreasedSexualDesire?: boolean;
    prematureEjaculation?: boolean;
    note?: string;
};

export type RosGenitourinaryFemale = {
    inabilityToControlBladder?: boolean;
    unusualUrinaryColor?: boolean;
    missedPeriods?: boolean;
    excessivelyHeavyPeriods?: boolean;
    lumpsOrSores?: boolean;
    pelvicPain?: boolean;
    urinaryRetention?: boolean;
    vaginalDischarge?: boolean;
    vaginalItching?: boolean;
    vaginalRash?: boolean;
    urinaryFrequency?: boolean;
    urinaryHesitancy?: boolean;
    excessiveNightUrination?: boolean;
    urinaryUrgency?: boolean;
    painfulMenstruation?: boolean;
    irregularMenses?: boolean;
    kidneyStones?: boolean;
    note?: string;
};

export type RosMusculoskeletal = {
    jointPain?: boolean;
    jointStiffness?: boolean;
    backPain?: boolean;
    muscleCramps?: boolean;
    muscleWeakness?: boolean;
    muscleAches?: boolean;
    lossOfStrength?: boolean;
    neckPain?: boolean;
    swellingHandsFeet?: boolean;
    legCramps?: boolean;
    shoulderPain?: boolean;
    elbowPain?: boolean;
    handPain?: boolean;
    hipPain?: boolean;
    thighPain?: boolean;
    calfPain?: boolean;
    legPain?: boolean;
    wristPain?: boolean;
    fingerPain?: boolean;
    heelPain?: boolean;
    toePain?: boolean;
    anklePain?: boolean;
    kneePain?: boolean;
    note?: string;
};

export type RosSkin = {
    suspiciousLesions?: boolean;
    excessivePerspiration?: boolean;
    poorWoundHealing?: boolean;
    dryness?: boolean;
    itching?: boolean;
    rash?: boolean;
    flushing?: boolean;
    cyanosis?: boolean;
    clammySkin?: boolean;
    hairLoss?: boolean;
    lumps?: boolean;
    changesInHairOrNails?: boolean;
    skinColorChanges?: boolean;
    jaundice?: boolean;
    note?: string;
};

export type RosNeurologic = {
    headaches?: boolean;
    poorBalance?: boolean;
    difficultySpeaking?: boolean;
    difficultyConcentrating?: boolean;
    coordinationProblems?: boolean;
    weakness?: boolean;
    briefParalysis?: boolean;
    numbness?: boolean;
    tingling?: boolean;
    visualDisturbances?: boolean;
    seizures?: boolean;
    tremors?: boolean;
    roomSpinning?: boolean;
    memoryLoss?: boolean;
    excessiveDaytimeSleepiness?: boolean;
    dizziness?: boolean;
    facialPain?: boolean;
    lightheadedness?: boolean;
    faintingSpells?: boolean;
    lethargy?: boolean;
    insomnia?: boolean;
    somnolence?: boolean;
    disorientation?: boolean;
    note?: string;
};

export type RosPsychiatric = {
    anxiety?: boolean;
    nervousness?: boolean;
    depression?: boolean;
    hallucinations?: boolean;
    frighteningVisionsOrSounds?: boolean;
    suicidalIdeation?: boolean;
    homicidalIdeation?: boolean;
    impendingSenseOfDoom?: boolean;
    disturbingThoughts?: boolean;
    memoryLoss?: boolean;
    note?: string;
};

export type RosEndocrine = {
    heatColdIntolerance?: boolean;
    weightChange?: boolean;
    excessiveThirstOrHunger?: boolean;
    excessiveSweating?: boolean;
    frequentUrination?: boolean;
    note?: string;
};

export type RosHematologicLymphatic = {
    skinDiscoloration?: boolean;
    easyBleeding?: boolean;
    enlargedLymphNodes?: boolean;
    easyBruising?: boolean;
    anemia?: boolean;
    bloodClots?: boolean;
    swollenGlandsOrThyroid?: boolean;
    note?: string;
};

export type RosAllergicImmunologic = {
    seasonalAllergies?: boolean;
    hivesOrRash?: boolean;
    persistentInfections?: boolean;
    hivExposure?: boolean;
    immuneDeficiencies?: boolean;
    note?: string;
};

export type PastMedicalHistoryDto = {
    id?: number;
    orgId?: number;
    externalId?: string | null;

    patientId: number;
    encounterId: number;

    description: string; // e.g., "Patient has history of hypertension, diagnosed in 2018."
    esigned?: boolean;
    signedAt?: string;
    signedBy?: string;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};


// Family History types (aligns with backend DTO)

// --- Family History ---
export type FamilyHistoryEntryDto = {
    id?: number;
    relation: "FATHER" | "MOTHER" | "SIBLING" | "SPOUSE" | "OFFSPRING";
    diagnosisCode?: string;
    diagnosisText?: string;
    notes?: string;
};

export type FamilyHistoryDto = {
    id?: number;
    externalId?: string | null;
    orgId?: number;
    patientId: number;
    encounterId: number;
    entries: FamilyHistoryEntryDto[];
    esigned?: boolean;
    signedAt?: string;
    signedBy?: string;
    signedEntryId?: number;
    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};



// --- Social History ---

export type SocialHistoryEntryDto = {
    id?: number;
    category: string;     // e.g., "SMOKING", "DIET", ...
    value?: string;       // e.g., "Former smoker", "Vegetarian"
    details?: string;     // free text details

};

export type SocialHistoryDto = {
    id?: number;
    externalId?: string | null;
    orgId?: number;
    patientId: number;
    encounterId: number;
    entries: SocialHistoryEntryDto[];
    esigned?: boolean;
    signedAt?: string;
    signedBy?: string;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};

// ---- Physical Exam ----

export type PhysicalExamSectionDto = {
    sectionKey:
        | "GENERAL"
        | "HEENT"
        | "NECK"
        | "CARDIOVASCULAR"
        | "RESPIRATORY"
        | "ABDOMEN"
        | "GENITOURINARY"
        | "MUSCULOSKELETAL"
        | "NEUROLOGICAL"
        | "SKIN"
        | "PSYCHIATRIC"
        | "OTHER"
        | string;      // allow future custom keys

    allNormal: boolean;   // true = no abnormal findings
    normalText?: string;  // e.g., “Well-nourished, no acute distress”
    findings?: string;    // e.g., “Mild nasal congestion”

};



export type PhysicalExamDto = {
    id?: number;
    externalId?: string | null;
    orgId?: number;
    patientId: number;
    encounterId: number;

    // if your backend includes an overall summary, keep it; otherwise omit:
    summary?: string;

    sections: PhysicalExamSectionDto[];
    esigned?: boolean;
    signedAt?: string;
    signedBy?: string;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};



export type AssessmentDto = {
    id?: number;
    patientId: number;
    encounterId: number;

    diagnosisCode?: string;   // e.g., ICD-10 (M54.5)
    diagnosisName?: string;   // e.g., Low back pain
    status?: "Active" | "Resolved" | "RuleOut" | "Differential" | "Chronic";
    priority?: "Primary" | "Secondary" | "Tertiary";
    assessmentText?: string;  // free-text impression/assessment
    notes?: string;
    esigned?: boolean;
    signedAt?: string;
    signedBy?: string;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};

// ---- Plan (aligned to backend)
export type PlanDto = {
    id?: number;
    externalId?: string | null;
    orgId?: number;
    patientId: number;
    encounterId: number;

    diagnosticPlan?: string;     // e.g., "Order CBC, CMP, Chest X-Ray."
    plan?: string;               // e.g., "Start bronchodilator..."
    notes?: string;              // free text
    followUpVisit?: string;      // e.g., "4 weeks"
    returnWorkSchool?: string;   // e.g., "Return to work on 2025-08-20"
    sectionsJson?: Record<string, unknown>;   // arbitrary JSON payload
    esigned?: boolean;
    signedAt?: string;
    signedBy?: string;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};




export type ProviderNoteDto = {
    id?: number;
    orgId?: number;
    patientId?: number;
    encounterId?: number;

    // Core note metadata
    noteTitle?: string;          // "SOAP Note"
    noteTypeCode?: string;       // e.g. "34109-0"
    noteStatus?: "draft" | "final" | "amended";
    noteDateTime?: string;       // "2025-09-09T10:30:00" or "2025-09-09T10:30"

    // Author
    authorPractitionerId?: number;

    // SOAP / narrative
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    narrative?: string;

    // Optional external reference
    externalId?: string;
    esigned?: boolean;
    signedAt?: string | number | null;   // some endpoints return ISO string, others epoch
    signedBy?: string | null;
    printedAt?: string | number | null;
    // If your backend sets this once signed to lock edits
    signed?: boolean;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};
// ---- Procedures (aligned to Bruno screenshot) ----
export type ProcedureDto = {
    id?: number;
    externalId?: string | null;
    orgId?: number;
    patientId: number;
    encounterId: number;

    cpt4: string;                // e.g., "99214"
    description: string;         // e.g., "Office visit est. patient comprehensive"
    units?: number;              // integer
    rate?: string;               // keep as string: "239.00"
    relatedIcds?: string;        // e.g., "E0500"
    hospitalBillingStart?: string; // "YYYY-MM-DD"
    hospitalBillingEnd?: string;   // "YYYY-MM-DD"
    modifier1?: string | null;   // e.g., "25"
    modifier2?: string | null;   // e.g., "34"
    modifier3?: string | null;
    modifier4?: string | null;
    note?: string | null;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};




// ---- Codes (master/detail aligned to backend screenshot) ----
export type CodeDto = {
    id?: number;
    externalId?: string | null;
    orgId?: number;
    patientId: number;
    encounterId: number;
    esigned?: boolean;
    signedAt?: string;
    signedBy?: string;

    codeType: "CPT" | "HCPCS" | "ICD10" | "ICD10PCS" | "Modifier" | "Other" | string;
    code: string;
    modifier?: string | null;

    active: boolean;
    description?: string;
    shortDescription?: string;
    category?: string;
    diagnosisReporting?: boolean;
    serviceReporting?: boolean;
    relateTo?: string;
    feeStandard?: number;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};

// Generic API envelope (if not already defined)



export type SignoffStatus =
    | "Draft"
    | "ReadyForSignature"
    | "Signed"
    | "CosignRequested"
    | "Cosigned"
    | "Locked"
    | "finalized"; // backend sometimes returns lowercase

export type SignoffDto = {
    id?: number;
    patientId: number;
    encounterId: number;

    // workflow state
    status: SignoffStatus;
    attestationText?: string;
    acknowledgeBillingComplete?: boolean;
    lockEncounter?: boolean;

    // signature fields
    signedBy?: string;            // provider display name / id
    signerRole?: string;          // e.g., MD, NP
    signedAt?: string;            // ISO/Date string
    signatureType?: string;       // electronic / digital
    signatureData?: string;       // backend signature payload
    contentHash?: string;         // for integrity verification

    // cosign info
    cosigner?: string;
    cosignedAt?: string;
    cosignedBy?: string;
    cosigners?: string[];

    // optional extra
    comments?: string;
    notes?: string;

    // finalization
    finalizedAt?: string;
    lockedAt?: string;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};


// --- Provider Signature DTOs ---

export type ProviderSignatureStatus =
    | "active"
    | "inactive"
    | "signed"
    | "locked";

export interface ProviderSignatureDto {
    id?: number;

    // identity
    orgId?: number;
    patientId: number;
    encounterId: number;

    // who/when
    signedAt?: string;             // ISO datetime, e.g. "2025-08-20T09:30:00Z"
    signedBy?: string;             // e.g. "dr.rajaclinic.test"
    signerRole?: string;           // e.g. "MD", "DO", "NP"

    // signature payload
    signatureType?: "ELECTRONIC" | "WET" | string;
    signatureFormat?: string;      // e.g. "image/png"
    signatureData?: string;        // Base64 string (no "data:*;base64," prefix)
    signatureHash?: string;        // SHA-256 hex

    // misc
    status?: ProviderSignatureStatus; // "active" / "signed" / etc.
    comments?: string;

    // optional audit block from backend
    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
}


export type DateTimeFinalizedDto = {
    id?: number;
    patientId: number;
    encounterId: number;

    finalizedAt?: string;     // ISO string, e.g., "2025-08-23T10:45:00Z" or local ISO
    finalizedBy?: string;     // provider display name/ID
    timezone?: string;        // e.g., "Asia/Kolkata"
    locked?: boolean;         // whether encounter is locked after finalization
    source?: string;          // e.g., "Signoff", "ProviderSignature", "Manual"
    notes?: string;           // optional free text

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};

export type AssignedProviderDto = {
    id?: number;
    patientId: number;
    encounterId: number;

    providerId: number;        // required
    providerName?: string;     // optional display name from backend
    role: "Primary" | "Attending" | "Consultant" | "Nurse" | "Scribe" | "Other";
    startDate?: string;        // yyyy-MM-dd
    endDate?: string;          // yyyy-MM-dd
    notes?: string;
    esigned?: boolean;
    signedAt?: string;
    signedBy?: string;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};

export type FeeScheduleEntryDto = {
    id?: number;
    code?: string;              // CPT/HCPCS/ICD-10-PCS/etc.
    description?: string;
    modifiers?: string;         // "25,59" etc.
    units?: number;             // default 1
    unitPrice?: number;         // per unit charge
    lineTotal?: number;         // server can calc; UI also calculates
    notes?: string;
};

export type FeeScheduleDto = {
    id?: number;
    patientId: number;
    encounterId: number;

    effectiveDate?: string;     // yyyy-MM-dd
    payer?: string;             // payer/plan name (optional)
    remarks?: string;           // free text

    entries: FeeScheduleEntryDto[];

    // rollups (optional; UI calculates locally too)
    subtotal?: number;
    discount?: number;
    tax?: number;
    total?: number;

    audit?: {
        createdDate?: string;
        lastModifiedDate?: string;
    };
};

// types.ts

export interface VitalsDto {
    id?: number;
    orgId?: number;
    patientId?: number;
    encounterId?: number;

    weightKg?: number;
    weightLbs?: number;
    heightCm?: number;
    heightIn?: number;

    bpSystolic?: number;
    bpDiastolic?: number;
    pulse?: number;
    respiration?: number;

    temperatureC?: number;
    temperatureF?: number;

    oxygenSaturation?: number;
    bmi?: number;

    notes?: string;
    signed?: boolean;
    recordedAt?: string | null;
    createdDate?: string | null;
    lastModifiedDate?: string | null;
}




// already in your project:
// export type ApiResponse<T> = { success: boolean; message?: string; data?: T };