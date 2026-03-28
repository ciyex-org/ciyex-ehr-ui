/**
 * Legacy encounter storage utilities.
 * These functions were used for localStorage-based draft saving in the old encounter form.
 * The new dynamic encounter form uses auto-save to FHIR directly.
 * Kept as stubs for backward compatibility with appointment page components.
 */

export function getEncounterData(patientId: number, encounterId: number): Record<string, any> {
  try {
    const key = `encounter_${patientId}_${encounterId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function setEncounterSection(patientId: number, encounterId: number, section: string, data: any): void {
  try {
    const key = `encounter_${patientId}_${encounterId}`;
    const existing = getEncounterData(patientId, encounterId);
    existing[section] = data;
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    // ignore
  }
}

export function removeEncounterSection(patientId: number, encounterId: number, section: string): void {
  try {
    const key = `encounter_${patientId}_${encounterId}`;
    const existing = getEncounterData(patientId, encounterId);
    delete existing[section];
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    // ignore
  }
}
