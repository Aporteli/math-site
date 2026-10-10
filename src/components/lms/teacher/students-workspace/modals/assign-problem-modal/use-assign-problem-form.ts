'use client';

import { useState } from 'react';

export function useAssignProblemForm() {
  const [selectedProblemId] = useState<string>('custom');
  const [customTitle] = useState('თავისუფალი დავალება');
  const [assignComment, setAssignComment] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [problemSearchQuery] = useState('');

  return {
    selectedProblemId,
    customTitle,
    assignComment,
    setAssignComment,
    assigning,
    setAssigning,
    problemSearchQuery,
  };
}
