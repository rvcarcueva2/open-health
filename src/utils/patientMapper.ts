import { randomUUID } from 'expo-crypto';
import {
    FHIRPatient,
    IDENTIFIER_SYSTEMS,
    PH_CORE_PATIENT_PROFILE,
    RegistrationFormData,
} from '../models/Patient';

/**
 * Maps registration form data to a PH Core-compliant FHIR Patient resource.
 */
export function mapFormToFHIRPatient(data: RegistrationFormData): FHIRPatient {
  const patient: FHIRPatient = {
    resourceType: 'Patient',
    id: randomUUID(),
    meta: {
      profile: [PH_CORE_PATIENT_PROFILE],
    },
    active: true,
    name: [
      {
        use: 'official',
        family: data.lastName.trim(),
        given: data.middleName.trim()
          ? [data.firstName.trim(), data.middleName.trim()]
          : [data.firstName.trim()],
      },
    ],
    gender: data.sex as FHIRPatient['gender'],
    birthDate: data.birthDate,
  };

  // Add identifiers if provided
  const identifiers = buildIdentifiers(data);
  if (identifiers.length > 0) {
    patient.identifier = identifiers;
  }

  // Add telecom if provided
  const telecom = buildTelecom(data);
  if (telecom.length > 0) {
    patient.telecom = telecom;
  }

  // Add address if any address field is filled
  const address = buildAddress(data);
  if (address) {
    patient.address = [address];
  }

  return patient;
}

function buildIdentifiers(data: RegistrationFormData) {
  const identifiers: FHIRPatient['identifier'] = [];

  if (data.philHealthNumber.trim()) {
    identifiers.push({
      system: IDENTIFIER_SYSTEMS.philHealth,
      value: data.philHealthNumber.trim(),
    });
  }

  if (data.philSysId.trim()) {
    identifiers.push({
      system: IDENTIFIER_SYSTEMS.philSys,
      value: data.philSysId.trim(),
    });
  }

  if (data.localHealthRecordNumber.trim()) {
    identifiers.push({
      system: IDENTIFIER_SYSTEMS.localHealthRecord,
      value: data.localHealthRecordNumber.trim(),
    });
  }

  return identifiers;
}

function buildTelecom(data: RegistrationFormData) {
  const telecom: NonNullable<FHIRPatient['telecom']> = [];

  if (data.mobileNumber.trim()) {
    telecom.push({
      system: 'phone',
      value: data.mobileNumber.trim(),
      use: 'mobile',
    });
  }

  if (data.emailAddress.trim()) {
    telecom.push({
      system: 'email',
      value: data.emailAddress.trim(),
      use: 'home',
    });
  }

  return telecom;
}

function buildAddress(data: RegistrationFormData) {
  const hasAddress =
    data.regionCode ||
    data.provinceCode ||
    data.cityCode ||
    data.barangayCode ||
    data.houseNumberStreet.trim();

  if (!hasAddress) return null;

  // Build display text
  const parts = [
    data.houseNumberStreet.trim(),
    data.barangayDisplay,
    data.cityDisplay,
    data.provinceDisplay,
    data.regionDisplay,
  ].filter(Boolean);

  const address: any = {
    use: 'home',
    text: parts.join(', '),
    country: 'PH',
  };

  if (data.houseNumberStreet.trim()) {
    address.line = [data.houseNumberStreet.trim()];
  }

  if (data.barangayDisplay) {
    address.city = data.barangayDisplay;
  }

  if (data.cityDisplay) {
    address.district = data.cityDisplay;
  }

  if (data.provinceDisplay) {
    address.state = data.provinceDisplay;
  }

  // Add PH Core extensions for coded address components
  const extensions: any[] = [];

  if (data.regionCode) {
    extensions.push({
      url: 'https://fhir.doh.gov.ph/phcore/StructureDefinition/region',
      valueCoding: {
        system: 'https://psa.gov.ph/classification/psgc',
        code: data.regionCode,
        display: data.regionDisplay,
      },
    });
  }

  if (data.provinceCode) {
    extensions.push({
      url: 'https://fhir.doh.gov.ph/phcore/StructureDefinition/province',
      valueCoding: {
        system: 'https://psa.gov.ph/classification/psgc',
        code: data.provinceCode,
        display: data.provinceDisplay,
      },
    });
  }

  if (data.cityCode) {
    extensions.push({
      url: 'https://fhir.doh.gov.ph/phcore/StructureDefinition/city-municipality',
      valueCoding: {
        system: 'https://psa.gov.ph/classification/psgc',
        code: data.cityCode,
        display: data.cityDisplay,
      },
    });
  }

  if (data.barangayCode) {
    extensions.push({
      url: 'https://fhir.doh.gov.ph/phcore/StructureDefinition/barangay',
      valueCoding: {
        system: 'https://psa.gov.ph/classification/psgc',
        code: data.barangayCode,
        display: data.barangayDisplay,
      },
    });
  }

  if (extensions.length > 0) {
    address.extension = extensions;
  }

  return address;
}
