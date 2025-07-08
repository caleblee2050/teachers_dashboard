import { GoogleGenerativeAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function testGeminiQuota() {
  try {
    console.log('=== Gemini API 할당량 테스트 ===');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('❌ GEMINI_API_KEY가 설정되지 않았습니다.');
      return;
    }
    
    console.log('✓ API 키 확인됨:', apiKey.substring(0, 12) + '...');
    
    const ai = new GoogleGenerativeAI({ apiKey });
    
    // 1. 기본 텍스트 모델 테스트
    console.log('\n--- 기본 텍스트 모델 테스트 ---');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: '간단한 테스트입니다. "성공"이라고 답해주세요.' }] }]
      });
      
      if (response.candidates && response.candidates[0]) {
        console.log('✓ 기본 모델 작동 정상');
        console.log('응답:', response.candidates[0].content.parts[0].text?.trim());
      }
    } catch (error: any) {
      console.log('❌ 기본 모델 오류:', error.message);
    }
    
    // 2. TTS 모델 테스트
    console.log('\n--- TTS 모델 테스트 ---');
    const ttsModels = ['gemini-2.5-pro-preview-tts', 'gemini-2.5-flash-preview-tts'];
    
    for (const modelName of ttsModels) {
      try {
        console.log(`${modelName} 테스트 중...`);
        
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: '테스트' }] }],
          config: { responseModalities: ['AUDIO'] }
        });
        
        console.log(`✓ ${modelName} 접근 가능`);
        
      } catch (error: any) {
        console.log(`❌ ${modelName} 오류:`, error.message);
        
        if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
          console.log(`  → ${modelName}: 할당량 초과`);
        } else if (error.message.includes('API_KEY_INVALID')) {
          console.log(`  → ${modelName}: API 키 무효`);
        } else if (error.message.includes('does not support')) {
          console.log(`  → ${modelName}: 모델이 해당 기능 미지원`);
        }
      }
    }
    
    console.log('\n=== 할당량 정보 ===');
    console.log('무료 티어 기본 할당량:');
    console.log('- Gemini 1.5 Flash: 1,500 요청/일');
    console.log('- Gemini 1.5 Pro: 50 요청/일');
    console.log('- TTS 모델: 15 요청/일 (프리뷰)');
    
  } catch (error: any) {
    console.error('전체 테스트 실패:', error.message);
  }
}

testGeminiQuota().catch(console.error);