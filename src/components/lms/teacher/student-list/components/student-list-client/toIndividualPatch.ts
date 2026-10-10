import type { StudentRecord } from '../../studentList.types';

export function toIndividualPatch(patch: Partial<StudentRecord>) {
  return {
    ...(patch.firstName !== undefined && { firstName: patch.firstName }),
    ...(patch.lastName !== undefined && { lastName: patch.lastName }),
    ...(patch.phone !== undefined && { phone: patch.phone ?? null }),
    ...(patch.parentPhone !== undefined && {
      parentPhone: patch.parentPhone ?? null,
    }),
    ...(patch.email !== undefined && { email: patch.email ?? null }),
    ...(patch.monthlyPrice !== undefined && {
      monthlyPrice: patch.monthlyPrice,
    }),
    ...(patch.priceType !== undefined && { priceType: patch.priceType }),
    ...(patch.note !== undefined && { note: patch.note ?? null }),
    ...(patch.status !== undefined && { status: patch.status }),
  };
}
