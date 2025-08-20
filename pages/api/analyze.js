// RGB 기반 파운데이션 호수 분석
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

    // RGB 값으로 호수 결정
    const analysisResult = analyzeShadeFromRGB(rgbData);

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

// RGB 값으로 호수 분석
function analyzeShadeFromRGB(rgb) {
  const { r, g, b } = rgb;
  
  // 전체적인 밝기 계산 (0-255)
  const brightness = (r + g + b) / 3;
  
  // 호수별 RGB 범위 정의
  const shadeRanges = {
    '17': { min: 230, max: 255, description: '매우 밝은 아이보리' },
    '21': { min: 200, max: 230, description: '밝은 베이지' },
    '23': { min: 170, max: 200, description: '보통 베이지' },
    '25': { min: 140, max: 170, description: '어두운 베이지' }
  };
  
  // 밝기 기준으로 호수 결정
  let selectedShade = '23'; // 기본값
  let confidence = 0.7;
  let reasoning = '';
  
  for (const [shade, range] of Object.entries(shadeRanges)) {
    if (brightness >= range.min && brightness < range.max) {
      selectedShade = shade;
      // 범위 중앙에 가까울수록 높은 신뢰도
      const center = (range.min + range.max) / 2;
      const distance = Math.abs(brightness - center);
      const maxDistance = (range.max - range.min) / 2;
      confidence = Math.max(0.6, 1 - (distance / maxDistance) * 0.3);
      reasoning = `평균 밝기 ${Math.round(brightness)}로 ${range.description} 범위에 해당`;
      break;
    }
  }
  
  // 경계값 처리
  if (brightness >= 255) {
    selectedShade = '17';
    confidence = 0.8;
    reasoning = '매우 밝은 색상으로 17호 추천';
  } else if (brightness < 140) {
    selectedShade = '25';
    confidence = 0.8;
    reasoning = '어두운 색상으로 25호 추천';
  }
  
  // 2차 추천 호수 결정
  const shadeOrder = ['17', '21', '23', '25'];
  const currentIndex = shadeOrder.indexOf(selectedShade);
  let secondary;
  
  if (currentIndex === 0) {
    secondary = '21';
  } else if (currentIndex === shadeOrder.length - 1) {
    secondary = '23';
  } else {
    // 밝기에 따라 위아래 호수 중 선택
    const centerBrightness = (shadeRanges[selectedShade].min + shadeRanges[selectedShade].max) / 2;
    secondary = brightness > centerBrightness 
      ? shadeOrder[currentIndex - 1] 
      : shadeOrder[currentIndex + 1];
  }
  
  return {
    shade: selectedShade,
    confidence: Math.round(confidence * 100) / 100,
    secondary: secondary,
    reasoning: reasoning
  };
}
