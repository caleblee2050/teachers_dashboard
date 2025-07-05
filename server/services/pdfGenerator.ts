import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

export interface ContentData {
  title: string;
  contentType: string;
  content: any;
  language: string;
}

export async function generatePDF(contentData: ContentData, outputPath: string): Promise<string> {
  try {
    // Generate HTML content
    const htmlContent = generateHTMLContent(contentData);
    
    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      }
    });
    
    await browser.close();
    
    return outputPath;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}

function generateHTMLContent(contentData: ContentData): string {
  const { title, contentType, content, language } = contentData;
  
  let bodyContent = '';
  
  if (contentType === 'summary') {
    bodyContent = generateSummaryHTML(content);
  } else if (contentType === 'quiz') {
    bodyContent = generateQuizHTML(content);
  } else if (contentType === 'study_guide') {
    bodyContent = generateStudyGuideHTML(content);
  } else if (contentType === 'podcast') {
    bodyContent = generatePodcastHTML(content);
  } else if (contentType === 'integrated') {
    bodyContent = generateIntegratedHTML(content);
  }
  
  return `
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #2563eb;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 10px;
          margin-bottom: 30px;
        }
        h2 {
          color: #1e40af;
          margin-top: 30px;
          margin-bottom: 15px;
        }
        h3 {
          color: #1e3a8a;
          margin-top: 25px;
          margin-bottom: 10px;
        }
        .content-info {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 25px;
        }
        .key-concepts {
          background: #fef3c7;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        .quiz-question {
          background: #f0f9ff;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        .options {
          margin: 10px 0;
        }
        .option {
          margin: 5px 0;
          padding: 5px 10px;
          background: #e5e7eb;
          border-radius: 4px;
        }
        .correct-answer {
          background: #dcfce7;
          font-weight: bold;
        }
        .podcast-script {
          background: #fafafa;
          padding: 20px;
          border-radius: 8px;
          font-style: italic;
          line-height: 1.8;
        }
        .learning-objectives {
          background: #e0f2fe;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        ul, ol {
          margin: 10px 0;
          padding-left: 20px;
        }
        li {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      
      <div class="content-info">
        <strong>콘텐츠 타입:</strong> ${getContentTypeLabel(contentType)}<br>
        <strong>언어:</strong> ${getLanguageLabel(language)}<br>
        <strong>생성일:</strong> ${new Date().toLocaleDateString('ko-KR')}
      </div>
      
      ${bodyContent}
    </body>
    </html>
  `;
}

function generateSummaryHTML(content: any): string {
  return `
    <h2>📝 요약</h2>
    <div class="key-concepts">
      <h3>🔑 핵심 개념</h3>
      <ul>
        ${content.keyConcepts.map((concept: string) => `<li>${concept}</li>`).join('')}
      </ul>
    </div>
    
    <h3>📖 주요 내용</h3>
    <p>${content.mainContent}</p>
    
    ${content.formulas && content.formulas.length > 0 ? `
      <h3>🔢 공식</h3>
      <ul>
        ${content.formulas.map((formula: string) => `<li>${formula}</li>`).join('')}
      </ul>
    ` : ''}
  `;
}

function generateQuizHTML(content: any): string {
  return `
    <h2>📝 퀴즈</h2>
    ${content.questions.map((question: any, index: number) => `
      <div class="quiz-question">
        <h3>문제 ${index + 1}</h3>
        <p><strong>${question.question}</strong></p>
        
        ${question.options ? `
          <div class="options">
            ${question.options.map((option: string, optIndex: number) => `
              <div class="option ${option === question.correctAnswer ? 'correct-answer' : ''}">
                ${String.fromCharCode(65 + optIndex)}. ${option}
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <p><strong>정답:</strong> ${question.correctAnswer}</p>
        <p><strong>설명:</strong> ${question.explanation}</p>
      </div>
    `).join('')}
  `;
}

function generateStudyGuideHTML(content: any): string {
  return `
    <h2>📚 학습 가이드</h2>
    
    <div class="learning-objectives">
      <h3>🎯 학습 목표</h3>
      <ul>
        ${content.learningObjectives.map((objective: string) => `<li>${objective}</li>`).join('')}
      </ul>
    </div>
    
    <h3>💡 핵심 개념</h3>
    ${content.keyConcepts.map((concept: any) => `
      <div class="key-concepts">
        <strong>${concept.term}:</strong> ${concept.definition}
      </div>
    `).join('')}
    
    <h3>❓ 학습 질문</h3>
    <ol>
      ${content.studyQuestions.map((question: string) => `<li>${question}</li>`).join('')}
    </ol>
    
    ${content.additionalResources && content.additionalResources.length > 0 ? `
      <h3>📖 추가 자료</h3>
      <ul>
        ${content.additionalResources.map((resource: string) => `<li>${resource}</li>`).join('')}
      </ul>
    ` : ''}
  `;
}

function generatePodcastHTML(content: any): string {
  return `
    <h2>🎙️ 팟캐스트</h2>
    
    <div class="content-info">
      <strong>제목:</strong> ${content.title}<br>
      <strong>설명:</strong> ${content.description}
    </div>
    
    <h3>📝 스크립트</h3>
    <div class="podcast-script">
      ${content.script.replace(/\n/g, '<br>')}
    </div>
  `;
}

function generateIntegratedHTML(content: any): string {
  return `
    <h2>📚 통합 학습 자료</h2>
    
    ${generateStudyGuideHTML(content.studyGuide)}
    
    <div style="page-break-before: always;"></div>
    
    ${generateSummaryHTML(content.summary)}
    
    <div style="page-break-before: always;"></div>
    
    ${generateQuizHTML(content.quiz)}
  `;
}

function getContentTypeLabel(type: string): string {
  switch (type) {
    case 'summary': return '요약';
    case 'quiz': return '퀴즈';
    case 'study_guide': return '학습 가이드';
    case 'podcast': return '팟캐스트';
    case 'integrated': return '통합 콘텐츠';
    default: return type;
  }
}

function getLanguageLabel(language: string): string {
  switch (language) {
    case 'ko': return '한국어';
    case 'en': return 'English';
    case 'ja': return '日本語';
    case 'zh': return '中文';
    case 'th': return 'ไทย';
    case 'vi': return 'Tiếng Việt';
    case 'fil': return 'Filipino';
    default: return language;
  }
}