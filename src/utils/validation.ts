import { RegistrationFormData } from '../models/Patient';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateStep1(data: RegistrationFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.firstName.trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  }

  if (!data.lastName.trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  }

  if (!data.sex) {
    errors.push({ field: 'sex', message: 'Sex is required' });
  }

  if (!data.birthDate) {
    errors.push({ field: 'birthDate', message: 'Birth date is required' });
  } else {
    const birthDate = new Date(data.birthDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(birthDate.getTime())) {
      errors.push({ field: 'birthDate', message: 'Invalid date format' });
    } else if (birthDate > today) {
      errors.push({ field: 'birthDate', message: 'Birth date cannot be in the future' });
    }
  }

  return errors;
}

export function validateStep2(_data: RegistrationFormData): ValidationError[] {
  // Step 2 fields are all optional
  return [];
}

export function validateStep3(data: RegistrationFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.mobileNumber && !/^(\+63|0)\d{10}$/.test(data.mobileNumber.replace(/\s/g, ''))) {
    errors.push({
      field: 'mobileNumber',
      message: 'Enter a valid Philippine mobile number (e.g., 09171234567)',
    });
  }

  if (data.emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailAddress)) {
    errors.push({ field: 'emailAddress', message: 'Enter a valid email address' });
  }

  return errors;
}

export function validateStep4(_data: RegistrationFormData): ValidationError[] {
  // Address fields are optional
  return [];
}

export function validateAllSteps(data: RegistrationFormData): ValidationError[] {
  return [
    ...validateStep1(data),
    ...validateStep2(data),
    ...validateStep3(data),
    ...validateStep4(data),
  ];
}

export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}
