/**
 * FHIR R4 Observation Resource
 * Used to represent vital signs measurements
 */

export interface FHIRObservation {
  resourceType: 'Observation';
  id: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled';
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
  };
  encounter?: {
    reference: string;
  };
  effectiveDateTime: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  component?: Array<{
    code: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    valueQuantity: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
  }>;
}

// LOINC codes for vital signs
export const VITAL_SIGN_CODES = {
  bloodPressure: {
    system: 'http://loinc.org',
    code: '85354-9',
    display: 'Blood pressure panel',
  },
  systolic: {
    system: 'http://loinc.org',
    code: '8480-6',
    display: 'Systolic blood pressure',
  },
  diastolic: {
    system: 'http://loinc.org',
    code: '8462-4',
    display: 'Diastolic blood pressure',
  },
  temperature: {
    system: 'http://loinc.org',
    code: '8310-5',
    display: 'Body temperature',
  },
  heartRate: {
    system: 'http://loinc.org',
    code: '8867-4',
    display: 'Heart rate',
  },
  respiratoryRate: {
    system: 'http://loinc.org',
    code: '9279-1',
    display: 'Respiratory rate',
  },
  weight: {
    system: 'http://loinc.org',
    code: '29463-7',
    display: 'Body weight',
  },
  height: {
    system: 'http://loinc.org',
    code: '8302-2',
    display: 'Body height',
  },
  oxygenSaturation: {
    system: 'http://loinc.org',
    code: '2708-6',
    display: 'Oxygen saturation',
  },
};

export const VITAL_SIGN_CATEGORY = {
  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
  code: 'vital-signs',
  display: 'Vital Signs',
};

// Form data for vital signs input
export interface VitalSignsFormData {
  systolic: string;
  diastolic: string;
  temperature: string;
  heartRate: string;
  respiratoryRate: string;
  weight: string;
  height: string;
  oxygenSaturation: string;
}

export const INITIAL_VITAL_SIGNS_FORM: VitalSignsFormData = {
  systolic: '',
  diastolic: '',
  temperature: '',
  heartRate: '',
  respiratoryRate: '',
  weight: '',
  height: '',
  oxygenSaturation: '',
};
