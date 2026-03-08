import type { Question, StudentSubmission, EvaluationResult } from "@/types/evaluation";

export const mockQuestions: Question[] = [
  {
    id: "q1",
    title: "Photosynthesis Process",
    questionText: "Explain the process of photosynthesis including the light-dependent and light-independent reactions.",
    modelAnswer: "Photosynthesis is the process by which plants convert light energy into chemical energy. In the light-dependent reactions, which occur in the thylakoid membranes, water molecules are split using sunlight, producing ATP and NADPH. Oxygen is released as a byproduct. In the light-independent reactions (Calvin cycle), occurring in the stroma, CO2 is fixed into glucose using the ATP and NADPH from the first stage.",
    rubricCriteria: [
      { id: "c1", name: "Concept Understanding", description: "Demonstrates understanding of core photosynthesis concepts", maxScore: 10, weight: 1 },
      { id: "c2", name: "Explanation Quality", description: "Clear and logical explanation of the process", maxScore: 10, weight: 1 },
      { id: "c3", name: "Completeness", description: "Covers both light-dependent and light-independent reactions", maxScore: 10, weight: 1 },
      { id: "c4", name: "Scientific Accuracy", description: "Uses correct scientific terminology", maxScore: 10, weight: 1 },
    ],
    totalPoints: 40,
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "q2",
    title: "Newton's Laws of Motion",
    questionText: "Describe Newton's three laws of motion and provide real-world examples for each.",
    modelAnswer: "Newton's First Law (Inertia): An object remains at rest or in uniform motion unless acted upon by an external force. Example: a book on a table stays still until pushed. Second Law (F=ma): Force equals mass times acceleration. Example: pushing a shopping cart - heavier carts need more force. Third Law: Every action has an equal and opposite reaction. Example: a rocket propels forward by expelling gas backward.",
    rubricCriteria: [
      { id: "c5", name: "Law Definitions", description: "Accurately defines all three laws", maxScore: 10, weight: 1 },
      { id: "c6", name: "Examples Quality", description: "Provides relevant real-world examples", maxScore: 10, weight: 1 },
      { id: "c7", name: "Conceptual Clarity", description: "Explains concepts clearly", maxScore: 10, weight: 1 },
    ],
    totalPoints: 30,
    createdAt: "2026-03-02T14:00:00Z",
  },
];

export const mockSubmissions: StudentSubmission[] = [
  { id: "s1", questionId: "q1", studentName: "Alice Johnson", studentEmail: "alice@school.edu", answer: "Photosynthesis is when plants use sunlight to make food. The light reactions happen in the thylakoid and make ATP. The Calvin cycle uses CO2 to make sugar.", submittedAt: "2026-03-03T09:00:00Z", evaluated: true },
  { id: "s2", questionId: "q1", studentName: "Bob Chen", studentEmail: "bob@school.edu", answer: "Plants do photosynthesis to get energy. They absorb sunlight through chlorophyll in the leaves. Light dependent reactions split water and release oxygen. Then in the Calvin cycle, carbon dioxide is converted into glucose using ATP and NADPH.", submittedAt: "2026-03-03T09:30:00Z", evaluated: true },
  { id: "s3", questionId: "q1", studentName: "Carol Davis", studentEmail: "carol@school.edu", answer: "Photosynthesis converts light energy to chemical energy. In thylakoid membranes, light-dependent reactions split H2O, producing ATP, NADPH, and O2. The Calvin cycle in the stroma fixes CO2 into G3P using these products, ultimately forming glucose.", submittedAt: "2026-03-03T10:00:00Z", evaluated: true },
  { id: "s4", questionId: "q2", studentName: "David Lee", studentEmail: "david@school.edu", answer: "Newton's first law says objects stay still or keep moving unless a force acts on them, like a ball rolling on grass slows due to friction. Second law is F=ma, like kicking a soccer ball harder makes it go faster. Third law means every action has reaction, like swimming you push water back and move forward.", submittedAt: "2026-03-04T11:00:00Z", evaluated: true },
  { id: "s5", questionId: "q2", studentName: "Eva Martinez", studentEmail: "eva@school.edu", answer: "First law is about inertia. Second law relates force to mass and acceleration. Third law is action-reaction.", submittedAt: "2026-03-04T11:30:00Z", evaluated: true },
];

export const mockResults: EvaluationResult[] = [
  {
    id: "r1", submissionId: "s1", questionId: "q1", studentName: "Alice Johnson",
    overallScore: 26, totalPossible: 40, percentage: 65,
    criterionScores: [
      { criterionId: "c1", criterionName: "Concept Understanding", score: 7, maxScore: 10, feedback: "Good basic understanding but lacks depth on molecular processes." },
      { criterionId: "c2", criterionName: "Explanation Quality", score: 6, maxScore: 10, feedback: "Explanation is clear but oversimplified." },
      { criterionId: "c3", criterionName: "Completeness", score: 7, maxScore: 10, feedback: "Mentions both stages but misses key details like water splitting." },
      { criterionId: "c4", criterionName: "Scientific Accuracy", score: 6, maxScore: 10, feedback: "Limited use of scientific terminology." },
    ],
    misconceptions: [{ topic: "Energy Conversion", description: "Implies plants 'make food' rather than converting light energy to chemical energy", suggestion: "Review the energy transformation aspect of photosynthesis" }],
    overallFeedback: "Demonstrates basic understanding but needs more depth and scientific precision.",
    improvementSuggestions: ["Include details about water splitting and oxygen release", "Use terms like ATP, NADPH, and chlorophyll", "Explain the connection between the two reaction stages"],
    semanticSimilarity: 0.62, evaluatedAt: "2026-03-03T09:05:00Z",
  },
  {
    id: "r2", submissionId: "s2", questionId: "q1", studentName: "Bob Chen",
    overallScore: 32, totalPossible: 40, percentage: 80,
    criterionScores: [
      { criterionId: "c1", criterionName: "Concept Understanding", score: 8, maxScore: 10, feedback: "Strong understanding of core concepts." },
      { criterionId: "c2", criterionName: "Explanation Quality", score: 8, maxScore: 10, feedback: "Well-structured and logical explanation." },
      { criterionId: "c3", criterionName: "Completeness", score: 8, maxScore: 10, feedback: "Covers both stages with good detail." },
      { criterionId: "c4", criterionName: "Scientific Accuracy", score: 8, maxScore: 10, feedback: "Good use of scientific terms." },
    ],
    misconceptions: [],
    overallFeedback: "Excellent answer with strong conceptual understanding and good use of terminology.",
    improvementSuggestions: ["Could mention the role of enzymes", "Add more detail about the Calvin cycle steps"],
    semanticSimilarity: 0.82, evaluatedAt: "2026-03-03T09:35:00Z",
  },
  {
    id: "r3", submissionId: "s3", questionId: "q1", studentName: "Carol Davis",
    overallScore: 37, totalPossible: 40, percentage: 92,
    criterionScores: [
      { criterionId: "c1", criterionName: "Concept Understanding", score: 9.5, maxScore: 10, feedback: "Excellent understanding of all concepts." },
      { criterionId: "c2", criterionName: "Explanation Quality", score: 9, maxScore: 10, feedback: "Very clear and well-organized." },
      { criterionId: "c3", criterionName: "Completeness", score: 9, maxScore: 10, feedback: "Comprehensive coverage of both stages." },
      { criterionId: "c4", criterionName: "Scientific Accuracy", score: 9.5, maxScore: 10, feedback: "Excellent use of precise scientific terminology." },
    ],
    misconceptions: [],
    overallFeedback: "Outstanding answer demonstrating deep understanding and precise scientific communication.",
    improvementSuggestions: ["Could elaborate on the significance of G3P in glucose formation"],
    semanticSimilarity: 0.94, evaluatedAt: "2026-03-03T10:05:00Z",
  },
  {
    id: "r4", submissionId: "s4", questionId: "q2", studentName: "David Lee",
    overallScore: 25, totalPossible: 30, percentage: 83,
    criterionScores: [
      { criterionId: "c5", criterionName: "Law Definitions", score: 8, maxScore: 10, feedback: "Good definitions with minor imprecisions." },
      { criterionId: "c6", criterionName: "Examples Quality", score: 9, maxScore: 10, feedback: "Excellent real-world examples for each law." },
      { criterionId: "c7", criterionName: "Conceptual Clarity", score: 8, maxScore: 10, feedback: "Clear explanations overall." },
    ],
    misconceptions: [],
    overallFeedback: "Strong answer with great examples. Minor improvements in formal definitions would elevate the response.",
    improvementSuggestions: ["State the first law more formally using 'net force'", "Include the mathematical form F=ma explicitly"],
    semanticSimilarity: 0.78, evaluatedAt: "2026-03-04T11:05:00Z",
  },
  {
    id: "r5", submissionId: "s5", questionId: "q2", studentName: "Eva Martinez",
    overallScore: 15, totalPossible: 30, percentage: 50,
    criterionScores: [
      { criterionId: "c5", criterionName: "Law Definitions", score: 6, maxScore: 10, feedback: "Laws are mentioned but not fully defined." },
      { criterionId: "c6", criterionName: "Examples Quality", score: 3, maxScore: 10, feedback: "No examples provided." },
      { criterionId: "c7", criterionName: "Conceptual Clarity", score: 6, maxScore: 10, feedback: "Very brief, lacks explanation." },
    ],
    misconceptions: [{ topic: "Depth of Understanding", description: "Answer is too superficial to demonstrate real understanding", suggestion: "Practice explaining each law in your own words with examples" }],
    overallFeedback: "Answer is too brief and lacks the required examples. Needs significant expansion.",
    improvementSuggestions: ["Provide real-world examples for each law", "Explain what each law means in practical terms", "Expand definitions with more detail"],
    semanticSimilarity: 0.45, evaluatedAt: "2026-03-04T11:35:00Z",
  },
];
