// RGB 기반 파운데이션 호수 분석 (GPT + 로컬 혼합)
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  try {
    const { rgbData, skinPatchImage } = req.body;
    
    if (!rgbData) {
      return res.status(400).json({ error: 'RGB 데이터가 없습니다.' });
    }

    console.log('RGB 색상 분석 시작...', rgbData);

    // GPT에게 RGB 값만 전송해서 색상 분류
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `당신은 색상 분석 전문가입니다. 아래 RGB 값을 분석해서 한국 남성 파운데이션 호수를 추천해주세요.

RGB 값: R=${rgbData.r}, G=${rgbData.g}, B=${rgbData.b}

분석 기준:
- 21호: 밝은 베이지 스킨톤 (한국 남성 평균보다 밝음)
- 23호: 보통 베이지 스킨톤 (한국 남성 평균)

반드시 아래 JSON 형식으로만 답변하세요:
{
  "shade": "21",
  "confidence": 0.8,
  "reasoning": "RGB 분석 이유",
  "secondary": "23"
}`
        }
      ],
      max_tokens: 300,
    });

    const gptContent = gptResponse.choices[0].message.content;
    console.log('GPT RGB 분석 응답:', gptContent);

    // JSON 파싱
    let analysisResult;
    try {
      const jsonMatch = gptContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON 형식을 찾을 수 없음');
      }
    } catch (parseError) {
      console.error('JSON 파싱 에러:', parseError);
      // 파싱 실패 시 로컬 RGB 분석 사용
      analysisResult = analyzeShadeFromRGB(rgbData);
    }

    console.log('RGB 분석 결과:', analysisResult);

    res.status(200).json({
      success: true,
      result: {
        recommendedShade: analysisResult.shade,
        confidence: analysisResult.confidence,
        secondaryShade: analysisResult.secondary,
        message: `당신은 ${analysisResult.shade}호에 가깝습니다.`,
        reasoning: analysisResult.reasoning,
        method: 'rgb_analysis',
        rgbData: rgbData // 디버깅용
      }
    });

  } catch (error) {
    console.error('RGB 분석 에러:', error);
    
    // 에러 시 기본 분석
    const fallbackResult = {
      shade: '23',
      confidence: 0.6,
      secondary: '21',
      reasoning: 'RGB 분석 실패로 기본값 사용'
    };
    
    res.status(200).json({
      success: true,
      result: {
        recommendedShade: fallbackResult.shade,
        confidence: fallbackResult.confidence,
        secondaryShade: fallbackResult.secondary,
        message: `당신은 ${fallbackResult.shade}호에 가깝습니다.`,
        reasoning: fallbackResult.reasoning,
        method: 'fallback'
      }
    });
  }
}

// Base64 이미지에서 RGB 값 추출
async function extractRGBFromImage(base64Image) {
  return new Promise((resolve, reject) => {
    // Node.js 환경에서는 canvas 라이브러리 필요
    // 하지만 브라우저에서 이미 처리된 데이터를 받으므로
    // 여기서는 간단한 방식으로 처리
    
    // Base64에서 이미지 데이터 파싱 시뮬레이션
    // 실제로는 프론트엔드에서 RGB 값을 추출해서 보내는 것이 좋음
    
    const imageSize = base64Image.length;
    const brightness = imageSize % 100; // 임시 밝기 계산
    
    // 더미 RGB 값 (실제로는 이미지에서 추출해야 함)
    const avgRGB = {
      r: 200 + (brightness % 40),
      g: 180 + (brightness % 35),
      b: 160 + (brightness % 30)
    };
    
    resolve(avgRGB);
  });
}

// RGB 값으로 호수 분석 (21호/23호만)
function analyzeShadeFromRGB(rgb) {
  const { r, g, b } = rgb;
  
  // 전체적인 밝기 계산 (0-255)
  const brightness = (r + g + b) / 3;
  
  // 21호 vs 23호 구분점 (200 기준)
  const threshold = 200;
  
  let selectedShade;
  let confidence;
  let reasoning;
  
  if (brightness >= threshold) {
    selectedShade = '21';
    // 밝을수록 높은 신뢰도 (200~255 범위에서)
    const normalizedBrightness = (brightness - threshold) / (255 - threshold);
    confidence = Math.max(0.6, 0.7 + normalizedBrightness * 0.2);
    reasoning = `평균 밝기 ${Math.round(brightness)}로 밝은 베이지 톤 (21호)`;
  } else {
    selectedShade = '23';
    // 어두울수록 높은 신뢰도 (0~200 범위에서)
    const normalizedBrightness = brightness / threshold;
    confidence = Math.max(0.6, 0.7 + (1 - normalizedBrightness) * 0.2);
    reasoning = `평균 밝기 ${Math.round(brightness)}로 표준 베이지 톤 (23호)`;
  }
  
  // 2차 추천은 반대 호수
  const secondary = selectedShade === '21' ? '23' : '21';
  
  return {
    shade: selectedShade,
    confidence: Math.round(confidence * 100) / 100,
    secondary: secondary,
    reasoning: reasoning
  };
}
