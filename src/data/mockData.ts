import type { Exam, ExamSubmission, ExamEvaluation } from "@/types/evaluation";

export const mockExams: Exam[] = [
  {
    id: "exam1",
    title: "Biology Mid-Term Exam",
    subject: "Biology",
    totalMarks: 50,
    createdAt: "2026-03-01T10:00:00Z",
    questions: [
      {
        id: "eq1", questionNumber: 1, marks: 15,
        questionText: "Explain the process of photosynthesis including the light-dependent and light-independent reactions.",
        modelAnswer: "Photosynthesis converts light energy into chemical energy. Light-dependent reactions occur in thylakoid membranes, splitting water to produce ATP, NADPH, and O2. The Calvin cycle (light-independent) occurs in the stroma, fixing CO2 into glucose using ATP and NADPH.",
        rubricCriteria: [
          { id: "rc1", name: "Concept Understanding", description: "Core photosynthesis concepts", maxScore: 5 },
          { id: "rc2", name: "Explanation Quality", description: "Clarity and logic", maxScore: 5 },
          { id: "rc3", name: "Completeness", description: "Both reaction types covered", maxScore: 5 },
        ],
      },
      {
        id: "eq2", questionNumber: 2, marks: 15,
        questionText: "Describe the structure and function of DNA, and explain how it replicates.",
        modelAnswer: "DNA is a double helix of nucleotides (adenine, thymine, guanine, cytosine) connected by hydrogen bonds. During replication, helicase unwinds the helix, and DNA polymerase synthesizes complementary strands using base-pairing rules, producing two identical copies.",
        rubricCriteria: [
          { id: "rc4", name: "Structure Knowledge", description: "Accurate DNA structure", maxScore: 5 },
          { id: "rc5", name: "Function Description", description: "Role of DNA explained", maxScore: 5 },
          { id: "rc6", name: "Replication Process", description: "Accurate replication steps", maxScore: 5 },
        ],
      },
      {
        id: "eq3", questionNumber: 3, marks: 10,
        questionText: "What is natural selection? Give two examples.",
        modelAnswer: "Natural selection is the process where organisms with favorable traits are more likely to survive and reproduce. Example 1: Peppered moths—dark-colored moths thrived during industrial pollution. Example 2: Antibiotic-resistant bacteria survive and reproduce when exposed to antibiotics.",
        rubricCriteria: [
          { id: "rc7", name: "Definition", description: "Accurate definition", maxScore: 4 },
          { id: "rc8", name: "Examples", description: "Two relevant examples", maxScore: 6 },
        ],
      },
      {
        id: "eq4", questionNumber: 4, marks: 10,
        questionText: "Explain the difference between mitosis and meiosis.",
        modelAnswer: "Mitosis produces two identical diploid daughter cells for growth/repair. Meiosis produces four genetically unique haploid gametes through two divisions with crossing over, enabling genetic diversity in sexual reproduction.",
        rubricCriteria: [
          { id: "rc9", name: "Mitosis Description", description: "Accurate mitosis details", maxScore: 5 },
          { id: "rc10", name: "Meiosis Description", description: "Accurate meiosis details", maxScore: 5 },
        ],
      },
    ],
  },
  {
    id: "exam2",
    title: "Physics Final Exam",
    subject: "Physics",
    totalMarks: 40,
    createdAt: "2026-03-05T09:00:00Z",
    questions: [
      {
        id: "eq5", questionNumber: 1, marks: 15,
        questionText: "State and explain Newton's three laws of motion with real-world examples for each.",
        modelAnswer: "1st Law (Inertia): Objects remain at rest/in motion unless acted on by a net force. Example: seatbelts prevent forward motion in a crash. 2nd Law (F=ma): Force equals mass times acceleration. Example: heavier carts require more force. 3rd Law: Every action has an equal opposite reaction. Example: rocket thrust.",
        rubricCriteria: [
          { id: "rc11", name: "Laws Accuracy", description: "All three laws stated correctly", maxScore: 6 },
          { id: "rc12", name: "Examples", description: "Relevant examples for each", maxScore: 5 },
          { id: "rc13", name: "Clarity", description: "Clear explanations", maxScore: 4 },
        ],
      },
      {
        id: "eq6", questionNumber: 2, marks: 10,
        questionText: "Define kinetic and potential energy. Derive the formula for kinetic energy.",
        modelAnswer: "Kinetic energy is energy of motion (KE = ½mv²). Potential energy is stored energy due to position (PE = mgh). Derivation: Work = Fd, using F=ma and v²=u²+2as, for an object starting from rest: W = ma × v²/2a = ½mv².",
        rubricCriteria: [
          { id: "rc14", name: "Definitions", description: "Both types defined", maxScore: 4 },
          { id: "rc15", name: "Derivation", description: "Correct KE derivation", maxScore: 6 },
        ],
      },
      {
        id: "eq7", questionNumber: 3, marks: 15,
        questionText: "Explain the concept of electromagnetic induction and describe Faraday's law.",
        modelAnswer: "Electromagnetic induction is the production of EMF by changing magnetic flux through a conductor. Faraday's law states that the induced EMF is proportional to the rate of change of magnetic flux (ε = -dΦ/dt). Applications include generators and transformers.",
        rubricCriteria: [
          { id: "rc16", name: "Concept", description: "EM induction explained", maxScore: 5 },
          { id: "rc17", name: "Faraday's Law", description: "Accurate statement and formula", maxScore: 5 },
          { id: "rc18", name: "Applications", description: "Practical examples", maxScore: 5 },
        ],
      },
    ],
  },
];

const generateQuestionEval = (q: Exam["questions"][0], answerQuality: number): ExamEvaluation["questionEvaluations"][0] => {
  const criterionScores = q.rubricCriteria.map(c => {
    const ratio = Math.max(0.2, Math.min(1, answerQuality + (Math.random() - 0.5) * 0.3));
    const score = Math.round(c.maxScore * ratio * 10) / 10;
    return {
      criterionId: c.id, criterionName: c.name, score, maxScore: c.maxScore,
      feedback: ratio > 0.75 ? `Strong performance on ${c.name.toLowerCase()}.` : ratio > 0.5 ? `Adequate understanding of ${c.name.toLowerCase()}, but more depth needed.` : `Weak on ${c.name.toLowerCase()}. Review this topic.`,
    };
  });
  const score = criterionScores.reduce((s, c) => s + c.score, 0);
  const pct = Math.round((score / q.marks) * 100);
  const misconceptions = answerQuality < 0.6 ? [{ topic: `Q${q.questionNumber} Concept`, description: "Confusion about core concepts", suggestion: "Review textbook chapter on this topic" }] : [];
  return {
    questionId: q.id, questionNumber: q.questionNumber, questionText: q.questionText,
    score: Math.round(score * 10) / 10, maxMarks: q.marks, percentage: pct, criterionScores, misconceptions,
    feedback: pct >= 80 ? "Excellent response with strong understanding." : pct >= 60 ? "Good effort, but some areas need improvement." : "Significant gaps in understanding. Needs revision.",
    semanticSimilarity: Math.max(0.3, Math.min(0.98, answerQuality + (Math.random() - 0.5) * 0.2)),
  };
};

const getGrade = (pct: number) => pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F";

export const mockSubmissions: ExamSubmission[] = [
  { id: "sub1", examId: "exam1", studentName: "Alice Johnson", studentEmail: "alice@school.edu", submissionType: "typed", answers: [
    { questionId: "eq1", answer: "Photosynthesis is when plants use sunlight to make food. Light reactions happen in thylakoid and make ATP. Calvin cycle uses CO2 to make sugar." },
    { questionId: "eq2", answer: "DNA is a double helix with bases A, T, G, C. It stores genetic information. During replication, the strands separate and new complementary strands are made by DNA polymerase." },
    { questionId: "eq3", answer: "Natural selection is survival of the fittest. Animals that are better adapted survive. Like how cheetahs are fast to catch prey." },
    { questionId: "eq4", answer: "Mitosis makes two identical cells. Meiosis makes four different cells with half the chromosomes for reproduction." },
  ], submittedAt: "2026-03-03T09:00:00Z", evaluated: true },
  { id: "sub2", examId: "exam1", studentName: "Bob Chen", studentEmail: "bob@school.edu", submissionType: "typed", answers: [
    { questionId: "eq1", answer: "Photosynthesis converts light to chemical energy. In thylakoid membranes, light-dependent reactions split H2O producing ATP, NADPH, O2. The Calvin cycle in stroma fixes CO2 into G3P using these products." },
    { questionId: "eq2", answer: "DNA is a double helix of nucleotides connected by hydrogen bonds between complementary bases. Helicase unwinds, primase adds primers, DNA polymerase III synthesizes leading/lagging strands, ligase joins Okazaki fragments." },
    { questionId: "eq3", answer: "Natural selection is the mechanism where organisms with advantageous traits survive and reproduce more. Example: peppered moths darkening during industrial revolution. Example: antibiotic-resistant bacteria surviving treatment." },
    { questionId: "eq4", answer: "Mitosis: one division, 2 diploid cells, for growth. Meiosis: two divisions, 4 haploid gametes, crossing over creates genetic diversity for sexual reproduction." },
  ], submittedAt: "2026-03-03T09:30:00Z", evaluated: true },
  { id: "sub3", examId: "exam1", studentName: "Carol Davis", studentEmail: "carol@school.edu", submissionType: "typed", answers: [
    { questionId: "eq1", answer: "Plants make energy from the sun." },
    { questionId: "eq2", answer: "DNA has genes and stuff. It copies itself." },
    { questionId: "eq3", answer: "Strong animals survive and weak ones die." },
    { questionId: "eq4", answer: "Mitosis and meiosis are types of cell division." },
  ], submittedAt: "2026-03-03T10:00:00Z", evaluated: true },
  { id: "sub4", examId: "exam2", studentName: "David Lee", studentEmail: "david@school.edu", submissionType: "typed", answers: [
    { questionId: "eq5", answer: "First law: objects stay still or moving unless a force acts. Like a ball on grass slows from friction. Second law: F=ma, kicking a ball harder = more acceleration. Third law: action-reaction, swimming pushes water back to move forward." },
    { questionId: "eq6", answer: "Kinetic energy is energy of moving objects, KE = ½mv². Potential energy is stored energy, PE = mgh. Derivation: from work-energy theorem, W = Fd = mad, using v² = 2ad, W = m(v²/2) = ½mv²." },
    { questionId: "eq7", answer: "Electromagnetic induction creates electricity from changing magnetic fields. Faraday's law says induced EMF equals negative rate of change of flux, ε = -dΦ/dt. Used in generators and transformers." },
  ], submittedAt: "2026-03-04T11:00:00Z", evaluated: true },
  { id: "sub5", examId: "exam2", studentName: "Eva Martinez", studentEmail: "eva@school.edu", submissionType: "typed", answers: [
    { questionId: "eq5", answer: "Newton had three laws about motion. The first is about inertia. The second is F=ma. The third is action-reaction." },
    { questionId: "eq6", answer: "Kinetic energy is when something moves. Potential energy is stored. KE = ½mv²." },
    { questionId: "eq7", answer: "Faraday discovered that magnets can make electricity. This is used in power plants." },
  ], submittedAt: "2026-03-04T11:30:00Z", evaluated: true },
  { id: "sub6", examId: "exam1", studentName: "Frank Wilson", studentEmail: "frank@school.edu", answers: [
    { questionId: "eq1", answer: "Photosynthesis uses light energy to convert CO2 and water into glucose and oxygen. The light reactions occur in the thylakoid membranes producing ATP and NADPH, while the Calvin cycle in the stroma uses these to fix carbon." },
    { questionId: "eq2", answer: "DNA is a double helix made of nucleotides with four bases. It stores genetic instructions. Replication involves helicase unwinding and polymerase building new strands." },
    { questionId: "eq3", answer: "Natural selection means organisms best adapted to their environment survive and reproduce more. For example, Darwin's finches evolved different beak shapes for different food sources. Also, bacteria can become resistant to antibiotics through natural selection." },
    { questionId: "eq4", answer: "Mitosis produces two identical diploid cells for growth. Meiosis has two divisions producing four haploid gametes with genetic variation through crossing over." },
  ], submittedAt: "2026-03-06T14:00:00Z", evaluated: false },
  { id: "sub7", examId: "exam2", studentName: "Grace Kim", studentEmail: "grace@school.edu", answers: [
    { questionId: "eq5", answer: "Newton's first law says objects at rest stay at rest unless a force acts on them, like a book on a table. Second law is F=ma, meaning more force means more acceleration. Third law says every action has an equal and opposite reaction, like when you push a wall it pushes back." },
    { questionId: "eq6", answer: "Kinetic energy is the energy of motion, KE = ½mv². Potential energy is stored energy due to position, PE = mgh. To derive KE: start with W = Fd, substitute F=ma, and using kinematics v²=2ad, we get W = ½mv²." },
    { questionId: "eq7", answer: "Electromagnetic induction is generating an electric current by changing the magnetic field around a conductor. Faraday's law states that the induced EMF equals the negative rate of change of magnetic flux. This principle is used in electric generators and transformers." },
  ], submittedAt: "2026-03-06T15:00:00Z", evaluated: false },
];

const buildEvaluation = (sub: ExamSubmission, exam: Exam, qualities: number[]): ExamEvaluation => {
  const qEvals = exam.questions.map((q, i) => generateQuestionEval(q, qualities[i] ?? 0.5));
  const totalScore = qEvals.reduce((s, e) => s + e.score, 0);
  const totalPossible = exam.totalMarks;
  const pct = Math.round((totalScore / totalPossible) * 100);
  const allMisconceptions = qEvals.flatMap(e => e.misconceptions);
  const strengths = qEvals.filter(e => e.percentage >= 75).map(e => `Strong in Q${e.questionNumber}`);
  const weaknesses = qEvals.filter(e => e.percentage < 60).map(e => `Needs work on Q${e.questionNumber}`);

  return {
    id: `eval-${sub.id}`, submissionId: sub.id, examId: exam.id, examTitle: exam.title,
    studentName: sub.studentName, studentEmail: sub.studentEmail,
    totalScore: Math.round(totalScore * 10) / 10, totalPossible, percentage: pct, grade: getGrade(pct),
    questionEvaluations: qEvals, overallMisconceptions: allMisconceptions,
    performanceSummary: pct >= 80 ? "Excellent overall performance with strong conceptual understanding across most topics." : pct >= 60 ? "Good performance overall with some areas needing improvement." : "Below expectations. Significant revision is recommended across multiple topics.",
    strengths: strengths.length ? strengths : ["Keep working to build strengths"],
    weaknesses: weaknesses.length ? weaknesses : ["No major weaknesses detected"],
    evaluatedAt: sub.submittedAt,
  };
};

export const mockEvaluations: ExamEvaluation[] = [
  buildEvaluation(mockSubmissions[0], mockExams[0], [0.65, 0.7, 0.55, 0.7]),
  buildEvaluation(mockSubmissions[1], mockExams[0], [0.9, 0.92, 0.88, 0.85]),
  buildEvaluation(mockSubmissions[2], mockExams[0], [0.3, 0.25, 0.35, 0.3]),
  buildEvaluation(mockSubmissions[3], mockExams[1], [0.8, 0.85, 0.82]),
  buildEvaluation(mockSubmissions[4], mockExams[1], [0.45, 0.4, 0.35]),
];
