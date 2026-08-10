import { HouseholdFormData } from '../models/Household';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateHouseholdStep1(data: HouseholdFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.householdName.trim()) {
    errors.push({ field: 'householdName', message: 'Household name is required' });
  }

  if (data.contactNumber.trim() && !/^(\+63|0)\d{10}$/.test(data.contactNumber.replace(/\s/g, ''))) {
    errors.push({
      field: 'contactNumber',
      message: 'Enter a valid Philippine mobile number',
    });
  }

  return errors;
}

export function validateHouseholdStep2(_data: HouseholdFormData): ValidationError[] {
  // Address is optional but if region is selected, province should follow
  return [];
}

export function validateHouseholdStep3(data: HouseholdFormData): ValidationError[] {
  const errors: ValidationError[] = [];
  const head = data.headOfHousehold;

  if (!head.firstName.trim()) {
    errors.push({ field: 'headFirstName', message: 'First name is required' });
  }

  if (!head.lastName.trim()) {
    errors.push({ field: 'headLastName', message: 'Last name is required' });
  }

  if (!head.sex) {
    errors.push({ field: 'headSex', message: 'Sex is required' });
  }

  if (!head.birthDate) {
    errors.push({ field: 'headBirthDate', message: 'Birth date is required' });
  } else {
    const birthDate = new Date(head.birthDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(birthDate.getTime())) {
      errors.push({ field: 'headBirthDate', message: 'Invalid date format' });
    } else if (birthDate > today) {
      errors.push({ field: 'headBirthDate', message: 'Birth date cannot be in the future' });
    }
  }

  return errors;
}

export function validateHouseholdStep4(_data: HouseholdFormData): ValidationError[] {
  // Members are optional
  return [];
}

export function validateHouseholdStep5(_data: HouseholdFormData): ValidationError[] {
  // Characteristics are optional
  return [];
}

export function validateHouseholdStep6(_data: HouseholdFormData): ValidationError[] {
  // Health indicators are optional
  return [];
}

export function validateMemberForm(member: {
  firstName: string;
  lastName: string;
  sex: string;
  birthDate: string;
  relationship: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!member.firstName.trim()) {
    errors.push({ field: 'memberFirstName', message: 'First name is required' });
  }

  if (!member.lastName.trim()) {
    errors.push({ field: 'memberLastName', message: 'Last name is required' });
  }

  if (!member.sex) {
    errors.push({ field: 'memberSex', message: 'Sex is required' });
  }

  if (!member.birthDate) {
    errors.push({ field: 'memberBirthDate', message: 'Birth date is required' });
  }

  if (!member.relationship) {
    errors.push({ field: 'memberRelationship', message: 'Relationship is required' });
  }

  return errors;
}
