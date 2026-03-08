
-- Create storage bucket for answer sheets
INSERT INTO storage.buckets (id, name, public) VALUES ('answer-sheets', 'answer-sheets', true);

-- Allow anyone to upload to answer-sheets bucket
CREATE POLICY "Anyone can upload answer sheets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'answer-sheets');

-- Allow anyone to read answer sheets
CREATE POLICY "Anyone can read answer sheets" ON storage.objects FOR SELECT USING (bucket_id = 'answer-sheets');
