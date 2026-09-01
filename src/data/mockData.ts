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
        id: "eq1", module: "Module 1: Cell Energetics", bloomLevel: "Understand", courseOutcome: "CO1", questionNumber: 1, marks: 15,
        questionText: "Explain the process of photosynthesis including the light-dependent and light-independent reactions.",
        modelAnswer: "Photosynthesis converts light energy into chemical energy. Light-dependent reactions occur in thylakoid membranes, splitting water to produce ATP, NADPH, and O2. The Calvin cycle (light-independent) occurs in the stroma, fixing CO2 into glucose using ATP and NADPH.",
        rubricCriteria: [
          { id: "rc1", name: "Concept Understanding", description: "Core photosynthesis concepts", maxScore: 5 },
          { id: "rc2", name: "Explanation Quality", description: "Clarity and logic", maxScore: 5 },
          { id: "rc3", name: "Completeness", description: "Both reaction types covered", maxScore: 5 },
        ],
      },
      {
        id: "eq2", module: "Module 2: Molecular Genetics", bloomLevel: "Apply", courseOutcome: "CO2", questionNumber: 2, marks: 15,
        questionText: "Describe the structure and function of DNA, and explain how it replicates.",
        modelAnswer: "DNA is a double helix of nucleotides (adenine, thymine, guanine, cytosine) connected by hydrogen bonds. During replication, helicase unwinds the helix, and DNA polymerase synthesizes complementary strands using base-pairing rules, producing two identical copies.",
        rubricCriteria: [
          { id: "rc4", name: "Structure Knowledge", description: "Accurate DNA structure", maxScore: 5 },
          { id: "rc5", name: "Function Description", description: "Role of DNA explained", maxScore: 5 },
          { id: "rc6", name: "Replication Process", description: "Accurate replication steps", maxScore: 5 },
        ],
      },
      {
        id: "eq3", module: "Module 3: Evolution", bloomLevel: "Analyze", courseOutcome: "CO3", questionNumber: 3, marks: 10,
        questionText: "What is natural selection? Give two examples.",
        modelAnswer: "Natural selection is the process where organisms with favorable traits are more likely to survive and reproduce. Example 1: Peppered moths—dark-colored moths thrived during industrial pollution. Example 2: Antibiotic-resistant bacteria survive and reproduce when exposed to antibiotics.",
        rubricCriteria: [
          { id: "rc7", name: "Definition", description: "Accurate definition", maxScore: 4 },
          { id: "rc8", name: "Examples", description: "Two relevant examples", maxScore: 6 },
        ],
      },
      {
        id: "eq4", module: "Module 2: Molecular Genetics", bloomLevel: "Understand", courseOutcome: "CO2", questionNumber: 4, marks: 10,
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
        id: "eq5", module: "Module 1: Mechanics", bloomLevel: "Apply", courseOutcome: "CO1", questionNumber: 1, marks: 15,
        questionText: "State and explain Newton's three laws of motion with real-world examples for each.",
        modelAnswer: "1st Law (Inertia): Objects remain at rest/in motion unless acted on by a net force. Example: seatbelts prevent forward motion in a crash. 2nd Law (F=ma): Force equals mass times acceleration. Example: heavier carts require more force. 3rd Law: Every action has an equal opposite reaction. Example: rocket thrust.",
        rubricCriteria: [
          { id: "rc11", name: "Laws Accuracy", description: "All three laws stated correctly", maxScore: 6 },
          { id: "rc12", name: "Examples", description: "Relevant examples for each", maxScore: 5 },
          { id: "rc13", name: "Clarity", description: "Clear explanations", maxScore: 4 },
        ],
      },
      {
        id: "eq6", module: "Module 2: Energy", bloomLevel: "Apply", courseOutcome: "CO2", questionNumber: 2, marks: 10,
        questionText: "Define kinetic and potential energy. Derive the formula for kinetic energy.",
        modelAnswer: "Kinetic energy is energy of motion (KE = ½mv²). Potential energy is stored energy due to position (PE = mgh). Derivation: Work = Fd, using F=ma and v²=u²+2as, for an object starting from rest: W = ma × v²/2a = ½mv².",
        rubricCriteria: [
          { id: "rc14", name: "Definitions", description: "Both types defined", maxScore: 4 },
          { id: "rc15", name: "Derivation", description: "Correct KE derivation", maxScore: 6 },
        ],
      },
      {
        id: "eq7", module: "Module 3: Electromagnetism", bloomLevel: "Analyze", courseOutcome: "CO3", questionNumber: 3, marks: 15,
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

export const mockSubmissions: ExamSubmission[] = [];

export const mockEvaluations: ExamEvaluation[] = [];
