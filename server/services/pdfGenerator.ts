import { jsPDF } from 'jspdf';
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
    // Create new PDF document
    const doc = new jsPDF();
    
    // Set Korean font support
    doc.setFont('helvetica');
    doc.setFontSize(16);
    
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    
    // Title
    doc.setFontSize(18);
    doc.text(contentData.title, margin, yPosition);
    yPosition += 15;
    
    // Content type and language
    doc.setFontSize(12);
    doc.text(`콘텐츠 타입: ${getContentTypeLabel(contentData.contentType)}`, margin, yPosition);
    yPosition += 10;
    doc.text(`언어: ${getLanguageLabel(contentData.language)}`, margin, yPosition);
    yPosition += 15;
    
    // Content based on type
    doc.setFontSize(10);
    
    if (contentData.contentType === 'summary') {
      yPosition = addSummaryContent(doc, contentData.content, margin, yPosition, maxWidth);
    } else if (contentData.contentType === 'quiz') {
      yPosition = addQuizContent(doc, contentData.content, margin, yPosition, maxWidth);
    } else if (contentData.contentType === 'study_guide') {
      yPosition = addStudyGuideContent(doc, contentData.content, margin, yPosition, maxWidth);
    } else if (contentData.contentType === 'podcast') {
      yPosition = addPodcastContent(doc, contentData.content, margin, yPosition, maxWidth);
    } else if (contentData.contentType === 'integrated') {
      yPosition = addIntegratedContent(doc, contentData.content, margin, yPosition, maxWidth);
    }
    
    // Save PDF
    const pdfBuffer = doc.output('arraybuffer');
    fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));
    
    return outputPath;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error}`);
  }
}

function addSummaryContent(doc: jsPDF, content: any, margin: number, yPosition: number, maxWidth: number): number {
  doc.setFontSize(14);
  doc.text('요약', margin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(10);
  
  // Main content
  if (content.mainContent) {
    const lines = doc.splitTextToSize(content.mainContent, maxWidth);
    doc.text(lines, margin, yPosition);
    yPosition += lines.length * 5 + 10;
  }
  
  // Key concepts
  if (content.keyConcepts && content.keyConcepts.length > 0) {
    doc.setFontSize(12);
    doc.text('핵심 개념', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    content.keyConcepts.forEach((concept: string) => {
      const lines = doc.splitTextToSize(`• ${concept}`, maxWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 5 + 3;
    });
  }
  
  return yPosition;
}

function addQuizContent(doc: jsPDF, content: any, margin: number, yPosition: number, maxWidth: number): number {
  doc.setFontSize(14);
  doc.text('퀴즈', margin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(10);
  
  if (content.questions && content.questions.length > 0) {
    content.questions.forEach((question: any, index: number) => {
      // Question
      doc.setFontSize(11);
      const questionText = `${index + 1}. ${question.question}`;
      const questionLines = doc.splitTextToSize(questionText, maxWidth);
      doc.text(questionLines, margin, yPosition);
      yPosition += questionLines.length * 5 + 5;
      
      // Options
      if (question.options && question.options.length > 0) {
        doc.setFontSize(10);
        question.options.forEach((option: string, optIndex: number) => {
          const optionText = `   ${String.fromCharCode(65 + optIndex)}. ${option}`;
          const optionLines = doc.splitTextToSize(optionText, maxWidth);
          doc.text(optionLines, margin, yPosition);
          yPosition += optionLines.length * 5 + 2;
        });
      }
      
      // Answer
      doc.setFontSize(9);
      const answerText = `정답: ${question.correctAnswer}`;
      doc.text(answerText, margin, yPosition);
      yPosition += 8;
      
      // Explanation
      if (question.explanation) {
        const explanationText = `설명: ${question.explanation}`;
        const explanationLines = doc.splitTextToSize(explanationText, maxWidth);
        doc.text(explanationLines, margin, yPosition);
        yPosition += explanationLines.length * 5 + 10;
      }
      
      // Check for new page
      if (yPosition > doc.internal.pageSize.height - 30) {
        doc.addPage();
        yPosition = 20;
      }
    });
  }
  
  return yPosition;
}

function addStudyGuideContent(doc: jsPDF, content: any, margin: number, yPosition: number, maxWidth: number): number {
  doc.setFontSize(14);
  doc.text('학습 가이드', margin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(10);
  
  // Learning objectives
  if (content.learningObjectives && content.learningObjectives.length > 0) {
    doc.setFontSize(12);
    doc.text('학습 목표', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    content.learningObjectives.forEach((objective: string) => {
      const lines = doc.splitTextToSize(`• ${objective}`, maxWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 5 + 3;
    });
    yPosition += 10;
  }
  
  // Key concepts
  if (content.keyConcepts && content.keyConcepts.length > 0) {
    doc.setFontSize(12);
    doc.text('핵심 개념', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    content.keyConcepts.forEach((concept: any) => {
      const conceptText = `• ${concept.term}: ${concept.definition}`;
      const lines = doc.splitTextToSize(conceptText, maxWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 5 + 5;
    });
    yPosition += 10;
  }
  
  // Study questions
  if (content.studyQuestions && content.studyQuestions.length > 0) {
    doc.setFontSize(12);
    doc.text('학습 문제', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    content.studyQuestions.forEach((question: string, index: number) => {
      const questionText = `${index + 1}. ${question}`;
      const lines = doc.splitTextToSize(questionText, maxWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 5 + 5;
    });
  }
  
  return yPosition;
}

function addPodcastContent(doc: jsPDF, content: any, margin: number, yPosition: number, maxWidth: number): number {
  doc.setFontSize(14);
  doc.text('팟캐스트', margin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(10);
  
  // Description
  if (content.description) {
    doc.setFontSize(12);
    doc.text('설명', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    const descLines = doc.splitTextToSize(content.description, maxWidth);
    doc.text(descLines, margin, yPosition);
    yPosition += descLines.length * 5 + 10;
  }
  
  // Script
  if (content.script) {
    doc.setFontSize(12);
    doc.text('스크립트', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(9);
    const scriptLines = doc.splitTextToSize(content.script, maxWidth);
    
    // Split script into pages if needed
    let currentLine = 0;
    while (currentLine < scriptLines.length) {
      const remainingPageHeight = doc.internal.pageSize.height - yPosition - 20;
      const maxLinesPerPage = Math.floor(remainingPageHeight / 4);
      
      if (maxLinesPerPage <= 0) {
        doc.addPage();
        yPosition = 20;
        continue;
      }
      
      const pageLinesEnd = Math.min(currentLine + maxLinesPerPage, scriptLines.length);
      const pageLines = scriptLines.slice(currentLine, pageLinesEnd);
      
      doc.text(pageLines, margin, yPosition);
      yPosition += pageLines.length * 4;
      currentLine = pageLinesEnd;
      
      if (currentLine < scriptLines.length) {
        doc.addPage();
        yPosition = 20;
      }
    }
  }
  
  return yPosition;
}

function addIntegratedContent(doc: jsPDF, content: any, margin: number, yPosition: number, maxWidth: number): number {
  // 1. 학습 가이드
  doc.setFontSize(16);
  doc.text('1. 학습 가이드', margin, yPosition);
  yPosition += 15;
  
  if (content.studyGuide) {
    yPosition = addStudyGuideContent(doc, content.studyGuide, margin, yPosition, maxWidth);
    yPosition += 20;
  }
  
  // 새 페이지 추가
  doc.addPage();
  yPosition = 20;
  
  // 2. 요약
  doc.setFontSize(16);
  doc.text('2. 요약', margin, yPosition);
  yPosition += 15;
  
  if (content.summary) {
    yPosition = addSummaryContent(doc, content.summary, margin, yPosition, maxWidth);
    yPosition += 20;
  }
  
  // 새 페이지 추가
  doc.addPage();
  yPosition = 20;
  
  // 3. 퀴즈
  doc.setFontSize(16);
  doc.text('3. 퀴즈', margin, yPosition);
  yPosition += 15;
  
  if (content.quiz) {
    yPosition = addQuizContent(doc, content.quiz, margin, yPosition, maxWidth);
  }
  
  return yPosition;
}

function getContentTypeLabel(type: string): string {
  switch (type) {
    case 'summary': return '요약';
    case 'quiz': return '퀴즈';
    case 'study_guide': return '학습 가이드';
    case 'podcast': return '팟캐스트';
    case 'integrated': return '통합 교육 자료';
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