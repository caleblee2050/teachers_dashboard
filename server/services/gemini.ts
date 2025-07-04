import { GoogleGenAI, Modality } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

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

export interface PodcastContent {
  title: string;
  description: string;
  script: string;
  audioFilePath?: string;
  duration?: number;
}

export async function generatePodcastScript(content: any, language: 'ko' | 'en' | 'ja' | 'zh' | 'th' | 'vi' | 'fil'): Promise<PodcastContent> {
  if (!apiKey || !ai) {
    throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY environment variable.");
  }

  try {
    const languageInstruction = getLanguageInstruction(language);
    
    // 콘텐츠 타입에 따라 다른 접근 방식 사용
    let contentText = '';
    if (content.contentType === 'summary') {
      contentText = `제목: ${content.title}\n\n주요 내용:\n${content.content.mainContent}\n\n핵심 개념:\n${content.content.keyConcepts.join(', ')}`;
    } else if (content.contentType === 'quiz') {
      contentText = `제목: ${content.title}\n\n퀴즈 문제들:\n${content.content.questions.map((q: any, i: number) => `${i + 1}. ${q.question}`).join('\n')}`;
    } else if (content.contentType === 'study_guide') {
      contentText = `제목: ${content.title}\n\n학습 목표:\n${content.content.learningObjectives.join('\n')}\n\n핵심 개념:\n${content.content.keyConcepts.map((c: any) => `- ${c.term}: ${c.definition}`).join('\n')}`;
    }

    const prompt = `${languageInstruction}

Create an engaging podcast script based on the following educational content. The script should feature two hosts having a natural conversation:
- Host A: Main presenter, introduces topics and asks questions
- Host B: Expert, provides explanations and answers

The conversation should be educational yet engaging, approximately 5-7 minutes long.

Educational content:
${contentText}

Please format your response as JSON:
{
  "title": "Podcast episode title",
  "description": "Brief episode description",
  "script": "Host A: Hello everyone...\\nHost B: Hi there..."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            script: { type: "string" }
          },
          required: ["title", "description", "script"]
        }
      },
      contents: prompt,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    const data: PodcastContent = JSON.parse(rawJson);
    return data;
  } catch (error) {
    console.error('Gemini podcast script generation error:', error);
    throw new Error(`Failed to generate podcast script: ${error}`);
  }
}

export async function generatePodcastAudio(script: string, outputPath: string, pdfPath?: string): Promise<string> {
  if (!apiKey || !ai) {
    throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY environment variable.");
  }

  try {
    console.log('Starting podcast audio generation with Gemini...');
    
    // PDF 파일이 있으면 함께 업로드
    let contents: any[] = [];
    
    if (pdfPath && fs.existsSync(pdfPath)) {
      console.log(`Uploading PDF file: ${pdfPath}`);
      
      // PDF 파일 읽기
      const pdfBuffer = fs.readFileSync(pdfPath);
      
      contents.push({
        inlineData: {
          data: pdfBuffer.toString('base64'),
          mimeType: 'application/pdf'
        }
      });
      
      contents.push({
        text: `이 PDF 문서의 내용을 바탕으로 5분 분량의 자연스러운 한국어 팟캐스트 오디오를 생성해주세요. 교육적이고 이해하기 쉬운 톤으로 설명해주세요.`
      });
    } else {
      // PDF가 없으면 텍스트 스크립트만 사용
      contents.push({
        text: `다음 스크립트를 바탕으로 5분 분량의 자연스러운 한국어 팟캐스트 오디오를 생성해주세요:\n\n${script}`
      });
    }

    // Gemini에서 오디오 생성 요청
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: contents
      }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Aoede"
            }
          }
        }
      }
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No audio generated from Gemini");
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      throw new Error("No audio content in response");
    }

    // 오디오 데이터 찾기 및 저장
    for (const part of content.parts) {
      if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/') && part.inlineData.data) {
        const audioData = Buffer.from(part.inlineData.data as string, 'base64');
        
        // 업로드 폴더 확인 및 생성
        const uploadDir = path.dirname(outputPath);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, audioData);
        console.log(`Podcast audio saved to: ${outputPath}`);
        return outputPath;
      }
    }

    throw new Error("No audio data found in Gemini response");
  } catch (error) {
    console.error('Error generating podcast audio with Gemini:', error);
    throw new Error(`Failed to generate podcast audio: ${error}`);
  }
}