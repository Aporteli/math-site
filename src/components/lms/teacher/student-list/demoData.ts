import type { PaymentRecord, StudentGroup, StudentRecord } from './studentList.types';
import { getMonthKey } from './paymentCalendar.helpers';

export const DEMO_GROUPS: StudentGroup[] = [
  { id: 'g1', name: 'მათემატიკა', monthlyPrice: 150 },
];

export const DEMO_STUDENTS: StudentRecord[] = [
  {
    id: 's1',
    firstName: 'ნიკა',
    lastName: 'ბერიძე',
    phone: '+995 555 12 34 56',
    parentPhone: '+995 599 98 76 54',
    email: 'nika@example.com',
    groupIds: ['g1'],
    monthlyPrice: 350,
    paidAmount: 350,
    status: 'active',
    lessons: [
      { id: 'l1', dayOfWeek: 1, startTime: '16:00', endTime: '17:30', groupId: 'g1' },
      { id: 'l2', dayOfWeek: 3, startTime: '18:00', endTime: '19:30', groupId: 'g1' },
      { id: 'l3', dayOfWeek: 5, startTime: '16:00', endTime: '17:30', groupId: 'g1' },
    ],
  },
  {
    id: 's2',
    firstName: 'ანა',
    lastName: 'ჯავახიშვილი',
    phone: '+995 591 22 33 44',
    parentPhone: '+995 577 11 22 33',
    email: 'ana@example.com',
    groupIds: ['g1'],
    monthlyPrice: 180,
    paidAmount: 90,
    status: 'active',
    lessons: [
      { id: 'l4', dayOfWeek: 2, startTime: '14:00', endTime: '15:30', groupId: 'g1' },
      { id: 'l5', dayOfWeek: 4, startTime: '14:00', endTime: '15:30', groupId: 'g1' },
    ],
  },
  {
    id: 's3',
    firstName: 'ლუკა',
    lastName: 'მაისურაძე',
    phone: '+995 555 77 88 99',
    groupIds: ['g1'],
    monthlyPrice: 150,
    paidAmount: 0,
    status: 'active',
    lessons: [
      { id: 'l6', dayOfWeek: 1, startTime: '16:00', endTime: '17:30', groupId: 'g1' },
      { id: 'l7', dayOfWeek: 5, startTime: '16:00', endTime: '17:30', groupId: 'g1' },
    ],
  },
  {
    id: 's4',
    firstName: 'მარიამ',
    lastName: 'კაპანაძე',
    phone: '+995 591 44 55 66',
    parentPhone: '+995 599 33 22 11',
    email: 'mariam@example.com',
    groupIds: ['g1'],
    monthlyPrice: 380,
    paidAmount: 200,
    status: 'active',
    lessons: [
      { id: 'l8', dayOfWeek: 2, startTime: '14:00', endTime: '15:30', groupId: 'g1' },
      { id: 'l9', dayOfWeek: 3, startTime: '18:00', endTime: '19:30', groupId: 'g1' },
      { id: 'l10', dayOfWeek: 4, startTime: '14:00', endTime: '15:30', groupId: 'g1' },
    ],
  },
  {
    id: 's5',
    firstName: 'გიორგი',
    lastName: 'ჩიხლაძე',
    phone: '+995 555 11 22 33',
    groupIds: ['g1'],
    monthlyPrice: 150,
    paidAmount: 150,
    status: 'active',
    lessons: [
      { id: 'l11', dayOfWeek: 1, startTime: '17:30', endTime: '19:00', groupId: 'g1' },
      { id: 'l12', dayOfWeek: 5, startTime: '17:30', endTime: '19:00', groupId: 'g1' },
    ],
  },
];

const now = new Date();
const thisMonth = getMonthKey(now);

export const DEMO_PAYMENTS: PaymentRecord[] = [
  { id: 'p1', studentId: 's1', monthKey: thisMonth, amount: 350, paidAt: now.toISOString(), method: 'card' },
  { id: 'p2', studentId: 's2', monthKey: thisMonth, amount: 90, paidAt: now.toISOString(), method: 'cash' },
  { id: 'p3', studentId: 's4', monthKey: thisMonth, amount: 200, paidAt: now.toISOString(), method: 'transfer' },
  { id: 'p4', studentId: 's5', monthKey: thisMonth, amount: 150, paidAt: now.toISOString(), method: 'cash' },
];