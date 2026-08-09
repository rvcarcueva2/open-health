/**
 * PH Core Patient Registration Types
 * Based on: https://fhir.doh.gov.ph/phcore/StructureDefinition/ph-core-patient
 */

export interface PatientName {
  use: 'official';
  family: string;
  given: string[]; // [firstName, middleName?]
}

export interface PatientIdentifier {
  system: string;
  value: string;
}

export interface PatientTelecom {
  system: 'phone' | 'email';
  value: string;
  use: 'mobile' | 'home' | 'work';
}

export interface PatientAddress {
  use: 'home';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  country: string;
  extension?: AddressExtension[];
}

export interface AddressExtension {
  url: string;
  valueCoding?: {
    system: string;
    code: string;
    display: string;
  };
  valueString?: string;
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  meta: {
    profile: string[];
  };
  active: boolean;
  name: PatientName[];
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  identifier?: PatientIdentifier[];
  telecom?: PatientTelecom[];
  address?: PatientAddress[];
}

// Registration form data (pre-FHIR mapping)
export interface RegistrationFormData {
  // Step 1: Basic Demographics
  firstName: string;
  middleName: string;
  lastName: string;
  sex: 'male' | 'female' | 'other' | 'unknown' | '';
  birthDate: string;

  // Step 2: Identifiers
  philHealthNumber: string;
  philSysId: string;
  localHealthRecordNumber: string;

  // Step 3: Contact Information
  mobileNumber: string;
  emailAddress: string;

  // Step 4: Address
  regionCode: string;
  regionDisplay: string;
  provinceCode: string;
  provinceDisplay: string;
  cityCode: string;
  cityDisplay: string;
  barangayCode: string;
  barangayDisplay: string;
  houseNumberStreet: string;
}

export const INITIAL_FORM_DATA: RegistrationFormData = {
  firstName: '',
  middleName: '',
  lastName: '',
  sex: '',
  birthDate: '',
  philHealthNumber: '',
  philSysId: '',
  localHealthRecordNumber: '',
  mobileNumber: '',
  emailAddress: '',
  regionCode: '',
  regionDisplay: '',
  provinceCode: '',
  provinceDisplay: '',
  cityCode: '',
  cityDisplay: '',
  barangayCode: '',
  barangayDisplay: '',
  houseNumberStreet: '',
};

// Identifier system URIs
export const IDENTIFIER_SYSTEMS = {
  philHealth: 'https://www.philhealth.gov.ph/members',
  philSys: 'https://psa.gov.ph/philsys',
  localHealthRecord: 'urn:oid:2.16.840.1.113883.3.88.12.80.2',
};

// PH Core Profile URL
export const PH_CORE_PATIENT_PROFILE =
  'https://fhir.doh.gov.ph/phcore/StructureDefinition/ph-core-patient';
