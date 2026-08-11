/**
 * FHIR R4 Encounter Resource
 * Used to represent clinical encounters (e.g., vital signs recording session)
 */

export interface FHIREncounter {
  resourceType: 'Encounter';
  id: string;
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled';
  class: {
    system: string;
    code: string;
    display: string;
  };
  type?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  subject: {
    reference: string;
  };
  period?: {
    start: string;
    end?: string;
  };
}

export const ENCOUNTER_CLASS_AMBULATORY = {
  system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
  code: 'AMB',
  display: 'ambulatory',
};
