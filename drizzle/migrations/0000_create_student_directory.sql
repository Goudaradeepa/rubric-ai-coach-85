CREATE TABLE public.student_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  usn TEXT NOT NULL CHECK (length(trim(usn)) > 0),
  student_name TEXT NOT NULL CHECK (length(trim(student_name)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT student_directory_teacher_usn_unique UNIQUE (teacher_id, usn)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_directory TO authenticated;
GRANT ALL ON public.student_directory TO service_role;
ALTER TABLE public.student_directory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can view their student directory" ON public.student_directory FOR SELECT TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can add to their student directory" ON public.student_directory FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update their student directory" ON public.student_directory FOR UPDATE TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can remove from their student directory" ON public.student_directory FOR DELETE TO authenticated USING (auth.uid() = teacher_id);