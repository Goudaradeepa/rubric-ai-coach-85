# Whole-paper grading and handwriting extraction

## What will change
- Replace the per-question grading buttons on Students & Answers with one action that evaluates the selected student's complete paper in a single AI request.
- Preserve question-by-question marks, feedback, low-confidence review, OR-aware paper totals, and saving results.
- Improve handwriting extraction instructions and make answer-to-question matching more reliable, while clearly retaining empty/uncertain text instead of inventing it.

## Technical approach
- Reuse the existing whole-exam evaluation function, update its structured response to include the confidence details already shown in the teacher review screen, and map its per-question results back into the current review interface.
- Tighten OCR transcription requirements and test normalization/matching and whole-paper result mapping.
- Leave the pending answer-sheet upload security finding unchanged.
