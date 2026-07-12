import { CustomFieldType, IndustryTag, RelationTarget } from '@prisma/client';

/**
 * Static seed configs for one-click org onboarding (plan.md §7.5). Each pack
 * provisions AssetCategories, CustomObjectDefinitions, and CustomFieldDefinitions
 * through the SAME engine used for ad-hoc admin configuration — nothing here
 * is special-cased backend logic, it's just data fed through the ordinary
 * creation paths. That's the point: the demo payoff is the same framework
 * standing up visibly different back-offices for different businesses.
 */

export interface TemplateFieldSeed {
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  options?: string[];
  isRequired?: boolean;
  relationTarget?: RelationTarget;
  relationObjectDefinitionKey?: string; // resolved to an id at apply-time
}

export interface TemplateCategorySeed {
  name: string;
  description?: string;
  fields?: TemplateFieldSeed[];
}

export interface TemplateObjectSeed {
  key: string;
  label: string;
  pluralLabel: string;
  icon?: string;
  description?: string;
  fields: TemplateFieldSeed[];
}

export interface IndustryTemplate {
  tag: IndustryTag;
  name: string;
  description: string;
  categories: TemplateCategorySeed[];
  objects: TemplateObjectSeed[];
}

export const INDUSTRY_TEMPLATES: Record<Exclude<IndustryTag, 'GENERIC' | 'OTHER'>, IndustryTemplate> = {
  SCHOOL: {
    tag: 'SCHOOL',
    name: 'School',
    description: 'Classrooms, lab equipment, and a student directory alongside the standard asset modules.',
    categories: [
      { name: 'Lab Equipment', description: 'Science and computer lab hardware' },
      { name: 'Sports Gear', description: 'Sports and physical-education equipment' },
    ],
    objects: [
      {
        key: 'classroom',
        label: 'Classroom',
        pluralLabel: 'Classrooms',
        icon: '🏫',
        description: 'Physical classrooms and their capacity',
        fields: [
          { fieldKey: 'roomNumber', label: 'Room Number', fieldType: 'TEXT', isRequired: true },
          { fieldKey: 'capacity', label: 'Capacity', fieldType: 'NUMBER', isRequired: true },
          { fieldKey: 'building', label: 'Building', fieldType: 'TEXT' },
        ],
      },
      {
        key: 'student',
        label: 'Student',
        pluralLabel: 'Students',
        icon: '🎓',
        description: 'Enrolled students',
        fields: [
          { fieldKey: 'fullName', label: 'Full Name', fieldType: 'TEXT', isRequired: true },
          { fieldKey: 'grade', label: 'Grade', fieldType: 'SELECT', options: ['9', '10', '11', '12'], isRequired: true },
          { fieldKey: 'homeroom', label: 'Homeroom', fieldType: 'RELATION', relationTarget: 'CUSTOM_OBJECT', relationObjectDefinitionKey: 'classroom' },
        ],
      },
    ],
  },
  HOSPITAL: {
    tag: 'HOSPITAL',
    name: 'Hospital',
    description: 'Medical devices and beds as asset categories, with Ward and Patient custom objects.',
    categories: [
      { name: 'Medical Devices', description: 'Diagnostic and treatment equipment' },
      { name: 'Beds', description: 'Patient beds, tracked as bookable/allocatable assets' },
    ],
    objects: [
      {
        key: 'ward',
        label: 'Ward',
        pluralLabel: 'Wards',
        icon: '🏥',
        description: 'Hospital wards',
        fields: [
          { fieldKey: 'wardName', label: 'Ward Name', fieldType: 'TEXT', isRequired: true },
          { fieldKey: 'floor', label: 'Floor', fieldType: 'NUMBER' },
        ],
      },
      {
        key: 'patient',
        label: 'Patient',
        pluralLabel: 'Patients',
        icon: '🩺',
        description: 'Admitted patients',
        fields: [
          { fieldKey: 'fullName', label: 'Full Name', fieldType: 'TEXT', isRequired: true },
          { fieldKey: 'admissionDate', label: 'Admission Date', fieldType: 'DATE', isRequired: true },
          { fieldKey: 'ward', label: 'Ward', fieldType: 'RELATION', relationTarget: 'CUSTOM_OBJECT', relationObjectDefinitionKey: 'ward' },
          { fieldKey: 'assignedBed', label: 'Assigned Bed', fieldType: 'RELATION', relationTarget: 'ASSET' },
        ],
      },
    ],
  },
  HOTEL: {
    tag: 'HOTEL',
    name: 'Hotel',
    description: 'Room furnishings as an asset category, with Room Type and Guest custom objects.',
    categories: [{ name: 'Room Furnishings', description: 'Furniture and fixtures inside guest rooms' }],
    objects: [
      {
        key: 'room_type',
        label: 'Room Type',
        pluralLabel: 'Room Types',
        icon: '🛏️',
        description: 'Categories of rooms offered',
        fields: [
          { fieldKey: 'typeName', label: 'Type Name', fieldType: 'TEXT', isRequired: true },
          { fieldKey: 'maxOccupancy', label: 'Max Occupancy', fieldType: 'NUMBER', isRequired: true },
          { fieldKey: 'nightlyRate', label: 'Nightly Rate', fieldType: 'NUMBER' },
        ],
      },
      {
        key: 'guest',
        label: 'Guest',
        pluralLabel: 'Guests',
        icon: '🧳',
        description: 'Checked-in guests',
        fields: [
          { fieldKey: 'fullName', label: 'Full Name', fieldType: 'TEXT', isRequired: true },
          { fieldKey: 'checkInDate', label: 'Check-in Date', fieldType: 'DATE', isRequired: true },
          { fieldKey: 'checkOutDate', label: 'Check-out Date', fieldType: 'DATE' },
          { fieldKey: 'roomType', label: 'Room Type', fieldType: 'RELATION', relationTarget: 'CUSTOM_OBJECT', relationObjectDefinitionKey: 'room_type' },
        ],
      },
    ],
  },
  FACTORY: {
    tag: 'FACTORY',
    name: 'Factory',
    description: 'Machinery and PPE asset categories with a Production Line custom object.',
    categories: [
      {
        name: 'Machinery',
        description: 'Production machinery',
        fields: [{ fieldKey: 'downtimeThresholdHours', label: 'Downtime Threshold (hrs)', fieldType: 'NUMBER' }],
      },
      { name: 'PPE', description: 'Personal protective equipment' },
    ],
    objects: [
      {
        key: 'production_line',
        label: 'Production Line',
        pluralLabel: 'Production Lines',
        icon: '⚙️',
        description: 'Production lines on the factory floor',
        fields: [
          { fieldKey: 'lineName', label: 'Line Name', fieldType: 'TEXT', isRequired: true },
          { fieldKey: 'shiftCapacity', label: 'Shift Capacity (units)', fieldType: 'NUMBER' },
        ],
      },
    ],
  },
};

export function getIndustryTemplate(tag: string): IndustryTemplate | undefined {
  return (INDUSTRY_TEMPLATES as Record<string, IndustryTemplate>)[tag];
}
