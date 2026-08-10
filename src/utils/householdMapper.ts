import { randomUUID } from 'expo-crypto';
import {
  FHIRGroup,
  HOUSEHOLD_EXTENSION_BASE,
  HOUSEHOLD_IDENTIFIER_SYSTEM,
  HouseholdFormData,
  HouseholdMember,
} from '../models/Household';

/**
 * Maps household form data to a FHIR Group resource.
 */
export function mapFormToFHIRGroup(data: HouseholdFormData): FHIRGroup {
  const group: FHIRGroup = {
    resourceType: 'Group',
    id: randomUUID(),
    active: true,
    type: 'person',
    actual: true,
    name: data.householdName.trim(),
    quantity: 1 + data.members.length, // head + members
  };

  // Identifier
  if (data.householdNumber.trim()) {
    group.identifier = [
      {
        system: HOUSEHOLD_IDENTIFIER_SYSTEM,
        value: data.householdNumber.trim(),
      },
    ];
  }

  // Extensions for household metadata
  const extensions: FHIRGroup['extension'] = [];

  // Registration date
  extensions.push({
    url: `${HOUSEHOLD_EXTENSION_BASE}/registration-date`,
    valueString: data.registrationDate,
  });

  // Contact number
  if (data.contactNumber.trim()) {
    extensions.push({
      url: `${HOUSEHOLD_EXTENSION_BASE}/contact`,
      valueContactPoint: {
        system: 'phone',
        value: data.contactNumber.trim(),
      },
    });
  }

  // Address
  const addressExt = buildAddressExtension(data);
  if (addressExt) {
    extensions.push(addressExt);
  }

  // Head of household
  extensions.push({
    url: `${HOUSEHOLD_EXTENSION_BASE}/head-of-household`,
    valueString: JSON.stringify(data.headOfHousehold),
  });

  // Members (stored as extension since they're not Patients yet)
  if (data.members.length > 0) {
    extensions.push({
      url: `${HOUSEHOLD_EXTENSION_BASE}/members`,
      valueString: JSON.stringify(data.members),
    });
  }

  // Characteristics
  const characteristics = buildCharacteristics(data);
  if (characteristics.length > 0) {
    group.characteristic = characteristics;
  }

  // Health Indicators
  const healthIndicatorExts = buildHealthIndicatorExtensions(data);
  extensions.push(...healthIndicatorExts);

  if (extensions.length > 0) {
    group.extension = extensions;
  }

  return group;
}

function buildAddressExtension(data: HouseholdFormData) {
  const hasAddress =
    data.regionCode || data.provinceCode || data.cityCode ||
    data.barangayCode || data.streetAddress.trim() || data.houseNumber.trim();

  if (!hasAddress) return null;

  const parts = [
    data.houseNumber.trim(),
    data.streetAddress.trim(),
    data.barangayDisplay,
    data.cityDisplay,
    data.provinceDisplay,
    data.regionDisplay,
  ].filter(Boolean);

  return {
    url: `${HOUSEHOLD_EXTENSION_BASE}/address`,
    valueAddress: {
      use: 'home',
      text: parts.join(', '),
      line: [data.houseNumber.trim(), data.streetAddress.trim()].filter(Boolean),
      city: data.barangayDisplay || undefined,
      district: data.cityDisplay || undefined,
      state: data.provinceDisplay || undefined,
      country: 'PH',
      extension: [
        data.regionCode && {
          url: 'https://fhir.doh.gov.ph/phcore/StructureDefinition/region',
          valueCoding: {
            system: 'https://psa.gov.ph/classification/psgc',
            code: data.regionCode,
            display: data.regionDisplay,
          },
        },
        data.provinceCode && {
          url: 'https://fhir.doh.gov.ph/phcore/StructureDefinition/province',
          valueCoding: {
            system: 'https://psa.gov.ph/classification/psgc',
            code: data.provinceCode,
            display: data.provinceDisplay,
          },
        },
        data.cityCode && {
          url: 'https://fhir.doh.gov.ph/phcore/StructureDefinition/city-municipality',
          valueCoding: {
            system: 'https://psa.gov.ph/classification/psgc',
            code: data.cityCode,
            display: data.cityDisplay,
          },
        },
        data.barangayCode && {
          url: 'https://fhir.doh.gov.ph/phcore/StructureDefinition/barangay',
          valueCoding: {
            system: 'https://psa.gov.ph/classification/psgc',
            code: data.barangayCode,
            display: data.barangayDisplay,
          },
        },
      ].filter(Boolean),
    },
  };
}

function buildCharacteristics(data: HouseholdFormData): NonNullable<FHIRGroup['characteristic']> {
  const characteristics: NonNullable<FHIRGroup['characteristic']> = [];
  const { waterSource, toiletFacility, electricity, internetAccess, wasteDisposal } = data.characteristics;

  if (waterSource) {
    characteristics.push({
      code: {
        coding: [{ system: `${HOUSEHOLD_EXTENSION_BASE}/characteristic`, code: 'water-source', display: 'Water Source' }],
      },
      valueCodeableConcept: {
        coding: [{ system: `${HOUSEHOLD_EXTENSION_BASE}/water-source`, code: waterSource, display: waterSource }],
      },
      exclude: false,
    });
  }

  if (toiletFacility) {
    characteristics.push({
      code: {
        coding: [{ system: `${HOUSEHOLD_EXTENSION_BASE}/characteristic`, code: 'toilet-facility', display: 'Toilet Facility' }],
      },
      valueCodeableConcept: {
        coding: [{ system: `${HOUSEHOLD_EXTENSION_BASE}/toilet-facility`, code: toiletFacility, display: toiletFacility }],
      },
      exclude: false,
    });
  }

  if (electricity !== null) {
    characteristics.push({
      code: {
        coding: [{ system: `${HOUSEHOLD_EXTENSION_BASE}/characteristic`, code: 'electricity', display: 'Electricity' }],
      },
      valueBoolean: electricity,
      exclude: false,
    });
  }

  if (internetAccess !== null) {
    characteristics.push({
      code: {
        coding: [{ system: `${HOUSEHOLD_EXTENSION_BASE}/characteristic`, code: 'internet-access', display: 'Internet Access' }],
      },
      valueBoolean: internetAccess,
      exclude: false,
    });
  }

  if (wasteDisposal) {
    characteristics.push({
      code: {
        coding: [{ system: `${HOUSEHOLD_EXTENSION_BASE}/characteristic`, code: 'waste-disposal', display: 'Waste Disposal' }],
      },
      valueCodeableConcept: {
        coding: [{ system: `${HOUSEHOLD_EXTENSION_BASE}/waste-disposal`, code: wasteDisposal, display: wasteDisposal }],
      },
      exclude: false,
    });
  }

  return characteristics;
}

function buildHealthIndicatorExtensions(data: HouseholdFormData) {
  const extensions: NonNullable<FHIRGroup['extension']> = [];
  const indicators = data.healthIndicators;

  const indicatorEntries = [
    { key: 'pregnantWomanPresent', display: 'Pregnant Woman Present' },
    { key: 'childUnderFivePresent', display: 'Child Under Five Present' },
    { key: 'seniorCitizenPresent', display: 'Senior Citizen Present' },
    { key: 'personWithDisabilityPresent', display: 'Person With Disability Present' },
    { key: 'tuberculosisCasePresent', display: 'Tuberculosis Case Present' },
    { key: 'chronicDiseasePresent', display: 'Chronic Disease Present' },
  ];

  for (const entry of indicatorEntries) {
    if ((indicators as any)[entry.key]) {
      extensions.push({
        url: `${HOUSEHOLD_EXTENSION_BASE}/health-indicator/${entry.key}`,
        valueString: entry.display,
      });
    }
  }

  return extensions;
}

/**
 * Extracts household members from a stored FHIR Group resource.
 */
export function extractMembersFromGroup(group: FHIRGroup): {
  head: HouseholdMember | null;
  members: HouseholdMember[];
} {
  let head: HouseholdMember | null = null;
  let members: HouseholdMember[] = [];

  if (group.extension) {
    const headExt = group.extension.find(
      (e) => e.url === `${HOUSEHOLD_EXTENSION_BASE}/head-of-household`
    );
    if (headExt?.valueString) {
      try {
        head = JSON.parse(headExt.valueString);
      } catch { }
    }

    const membersExt = group.extension.find(
      (e) => e.url === `${HOUSEHOLD_EXTENSION_BASE}/members`
    );
    if (membersExt?.valueString) {
      try {
        members = JSON.parse(membersExt.valueString);
      } catch { }
    }
  }

  return { head, members };
}

/**
 * Extracts address display text from a stored FHIR Group resource.
 */
export function extractAddressFromGroup(group: FHIRGroup): string {
  if (!group.extension) return '';
  const addressExt = group.extension.find(
    (e) => e.url === `${HOUSEHOLD_EXTENSION_BASE}/address`
  );
  return addressExt?.valueAddress?.text ?? '';
}

/**
 * Links a Patient ID to a household member within the FHIR Group resource.
 * Updates the member's patientId field in the stored JSON extension.
 */
export function linkPatientToHouseholdMember(
  group: FHIRGroup,
  memberId: string,
  patientId: string
): FHIRGroup {
  if (!group.extension) return group;

  const updatedExtensions = group.extension.map((ext) => {
    // Check head of household
    if (ext.url === `${HOUSEHOLD_EXTENSION_BASE}/head-of-household` && ext.valueString) {
      try {
        const head: HouseholdMember = JSON.parse(ext.valueString);
        if (head.id === memberId) {
          head.patientId = patientId;
          return { ...ext, valueString: JSON.stringify(head) };
        }
      } catch { }
    }

    // Check members array
    if (ext.url === `${HOUSEHOLD_EXTENSION_BASE}/members` && ext.valueString) {
      try {
        const members: HouseholdMember[] = JSON.parse(ext.valueString);
        const updated = members.map((m) =>
          m.id === memberId ? { ...m, patientId } : m
        );
        return { ...ext, valueString: JSON.stringify(updated) };
      } catch { }
    }

    return ext;
  });

  return { ...group, extension: updatedExtensions };
}

/**
 * Extracts structured address data (coded PSGC fields) from a stored FHIR Group resource.
 */
export function extractStructuredAddressFromGroup(group: FHIRGroup): {
  regionCode: string;
  regionDisplay: string;
  provinceCode: string;
  provinceDisplay: string;
  cityCode: string;
  cityDisplay: string;
  barangayCode: string;
  barangayDisplay: string;
  houseNumberStreet: string;
} {
  const result = {
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

  if (!group.extension) return result;

  const addressExt = group.extension.find(
    (e) => e.url === `${HOUSEHOLD_EXTENSION_BASE}/address`
  );
  if (!addressExt?.valueAddress) return result;

  const addr = addressExt.valueAddress;

  // Extract house number / street from line
  if (addr.line && addr.line.length > 0) {
    result.houseNumberStreet = addr.line.join(' ').trim();
  }

  // Extract coded components from extensions
  if (addr.extension) {
    for (const ext of addr.extension) {
      if (!ext?.valueCoding) continue;
      if (ext.url?.includes('/region')) {
        result.regionCode = ext.valueCoding.code || '';
        result.regionDisplay = ext.valueCoding.display || '';
      } else if (ext.url?.includes('/province')) {
        result.provinceCode = ext.valueCoding.code || '';
        result.provinceDisplay = ext.valueCoding.display || '';
      } else if (ext.url?.includes('/city-municipality')) {
        result.cityCode = ext.valueCoding.code || '';
        result.cityDisplay = ext.valueCoding.display || '';
      } else if (ext.url?.includes('/barangay')) {
        result.barangayCode = ext.valueCoding.code || '';
        result.barangayDisplay = ext.valueCoding.display || '';
      }
    }
  }

  return result;
}
