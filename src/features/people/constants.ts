/** The parts of a permissions change that are saved one after another. */
export type SavedPart = 'department' | 'roles' | 'admin';

export const SAVED_PART_LABEL: Record<SavedPart, string> = {
  department: 'שיוך המחלקה',
  roles: 'ההרשאות לתחומים',
  admin: 'תפקיד מפקד המחנה',
};
