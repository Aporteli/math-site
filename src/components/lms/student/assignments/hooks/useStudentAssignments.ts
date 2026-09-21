'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { getStudentAssignmentsAction, getStudentCoursesAction, type StudentCourse } from '@/lib/actions/students';
import type { Assignment, AssignmentProblem, FilterStatus, StudentContentTab } from '../types/student-assignment.types';
import {
  extractImageUrls,
  formatDateToKey,
  formatGeorgianDateString,
  isAssignmentMaterial,
  matchesFilter,
  parseAndFormatDate,
} from '../helpers/student-assignment.helpers';
import { useAssignmentSubmissions } from './useAssignmentSubmissions';

export function useStudentAssignments(locale: Locale) {
  // --- მდგომარეობები (State) ---
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [activeTab, setActiveTab] = useState<StudentContentTab>('tasks');
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatDateToKey(new Date()));

  // ამოცანის დეტალების მოდალის მდგომარეობა
  const [activeProblemModal, setActiveProblemModal] = useState<{
    assignmentId: string;
    problem: AssignmentProblem;
  } | null>(null);

  // მასალის/პასუხის პრევიუს მოდალის მდგომარეობა
  const [previewMaterialModal, setPreviewMaterialModal] = useState<{
    url: string;
    title: string;
    isAnswer?: boolean;
    instructions?: string | null;
  } | null>(null);

  // ლოკალიზაციის ლექსიკონი
  const dict = getDictionary(locale);
  const copy = dict.studentAssignments;

  /**
   * დავალებების ჩატვირთვა სერვერიდან:
   * რთავს ჩატვირთვის ინდიკატორს, იღებს მონაცემებს და ინახავს სტეიტში.
   */
  async function loadData() {
    setLoading(true);
    const data = await getStudentAssignmentsAction();
    console.log(data,'data');
    setAssignments(data as any);
    setLoading(false);
  }

  /**
   * პირველადი ჩატვირთვა (Mount):
   * კომპონენტის ჩატვირთვისთანავე უშვებს დავალებების წამოღების ფუნქციას.
   */
  useEffect(() => {
    void loadData();
  }, []);

  /**
   * კურსების წამოღება სერვერიდან:
   * იყენებს active დროშას Race Condition-ისა და unmounted კომპონენტზე სტეიტის შეცვლის თავიდან ასაცილებლად.
   */
  useEffect(() => {
    let active = true;
    getStudentCoursesAction().then((data) => {
      if (active) setCourses(data);
    });
    return () => {
      active = false;
    };
  }, []);

  /**
   * ხელმისაწვდომი თარიღების გენერირება და დალაგება:
   * დავალებებიდან იღებს უნიკალურ თარიღებს (Set-ით) და ალაგებს კლებადობით (უახლესიდან უძველესისკენ).
   */
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => {
      set.add(parseAndFormatDate(a).key);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [assignments]);

  /**
   * არჩეული თარიღის ვალიდაცია:
   * თუ მიმდინარე დღე არ არსებობს დავალებების თარიღებში, ავტომატურად ირჩევს უახლოეს ხელმისაწვდომ თარიღს.
   */
  useEffect(() => {
    if (availableDates.length > 0) {
      const todayKey = formatDateToKey(new Date());
      if (!availableDates.includes(todayKey)) {
        setSelectedDateKey(availableDates[0]);
      }
    }
  }, [availableDates]);

  /**
   * თარიღის შეცვლა დღეების მიხედვით:
   * არჩეულ თარიღს უმატებს ან აკლებს გადაცემულ დღეების რაოდენობას (+1, -1 და ა.შ.).
   */
  const handleShiftDate = (days: number) => {
    const parts = selectedDateKey.split('-');
    const current = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    current.setDate(current.getDate() + days);
    setSelectedDateKey(formatDateToKey(current));
  };

  /**
   * არჩეული თარიღის ქართულ ენაზე ფორმატირება (მაგ. „3 სექტემბერი, 2026“).
   */
  const formattedSelectedDate = useMemo(() => {
    const parts = selectedDateKey.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return formatGeorgianDateString(d);
  }, [selectedDateKey]);

  /**
   * არჩეული დღის დავალებების გაფილტვრა:
   * ტოვებს მხოლოდ არჩეული თარიღის დავალებებს, რომლებიც ემთხვევა სტატუსის ფილტრს (statusFilter).
   */
  const assignmentsForSelectedDate = useMemo(() => {
    return assignments.filter((assignment) => {
      const { key } = parseAndFormatDate(assignment);
      if (key !== selectedDateKey) return false;
      return matchesFilter(assignment, statusFilter);
    });
  }, [assignments, selectedDateKey, statusFilter]);

  /**
   * უშუალოდ შესასრულებელი დავალებების (ტასკების) გამოყოფა:
   * არჩეული დღის გაფილტრული სიიდან გამორიცხავს სასწავლო მასალებს.
   */
  const taskAssignments = useMemo(() => {
    return assignmentsForSelectedDate.filter((a) => !isAssignmentMaterial(a));
  }, [assignmentsForSelectedDate]);

  /**
   * ჩაბარებული პასუხების/სურათების ამოკრება:
   * აგროვებს ამოცანებზე ატვირთულ ყველა სურათის ბმულს და აწყობს ერთიან მასივად პრევიუსთვის.
   */
  const submittedAnswersForDate = useMemo(() => {
    const answers: { id: string; url: string; title: string; status: string }[] = [];
    taskAssignments.forEach((a) => {
      a.problems.forEach((p, idx) => {
        if (p.previewUrl) {
          const urls = extractImageUrls(p.previewUrl);
          urls.forEach((url, uIdx) => {
            answers.push({
              id: `${a.id}-${p.id}-${idx}-${uIdx}`,
              url,
              title: `${a.title} - პასუხი ${urls.length > 1 ? `#${uIdx + 1}` : ''}`,
              status: p.status,
            });
          });
        }
      });
    });
    return answers;
  }, [taskAssignments]);

  /**
   * სასწავლო მასალების გამოყოფა:
   * არჩეული დღის მონაცემებიდან ტოვებს მხოლოდ თეორიულ/დამხმარე რესურსებს.
   */
  const materialsForDate = useMemo(() => {
    return assignmentsForSelectedDate.filter((a) => isAssignmentMaterial(a));
  }, [assignmentsForSelectedDate]);

  /**
   * არჩეული დღის ყველა შესასრულებელი დავალება:
   * ტოვებს მხოლოდ იმ დავალებებს, რომლებიც არ არის მასალა, სტატუსის ფილტრის (statusFilter) გაუთვალისწინებლად.
   */
  const todayAssignments = useMemo(() => {
    return assignments.filter((a) => parseAndFormatDate(a).key === selectedDateKey && !isAssignmentMaterial(a));
  }, [assignments, selectedDateKey]);

  /**
   * დავალების ჩაბარების (Submission) ლოგიკის დაკავშირება:
   * აბრუნებს ჩაბარებასთან და ფაილის ატვირთვასთან დაკავშირებულ ფუნქციებსა და სტეიტებს.
   */
  const submissions = useAssignmentSubmissions({
    selectedDateKey,
    taskAssignments,
    setAssignments,
    setActiveTab,
    setNotice,
  });

  return {
    copy,
    courses,
    statusFilter,
    setStatusFilter,
    activeTab,
    setActiveTab,
    notice,
    loading,
    selectedDateKey,
    setSelectedDateKey,
    handleShiftDate,
    formattedSelectedDate,
    taskAssignments,
    submittedAnswersForDate,
    materialsForDate,
    todayAssignments,
    activeProblemModal,
    setActiveProblemModal,
    previewMaterialModal,
    setPreviewMaterialModal,
    assignments,
    ...submissions,
  };
}