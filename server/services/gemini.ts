import { GoogleGenAI } from "@google/genai";

// This API key is from Gemini Developer API Key, not vertex AI API Key
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
console.log('Gemini API Key available:', !!apiKey);
if (process.env.GOOGLE_API_KEY && process.env.GEMINI_API_KEY) {
  console.log('Both GOOGLE_API_KEY and GEMINI_API_KEY are set. Using GEMINI_API_KEY.');
}
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

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

const languageNames = {
  'ko': '한국어',
  'en': 'English',
  'ja': '日本語',
  'zh': '中文',
  'th': 'ไทย',
  'vi': 'Tiếng Việt',
  'fil': 'Filipino'
};

const getLanguageInstruction = (language: string): string => {
  const languageName = languageNames[language as keyof typeof languageNames] || 'English';
  return `Please respond in ${languageName}. Use appropriate cultural context and educational terminology for ${languageName}.`;
};

export async function generateSummary(text: string, language: 'ko' | 'en' | 'ja' | 'zh' | 'th' | 'vi' | 'fil'): Promise<SummaryContent> {
  if (!apiKey || !ai) {
    throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY environment variable.");
  }
  
  try {
    const languageInstruction = getLanguageInstruction(language);
    
    const prompt = `${languageInstruction}

Analyze and summarize the following educational content. Provide a comprehensive summary with key concepts, main content, and any formulas if present.

Text to analyze:
${text}

Please format your response as JSON with the following structure:
{
  "title": "Brief descriptive title",
  "keyConcepts": ["concept1", "concept2", "concept3"],
  "mainContent": "Detailed summary of the main content",
  "formulas": ["formula1", "formula2"] (if any mathematical formulas are present)
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            keyConcepts: { 
              type: "array",
              items: { type: "string" }
            },
            mainContent: { type: "string" },
            formulas: { 
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["title", "keyConcepts", "mainContent"]
        }
      },
      contents: prompt,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    const data: SummaryContent = JSON.parse(rawJson);
    return data;
  } catch (error) {
    console.error('Gemini summary generation error:', error);
    throw new Error(`Failed to generate summary: ${error}`);
  }
}

export async function generateQuiz(text: string, language: 'ko' | 'en' | 'ja' | 'zh' | 'th' | 'vi' | 'fil'): Promise<QuizContent> {
  if (!apiKey || !ai) {
    throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY environment variable.");
  }
  
  try {
    const languageInstruction = getLanguageInstruction(language);
    
    const prompt = `${languageInstruction}

Create a comprehensive quiz based on the following educational content. Generate 5-8 questions with different types (multiple choice, true/false, short answer).

Text to analyze:
${text}

Please format your response as JSON with the following structure:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "type": "multiple_choice" | "true_false" | "short_answer",
      "options": ["option1", "option2", "option3", "option4"] (only for multiple_choice),
      "correctAnswer": "correct answer",
      "explanation": "explanation of the correct answer"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  type: { type: "string" },
                  options: {
                    type: "array",
                    items: { type: "string" }
                  },
                  correctAnswer: { type: "string" },
                  explanation: { type: "string" }
                },
                required: ["question", "type", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["title", "questions"]
        }
      },
      contents: prompt,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    const data: QuizContent = JSON.parse(rawJson);
    return data;
  } catch (error) {
    console.error('Gemini quiz generation error:', error);
    throw new Error(`Failed to generate quiz: ${error}`);
  }
}

export async function generateStudyGuide(text: string, language: 'ko' | 'en' | 'ja' | 'zh' | 'th' | 'vi' | 'fil'): Promise<StudyGuideContent> {
  if (!apiKey || !ai) {
    throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY environment variable.");
  }
  
  try {
    const languageInstruction = getLanguageInstruction(language);
    
    const prompt = `${languageInstruction}

Create a comprehensive study guide based on the following educational content. Include learning objectives, key concepts with definitions, and study questions.

Text to analyze:
${text}

Please format your response as JSON with the following structure:
{
  "title": "Study guide title",
  "learningObjectives": ["objective1", "objective2", "objective3"],
  "keyConcepts": [
    {
      "term": "concept term",
      "definition": "concept definition"
    }
  ],
  "studyQuestions": ["question1", "question2", "question3"],
  "additionalResources": ["resource1", "resource2"] (optional)
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            learningObjectives: {
              type: "array",
              items: { type: "string" }
            },
            keyConcepts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: { type: "string" },
                  definition: { type: "string" }
                },
                required: ["term", "definition"]
              }
            },
            studyQuestions: {
              type: "array",
              items: { type: "string" }
            },
            additionalResources: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["title", "learningObjectives", "keyConcepts", "studyQuestions"]
        }
      },
      contents: prompt,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    const data: StudyGuideContent = JSON.parse(rawJson);
    return data;
  } catch (error) {
    console.error('Gemini study guide generation error:', error);
    throw new Error(`Failed to generate study guide: ${error}`);
  }
}