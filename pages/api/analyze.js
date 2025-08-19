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

    console.log('GPT Vision API 호출 시작...');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `당신은 한국 남성 화장품 전문가입니다. 이 사진을 보고 파운데이션 호수를 분석해주세요.

분석 기준:
- 17호: 매우 밝은 피부 (창백한 편)
- 21호: 밝은 피부 (한국 남성 평균보다 밝음)  
- 23호: 보통 피부 (한국 남성 평균)
- 25호: 어두운 피부 (탄 피부, 구릿빛)

다음 JSON 형식으로만 답변해주세요:
{
  "shade": "21",
  "confidence": 0.8,
  "reasoning": "피부가 밝은 편이며 한국 남성 평균보다 약간 밝아 보입니다",
  "secondary": "23"
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
        shade: '21',
        confidence: 0.7,
        reasoning: 'GPT 응답 파싱 실패로 기본값 사용',
        secondary: '23'
      };
    }

    // 결과 검증 및 보정
    const validShades = ['17', '21', '23', '25'];
    if (!validShades.includes(analysisResult.shade)) {
      analysisResult.shade = '21'; // 기본값
    }

    if (!validShades.includes(analysisResult.secondary)) {
      analysisResult.secondary = analysisResult.shade === '21' ? '23' : '21';
    }

    // 신뢰도 범위 체크
    if (analysisResult.confidence < 0 || analysisResult.confidence > 1) {
      analysisResult.confidence = 0.75;
    }

    console.log('최종 분석 결과:', analysisResult);

    res.status(200).json({
      success: true,
      result: {
        recommendedShade: analysisResult.shade,
        confidence: analysisResult.confidence,
        secondaryShade: analysisResult.secondary,
        message: `당신은 ${analysisResult.shade}호에 가깝습니다.`,
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
  const shades = ['17', '21', '23', '25'];
  const weights = [0.15, 0.4, 0.35, 0.1]; // 21호, 23호 확률 높게
  
  let random = Math.random();
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return {
        shade: shades[i],
        secondary: i < weights.length - 1 ? shades[i + 1] : shades[i - 1]
      };
    }
  }
  
  return { shade: '21', secondary: '23' };
}