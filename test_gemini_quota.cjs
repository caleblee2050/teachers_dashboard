// Gemini API 할당량 테스트 스크립트
const { GoogleGenerativeAI } = require('@google/genai');
require('dotenv').config();

async function testGeminiQuota() {
  try {
    console.log('Gemini API 키 확인 중...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('GEMINI_API_KEY가 설정되지 않았습니다.');
      return;
    }
    
    console.log('API 키 존재 확인: ✓');
    console.log('API 키 시작 부분:', apiKey.substring(0, 10) + '...');
    
    const ai = new GoogleGenerativeAI({ apiKey });
    
    // 간단한 텍스트 생성 테스트
    console.log('\n=== 기본 텍스트 모델 테스트 ===');
    const textModel = ai.models.get('gemini-1.5-flash');
    const textResponse = await textModel.generateContent('안녕하세요');
    console.log('텍스트 생성 성공: ✓');
    
    // TTS 모델 테스트
    console.log('\n=== TTS 모델 테스트 ===');
    try {
      const ttsModel = ai.models.get('gemini-2.5-flash-preview-tts');
      const ttsResponse = await ttsModel.generateContent({
        contents: [{
          role: "user",
          parts: [{ text: "안녕하세요, 테스트입니다." }]
        }],
        config: {
          responseModalities: ["AUDIO"]
        }
      });
      console.log('TTS 모델 접근 성공: ✓');
    } catch (ttsError) {
      console.log('TTS 모델 오류:', ttsError.message);
    }
    
  } catch (error) {
    console.error('Gemini API 테스트 실패:', error.message);
    
    if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
      console.log('\n❌ 할당량 초과 상태입니다.');
    } else if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n❌ API 키가 유효하지 않습니다.');
    } else {
      console.log('\n❓ 기타 오류가 발생했습니다.');
    }
  }
}

testGeminiQuota();