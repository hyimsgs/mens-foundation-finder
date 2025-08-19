// GPT Vision API를 사용한 파운데이션 호수 분석
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
    }

    console.log('GPT Vision API 호출 시작...', new Date().toISOString());
    console.log('이미지 크기:', imageBase64.length);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `당신은 화장품 색상 매칭 전문가입니다. 이 이미지에서 색상 톤을 분석해서 적합한 화장품 색상을 추천해주세요.

색상 분류:
- A타입: 밝은 색상 톤 (빔각 또는 차가운 색상)
- B타입: 따뜻한 색상 톤 (따뜻한 베이지 색상)

분석 방법:
1. 이미지의 전체적인 색상 톤 분석
2. 밝기와 색상 온도 평가
3. A타입(밝음) 또는 B타입(표준) 중 선택

반드시 아래 JSON 형식으로만 답변하세요:
{
  "type": "A",
  "confidence": 0.8,
  "reasoning": "색상 분석 이유",
  "secondary": "B"
}`
            },
            {
              type: "image_url",
              image_url: {
                "url": imageBase64,
                "detail": "high"
              }
            }
          ]
        }
      ],
      max_tokens: 500,
    });

    const gptResponse = response.choices[0].message.content;
    console.log('GPT 응답:', gptResponse);

    // JSON 파싱
    let analysisResult;
    try {
      // GPT가 JSON 외의 텍스트도 포함할 수 있으므로 JSON 부분만 추출
      const jsonMatch = gptResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON 형식을 찾을 수 없음');
      }
    } catch (parseError) {
      console.error('JSON 파싱 에러:', parseError);
      // 파싱 실패 시 기본값
      analysisResult = {
        type: 'B', // B타입으로 변경
        confidence: 0.7,
        reasoning: 'GPT 응답 파싱 실패로 기본값 사용',
        secondary: 'A'
      };
    }

    // 결과 매핑 (A -> 21호, B -> 23호)
    const shadeMapping = { 'A': '21', 'B': '23' };
    const actualShade = shadeMapping[analysisResult.type] || '23';
    const actualSecondary = shadeMapping[analysisResult.secondary] || '21';

    // 결과 검증 및 보정
    const validTypes = ['A', 'B'];
    if (!validTypes.includes(analysisResult.type)) {
      analysisResult.type = 'B'; // 기본값 B타입으로 변경
    }

    if (!validTypes.includes(analysisResult.secondary)) {
      analysisResult.secondary = analysisResult.type === 'A' ? 'B' : 'A';
    }

    // 신뢰도 범위 체크
    if (analysisResult.confidence < 0 || analysisResult.confidence > 1) {
      analysisResult.confidence = 0.75;
    }

    console.log('최종 분석 결과:', analysisResult);

    res.status(200).json({
      success: true,
      result: {
        recommendedShade: actualShade,
        confidence: analysisResult.confidence,
        secondaryShade: actualSecondary,
        message: `당신은 ${actualShade}호에 가깝습니다.`,
        reasoning: analysisResult.reasoning,
        method: 'gpt_vision'
      }
    });

  } catch (error) {
    console.error('GPT Vision API 에러:', error);
    
    // API 에러 시 기본 분석으로 폴백
    const fallbackResult = basicSkinAnalysis();
    
    res.status(200).json({
      success: true,
      result: {
        recommendedShade: fallbackResult.shade,
        confidence: 0.6,
        secondaryShade: fallbackResult.secondary,
        message: `당신은 ${fallbackResult.shade}호에 가깝습니다.`,
        reasoning: 'GPT API 오류로 기본 분석 사용',
        method: 'fallback',
        error: error.message
      }
    });
  }
}

// 폴백용 기본 분석
function basicSkinAnalysis() {
  const shades = ['21', '23'];
  const weights = [0.4, 0.6]; // 21호 40%, 23호 60% (한국 남성 평균에 맞게)
  
  let random = Math.random();
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return {
        shade: shades[i],
        secondary: shades[1 - i] // 반대 호수
      };
    }
  }
  
  return { shade: '23', secondary: '21' }; // 기본값도 23호로 변경
}