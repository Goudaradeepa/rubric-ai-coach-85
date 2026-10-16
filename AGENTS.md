# Project Architecture Rules

- Keep student identity mappings in a teacher-scoped directory, with `teacher_id` ownership enforced by row-level security, so teachers cannot see or change other teachers' rosters.
- Encode only explicit printed OR alternatives as unique question-paper groups, preserving part boundaries and sub-question marks, so paper totals count each choice once.
- Keep shared paper-total calculations in one reusable scoring utility, prefer a paper's printed maximum when available, and use it for grading, teacher adjustments, and saved results so OR alternatives and totals stay consistent.