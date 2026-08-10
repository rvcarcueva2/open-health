/**
 * Household Registration Types
 * FHIR Group resource mapping for Household registration.
 */

export interface HouseholdMember {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  sex: 'male' | 'female' | 'other' | 'unknown' | '';
  birthDate: string;
  relationship: string;
  contactNumber: string;
  isHead: boolean;
  patientId?: string; // Set when converted to Patient
}

export interface HouseholdCharacteristics {
  waterSource: string;
  toiletFacility: string;
  electricity: boolean | null;
  internetAccess: boolean | null;
  wasteDisposal: string;
}

export interface HouseholdHealthIndicators {
  pregnantWomanPresent: boolean;
  childUnderFivePresent: boolean;
  seniorCitizenPresent: boolean;
  personWithDisabilityPresent: boolean;
  tuberculosisCasePresent: boolean;
  chronicDiseasePresent: boolean;
}

export interface HouseholdFormData {
  // Step 1: Household Information
  householdName: string;
  householdNumber: string;
  contactNumber: string;
  registrationDate: string;

  // Step 2: Address
  regionCode: string;
  regionDisplay: string;
  provinceCode: string;
  provinceDisplay: string;
  cityCode: string;
  cityDisplay: string;
  barangayCode: string;
  barangayDisplay: string;
  streetAddress: string;
  houseNumber: string;

  // Step 3: Head of Household (stored separately)
  headOfHousehold: HouseholdMember;

  // Step 4: Additional Household Members
  members: HouseholdMember[];

  // Step 5: Characteristics
  characteristics: HouseholdCharacteristics;

  // Step 6: Health Indicators
  healthIndicators: HouseholdHealthIndicators;
}

export const INITIAL_HOUSEHOLD_MEMBER: HouseholdMember = {
  id: '',
  firstName: '',
  middleName: '',
  lastName: '',
  sex: '',
  birthDate: '',
  relationship: '',
  contactNumber: '',
  isHead: false,
};

export const INITIAL_HOUSEHOLD_FORM_DATA: HouseholdFormData = {
  householdName: '',
  householdNumber: '',
  contactNumber: '',
  registrationDate: new Date().toISOString().split('T')[0],
  regionCode: '',
  regionDisplay: '',
  provinceCode: '',
  provinceDisplay: '',
  cityCode: '',
  cityDisplay: '',
  barangayCode: '',
  barangayDisplay: '',
  streetAddress: '',
  houseNumber: '',
  headOfHousehold: {
    ...INITIAL_HOUSEHOLD_MEMBER,
    isHead: true,
    relationship: 'Head',
  },
  members: [],
  characteristics: {
    waterSource: '',
    toiletFacility: '',
    electricity: null,
    internetAccess: null,
    wasteDisposal: '',
  },
  healthIndicators: {
    pregnantWomanPresent: false,
    childUnderFivePresent: false,
    seniorCitizenPresent: false,
    personWithDisabilityPresent: false,
    tuberculosisCasePresent: false,
    chronicDiseasePresent: false,
  },
};

export const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Father',
  'Mother',
  'Son',
  'Daughter',
  'Grandparent',
  'Grandchild',
  'Sibling',
  'Relative',
  'Guardian',
  'Other',
];

export const WATER_SOURCE_OPTIONS = [
  { value: 'piped-water', label: 'Piped Water' },
  { value: 'deep-well', label: 'Deep Well' },
  { value: 'shallow-well', label: 'Shallow Well' },
  { value: 'river', label: 'River' },
  { value: 'other', label: 'Other' },
];

export const TOILET_FACILITY_OPTIONS = [
  { value: 'water-sealed', label: 'Water Sealed' },
  { value: 'pit-latrine', label: 'Pit Latrine' },
  { value: 'shared-facility', label: 'Shared Facility' },
  { value: 'none', label: 'None' },
];

export const WASTE_DISPOSAL_OPTIONS = [
  { value: 'collected', label: 'Collected' },
  { value: 'burned', label: 'Burned' },
  { value: 'buried', label: 'Buried' },
  { value: 'open-disposal', label: 'Open Disposal' },
];

// FHIR Group resource interface for Household
export interface FHIRGroup {
  resourceType: 'Group';
  id: string;
  meta?: {
    profile?: string[];
  };
  active: boolean;
  type: 'person';
  actual: true;
  name: string;
  quantity?: number;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  characteristic?: Array<{
    code: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    valueCodeableConcept?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    valueBoolean?: boolean;
    exclude: boolean;
  }>;
  member?: Array<{
    entity: {
      reference: string;
      display?: string;
    };
  }>;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCoding?: {
      system: string;
      code: string;
      display: string;
    };
    valueContactPoint?: {
      system: string;
      value: string;
    };
    valueAddress?: any;
    extension?: Array<any>;
  }>;
}

export const HOUSEHOLD_IDENTIFIER_SYSTEM = 'urn:household:identifier';
export const HOUSEHOLD_EXTENSION_BASE = 'urn:household:extension';

// Shared health indicator configuration (icons and colors)
export const HEALTH_INDICATOR_CONFIG: Array<{
  key: keyof HouseholdHealthIndicators;
  label: string;
  icon: string;
  color: string;
  iconLibrary?: 'ionicons' | 'fontawesome6';
}> = [
  { key: 'pregnantWomanPresent', label: 'Pregnant Woman Present', icon: 'woman', color: '#00838f' },
  { key: 'childUnderFivePresent', label: 'Child Under Five Present', icon: 'happy', color: '#6a1b9a' },
  { key: 'seniorCitizenPresent', label: 'Senior Citizen Present', icon: 'person-cane', color: '#1a57ad', iconLibrary: 'fontawesome6' },
  { key: 'personWithDisabilityPresent', label: 'Person With Disability Present', icon: 'heart', color: '#c62828' },
  { key: 'tuberculosisCasePresent', label: 'Tuberculosis Case Present', icon: 'medkit', color: '#f57c00' },
  { key: 'chronicDiseasePresent', label: 'Chronic Disease Present', icon: 'pulse', color: '#2e7d5b' },
];
