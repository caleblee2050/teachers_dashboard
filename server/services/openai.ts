import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface SummaryContent {
  title: string;
  keyConcepts: string[];
  mainContent: string;
  formulas?: string[];
}

export interface QuizContent {
  title: string;
  questions: Array<{
    question: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }>;
}

export interface StudyGuideContent {
  title: string;
  learningObjectives: string[];
  keyConcepts: Array<{
    term: string;
    definition: string;
  }>;
  studyQuestions: string[];
  additionalResources?: string[];
}

export async function generateSummary(text: string, language: 'ko' | 'en'): Promise<SummaryContent> {
  const prompt = language === 'ko' 
    ? `다음 교육 자료를 분석하여 학습에 도움이 되는 요약을 생성해주세요. 핵심 개념, 주요 내용, 공식(있다면)을 포함하여 JSON 형식으로 응답해주세요.

형식:
{
  "title": "자료 제목",
  "keyConcepts": ["핵심 개념1", "핵심 개념2"],
  "mainContent": "주요 내용 요약",
  "formulas": ["공식1", "공식2"] (선택사항)
}

교육 자료:
${text}`
    : `Please analyze the following educational material and generate a helpful summary. Include key concepts, main content, and formulas (if any) in JSON format.

Format:
{
  "title": "Material Title",
  "keyConcepts": ["Key Concept 1", "Key Concept 2"],
  "mainContent": "Main content summary",
  "formulas": ["Formula 1", "Formula 2"] (optional)
}

Educational Material:
${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as SummaryContent;
  } catch (error) {
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
}

export async function generateQuiz(text: string, language: 'ko' | 'en'): Promise<QuizContent> {
  const prompt = language === 'ko'
    ? `다음 교육 자료를 바탕으로 5개의 퀴즈 문항을 생성해주세요. 객관식, 참/거짓, 단답형 문제를 다양하게 포함하고, 각 문항에 정답과 해설을 포함하여 JSON 형식으로 응답해주세요.

형식:
{
  "title": "퀴즈 제목",
  "questions": [
    {
      "question": "문제",
      "type": "multiple_choice" | "true_false" | "short_answer",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"] (객관식인 경우만),
      "correctAnswer": "정답",
      "explanation": "해설"
    }
  ]
}

교육 자료:
${text}`
    : `Please generate 5 quiz questions based on the following educational material. Include multiple choice, true/false, and short answer questions with correct answers and explanations in JSON format.

Format:
{
  "title": "Quiz Title",
  "questions": [
    {
      "question": "Question text",
      "type": "multiple_choice" | "true_false" | "short_answer",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"] (for multiple choice only),
      "correctAnswer": "Correct answer",
      "explanation": "Explanation"
    }
  ]
}

Educational Material:
${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as QuizContent;
  } catch (error) {
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
}

export async function generateStudyGuide(text: string, language: 'ko' | 'en'): Promise<StudyGuideContent> {
  const prompt = language === 'ko'
    ? `다음 교육 자료를 바탕으로 학습 가이드를 생성해주세요. 학습 목표, 핵심 개념과 정의, 학습 질문을 포함하여 JSON 형식으로 응답해주세요.

형식:
{
  "title": "학습 가이드 제목",
  "learningObjectives": ["학습 목표1", "학습 목표2"],
  "keyConcepts": [
    {
      "term": "용어",
      "definition": "정의"
    }
  ],
  "studyQuestions": ["학습 질문1", "학습 질문2"],
  "additionalResources": ["추가 자료1", "추가 자료2"] (선택사항)
}

교육 자료:
${text}`
    : `Please generate a study guide based on the following educational material. Include learning objectives, key concepts with definitions, and study questions in JSON format.

Format:
{
  "title": "Study Guide Title",
  "learningObjectives": ["Objective 1", "Objective 2"],
  "keyConcepts": [
    {
      "term": "Term",
      "definition": "Definition"
    }
  ],
  "studyQuestions": ["Study Question 1", "Study Question 2"],
  "additionalResources": ["Resource 1", "Resource 2"] (optional)
}

Educational Material:
${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as StudyGuideContent;
  } catch (error) {
    throw new Error(`Failed to generate study guide: ${error.message}`);
  }
}
