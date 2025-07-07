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

export interface IntegratedContent {
  title: string;
  studyGuide: StudyGuideContent;
  summary: SummaryContent;
  quiz: QuizContent;
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
  geminiFileLink?: string;
}

export async function generatePodcastScript(originalText: string, language: 'ko' | 'en' | 'ja' | 'zh' | 'th' | 'vi' | 'fil'): Promise<PodcastContent> {
  if (!apiKey || !ai) {
    throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY environment variable.");
  }

  try {
    const languageInstruction = getLanguageInstruction(language);
    
    // 원본 텍스트 길이 제한 (너무 긴 경우 처음 부분만 사용)
    const maxTextLength = 4000; // 토큰 제한 고려
    const contentText = originalText.length > maxTextLength 
      ? originalText.substring(0, maxTextLength) + "..."
      : originalText;

    const prompt = `${languageInstruction}

Create an engaging podcast script based on the following educational content. The script should feature two hosts having a natural conversation:
- Host A: Main presenter, introduces topics and asks questions
- Host B: Expert, provides explanations and answers

The conversation should be educational yet engaging, approximately 5-7 minutes long.

Important: Base the podcast content ONLY on the provided educational material below. Do not add external information.

Educational content:
${contentText}

Please format your response as JSON:
{
  "title": "Podcast episode title based on the content",
  "description": "Brief episode description about the content",
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

export async function generatePodcastAudio(script: string, outputPath: string, pdfPath?: string, user?: any): Promise<{ audioPath: string; geminiFileLink?: string }> {
  if (!apiKey || !ai) {
    throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY environment variable.");
  }

  try {
    console.log('Starting AI Audio Overview generation with Gemini...');
    
    // 스크립트 길이 제한 (토큰 제한 고려)
    const maxScriptLength = 3000;
    const limitedScript = script.length > maxScriptLength 
      ? script.substring(0, maxScriptLength) + "..."
      : script;
    
    // AI 오디오 오버뷰를 위한 프롬프트 - NotebookLM 스타일
    const overviewPrompt = `다음 교육 자료를 바탕으로 NotebookLM 스타일의 AI 오디오 오버뷰를 생성해주세요.

AI 오디오 오버뷰 요구사항:
- 두 명의 AI 호스트가 자연스럽고 편안한 대화 형태로 진행
- 교육 내용을 이해하기 쉽게 요약하고 설명
- 핵심 포인트들을 대화를 통해 강조
- 호스트들이 서로 질문하고 답변하며 내용을 풀어나감
- 5-8분 분량의 팟캐스트 형태
- 한국어로 자연스럽게 생성
- 교육적이면서도 흥미롭게 전달

`;

    // 텍스트만으로 오디오 생성 (PDF 사용 안 함 - 모달리티 제한으로 인해)
    const contents = [{
      text: overviewPrompt + `\n\n교육 자료:\n${limitedScript}`
    }];

    // AI Audio Overview 생성 시도 - 순서대로 모델 테스트
    let response;
    const modelsToTry = [
      "gemini-2.5-flash-preview-tts",
      "gemini-2.5-pro-preview-tts"
    ];
    
    let lastError;
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying audio generation with model: ${modelName}`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: [{
            role: "user",
            parts: contents
          }],
          config: {
            responseModalities: ["AUDIO"]
          }
        });
        console.log(`Successfully generated audio with model: ${modelName}`);
        break; // 성공하면 루프 종료
      } catch (error: any) {
        console.log(`Model ${modelName} failed:`, error.message || error);
        lastError = error;
        continue; // 다음 모델 시도
      }
    }
    
    if (!response) {
      throw lastError || new Error("All audio generation models failed");
    }

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No AI Audio Overview generated from Gemini");
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      throw new Error("No audio content in AI Audio Overview response");
    }

    // 오디오 데이터 및 파일 링크 찾기
    for (const part of content.parts) {
      if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/') && part.inlineData.data) {
        const audioData = Buffer.from(part.inlineData.data as string, 'base64');
        
        // 업로드 폴더 확인 및 생성
        const uploadDir = path.dirname(outputPath);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // 오디오 파일 저장 전 검증
        console.log(`Audio data size: ${audioData.length} bytes`);
        console.log(`MIME type: ${part.inlineData.mimeType}`);
        
        // 파일이 너무 작으면 오류
        if (audioData.length < 1000) {
          throw new Error(`Audio file too small (${audioData.length} bytes), likely corrupted`);
        }
        
        fs.writeFileSync(outputPath, audioData);
        console.log(`AI Audio Overview saved to: ${outputPath}`);
        
        // 저장된 파일 크기 재확인
        const savedStats = fs.statSync(outputPath);
        console.log(`Saved file size: ${savedStats.size} bytes`);
        
        // 제미나이 Files API를 사용하여 파일 업로드 및 공유 링크 생성
        let geminiFileLink;
        
        try {
          console.log('Uploading audio to Gemini Files API...');
          
          const fileName = path.basename(outputPath);
          const audioBuffer = fs.readFileSync(outputPath);
          
          // Gemini Files API를 사용하여 파일 업로드
          const fileUploadResponse = await ai.files.upload({
            file: {
              name: fileName,
              data: audioBuffer,
              mimeType: part.inlineData.mimeType
            }
          });
          
          if (fileUploadResponse && fileUploadResponse.file) {
            // 업로드된 파일의 URI를 공유 링크로 사용
            geminiFileLink = fileUploadResponse.file.uri;
            console.log(`Gemini file uploaded successfully: ${geminiFileLink}`);
            
            // 또는 공개 공유 링크가 있다면 사용
            if ((fileUploadResponse.file as any).publicUrl) {
              geminiFileLink = (fileUploadResponse.file as any).publicUrl;
              console.log(`Gemini public URL: ${geminiFileLink}`);
            }
          }
        } catch (uploadError) {
          console.warn('Failed to upload to Gemini Files API:', uploadError);
          
          // 대안: 로컬 서버의 스트리밍 URL을 제미나이 링크로 표시
          const fileName = path.basename(outputPath);
          geminiFileLink = `/api/podcast/stream/${fileName}`;
          console.log('Using local streaming URL as fallback:', geminiFileLink);
        }
        
        return { 
          audioPath: outputPath, 
          geminiFileLink: geminiFileLink || null 
        };
      }
    }

    throw new Error("No audio data found in Gemini AI Audio Overview response");
  } catch (error) {
    console.error('Error generating AI Audio Overview with Gemini:', error);
    
    // 할당량 초과 시 특별 처리
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('exceeded your current quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      console.log('Gemini API quota exceeded. Please wait and try again later, or upgrade your plan.');
      throw new Error('Gemini API 할당량이 초과되었습니다. 잠시 후 다시 시도해주시거나 플랜을 업그레이드해주세요.');
    }
    
    throw new Error(`Failed to generate AI Audio Overview: ${errorMessage}`);
  }
}

export async function generateIntegratedContent(text: string, language: 'ko' | 'en' | 'ja' | 'zh' | 'th' | 'vi' | 'fil'): Promise<IntegratedContent> {
  if (!apiKey || !ai) {
    throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY environment variable.");
  }

  const languageName = languageNames[language];
  const prompt = `다음 교육 자료를 바탕으로 통합 교육 콘텐츠를 생성해주세요. 학습 가이드, 요약, 퀴즈를 포함한 완전한 교육 자료를 만들어주세요.

교육 자료:
${text}

다음 구조로 JSON 형식으로 작성해주세요:
{
  "title": "전체 콘텐츠 제목",
  "studyGuide": {
    "title": "학습 가이드 제목",
    "learningObjectives": ["학습 목표 1", "학습 목표 2", "학습 목표 3"],
    "keyConcepts": [
      {
        "term": "핵심 개념",
        "definition": "개념 정의"
      }
    ],
    "studyQuestions": ["학습 질문 1", "학습 질문 2"],
    "additionalResources": ["추가 자료 1", "추가 자료 2"]
  },
  "summary": {
    "title": "요약 제목",
    "keyConcepts": ["핵심 개념 1", "핵심 개념 2"],
    "mainContent": "주요 내용 요약",
    "formulas": ["공식 1", "공식 2"]
  },
  "quiz": {
    "title": "퀴즈 제목",
    "questions": [
      {
        "question": "질문 내용",
        "type": "multiple_choice",
        "options": ["선택지 1", "선택지 2", "선택지 3", "선택지 4"],
        "correctAnswer": "정답",
        "explanation": "정답 설명"
      }
    ]
  }
}

모든 내용은 ${languageName}로 작성해주세요.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: `You are an expert educational content creator. Generate comprehensive integrated educational content including study guide, summary, and quiz based on the provided material. Always respond in valid JSON format using the exact structure requested.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            studyGuide: {
              type: "object",
              properties: {
                title: { type: "string" },
                learningObjectives: { type: "array", items: { type: "string" } },
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
                studyQuestions: { type: "array", items: { type: "string" } },
                additionalResources: { type: "array", items: { type: "string" } }
              },
              required: ["title", "learningObjectives", "keyConcepts", "studyQuestions"]
            },
            summary: {
              type: "object",
              properties: {
                title: { type: "string" },
                keyConcepts: { type: "array", items: { type: "string" } },
                mainContent: { type: "string" },
                formulas: { type: "array", items: { type: "string" } }
              },
              required: ["title", "keyConcepts", "mainContent"]
            },
            quiz: {
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
                      options: { type: "array", items: { type: "string" } },
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
          required: ["title", "studyGuide", "summary", "quiz"]
        }
      },
      contents: prompt
    });

    const rawJson = response.text;
    console.log(`Integrated content raw JSON: ${rawJson}`);

    if (rawJson) {
      const data: IntegratedContent = JSON.parse(rawJson);
      return data;
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    console.error('Error generating integrated content:', error);
    throw new Error(`Failed to generate integrated content: ${error}`);
  }
}