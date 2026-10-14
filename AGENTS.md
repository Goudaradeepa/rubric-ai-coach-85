# Project Architecture Rules

- Keep student identity mappings in a teacher-scoped directory, with `teacher_id` ownership enforced by row-level security, so teachers cannot see or change other teachers' rosters.
- Encode only explicit printed OR alternatives as unique question-paper groups, preserving part boundaries and sub-question marks, so paper totals count each choice once.