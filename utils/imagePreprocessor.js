// 간단한 얼굴 마스킹 + 색상 분석 (완전 독립형)

// 얼굴 중앙 부분을 마스킹하여 스킨 패치 생성
export async function preprocessImage(imageBase64) {
  try {
    console.log('얼굴 마스킹 + 스킨 패치 생성 시작...');
    
    // Base64를 이미지로 변환
    const img = await createImageFromBase64(imageBase64);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    // 얼굴 중앙 영역 (눈, 코, 입 추정 위치)를 검은색으로 마스킹
    maskFacialFeatures(ctx, canvas.width, canvas.height);
    
    console.log('얼굴 특징 마스킹 완료, 스킨 패치 추출 중...');
    
    // 마스킹된 이미지에서 스킨 색상 패치 추출
    return extractSkinPatches(canvas);
    
  } catch (error) {
    console.error('이미지 전처리 에러:', error);
    console.log('더미 색상 패치 생성으로 대체');
    return createDummyColorPatch();
  }
}

// 얼굴 특징 마스킹 (추정 위치 기반)
function maskFacialFeatures(ctx, width, height) {
  // 얼굴을 9분할해서 중앙 영역들을 마스킹
  
  // 눈 영역 (상단 1/3, 좌우에서 1/4~3/4)
  const eyeY = height * 0.25;
  const eyeHeight = height * 0.15;
  const leftEyeX = width * 0.25;
  const rightEyeX = width * 0.55;
  const eyeWidth = width * 0.2;
  
  // 코 영역 (중앙 1/3)
  const noseX = width * 0.4;
  const noseY = height * 0.4;
  const noseWidth = width * 0.2;
  const noseHeight = height * 0.2;
  
  // 입 영역 (하단 1/3)
  const mouthX = width * 0.35;
  const mouthY = height * 0.65;
  const mouthWidth = width * 0.3;
  const mouthHeight = height * 0.1;
  
  // 검은색으로 마스킹
  ctx.fillStyle = '#000000';
  
  // 왼쪽 눈
  ctx.fillRect(leftEyeX, eyeY, eyeWidth, eyeHeight);
  
  // 오른쪽 눈
  ctx.fillRect(rightEyeX, eyeY, eyeWidth, eyeHeight);
  
  // 코
  ctx.fillRect(noseX, noseY, noseWidth, noseHeight);
  
  // 입
  ctx.fillRect(mouthX, mouthY, mouthWidth, mouthHeight);
  
  console.log('얼굴 특징 영역 마스킹 완료 (눈, 코, 입)');
}
function createImageFromBase64(base64) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });
}

// 얼굴 특징 블러 처리
function blurFacialFeature(ctx, points, blurRadius) {
  if (!points || points.length === 0) return;
  
  // 특징점들로 영역 계산
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.max(0, Math.min(...xs) - blurRadius);
  const maxX = Math.min(ctx.canvas.width, Math.max(...xs) + blurRadius);
  const minY = Math.max(0, Math.min(...ys) - blurRadius);
  const maxY = Math.min(ctx.canvas.height, Math.max(...ys) + blurRadius);
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  if (width <= 0 || height <= 0) return;
  
  // 해당 영역을 검은 박스로 마스킹
  ctx.fillStyle = '#000000';
  ctx.fillRect(minX, minY, width, height);
}

// 마스킹된 이미지에서 스킨 색상 패치 추출
function extractSkinPatches(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // 마스킹되지 않은 얼굴 외곽 영역에서 색상 샘플링
  const patches = [];
  const patchSize = 25;
  
  // 얼굴 외곽 영역에서 샘플링 (6개 지점)
  const sampleAreas = [
    { x: width * 0.15, y: height * 0.3 }, // 왼쪽 이마
    { x: width * 0.85, y: height * 0.3 }, // 오른쪽 이마
    { x: width * 0.1, y: height * 0.5 }, // 왼쪽 볼
    { x: width * 0.9, y: height * 0.5 }, // 오른쪽 볼
    { x: width * 0.3, y: height * 0.8 }, // 왼쪽 턴
    { x: width * 0.7, y: height * 0.8 }, // 오른쪽 턴
  ];
  
  for (const area of sampleAreas) {
    try {
      const imageData = ctx.getImageData(
        Math.max(0, area.x - patchSize/2),
        Math.max(0, area.y - patchSize/2),
        patchSize,
        patchSize
      );
      
      const avgColor = calculateAverageColor(imageData);
      if (avgColor && !isBlackPixel(avgColor)) { // 마스킹된 검은 영역 제외
        patches.push(avgColor);
      }
    } catch (error) {
      console.log('스킨 패치 추출 실패:', error);
    }
  }
  
  console.log('추출된 스킨 색상 패치 수:', patches.length);
  
  // 패치가 없으면 더미 사용
  if (patches.length === 0) {
    return createDummyColorPatch();
  }
  
  return createColorPatchImage(patches);
}

// 평균 색상 계산 (검은 픽셀 제외)
function calculateAverageColor(imageData) {
  const data = imageData.data;
  let r = 0, g = 0, b = 0, count = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    // 검은 픽셀 제외 (마스킹된 영역)
    if (data[i] > 30 || data[i + 1] > 30 || data[i + 2] > 30) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  
  if (count === 0) return null;
  
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  };
}

// 검은 픽셀 체크 (마스킹된 영역 제외용)
function isBlackPixel(color) {
  return color.r < 40 && color.g < 40 && color.b < 40;
}

// 색상 패치들을 하나의 이미지로 만들기
function createColorPatchImage(patches) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // 패치들을 가로로 나열
  canvas.width = patches.length * 60;
  canvas.height = 60;
  
  patches.forEach((color, index) => {
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.fillRect(index * 60, 0, 60, 60);
  });
  
  console.log(`${patches.length}개 스킨 패치로 색상 샘플 이미지 생성`);
  
  // Base64로 변환
  return canvas.toDataURL('image/png');
}

// 더미 색상 패치 생성 (최종 대체 방안)
function createDummyColorPatch() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 300;
  canvas.height = 60;
  
  // 5개의 다양한 스킨톤 색상 패치 생성
  const skinColors = [
    'rgb(240, 220, 200)', // 밝은 스킨톤
    'rgb(230, 210, 190)', // 보통 스킨톤
    'rgb(220, 200, 180)', // 표준 스킨톤
    'rgb(210, 190, 170)', // 어두운 스킨톤
    'rgb(200, 180, 160)'  // 더 어두운 스킨톤
  ];
  
  skinColors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(index * 60, 0, 60, 60);
  });
  
  console.log('더미 스킨톤 색상 패치 생성됨');
  return canvas.toDataURL('image/png');
}
function extractColorPatchesSimple(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // 이미지 중앙 영역에서 여러 패치 추출
  const patches = [];
  const patchSize = 30;
  
  // 5개 영역에서 샘플링 (중앙 중심)
  const sampleAreas = [
    { x: width * 0.4, y: height * 0.3 }, // 왼쪽 위
    { x: width * 0.6, y: height * 0.3 }, // 오른쪽 위
    { x: width * 0.5, y: height * 0.4 }, // 중앙
    { x: width * 0.4, y: height * 0.6 }, // 왼쪽 아래
    { x: width * 0.6, y: height * 0.6 }, // 오른쪽 아래
  ];
  
  for (const area of sampleAreas) {
    try {
      const imageData = ctx.getImageData(
        Math.max(0, area.x - patchSize/2),
        Math.max(0, area.y - patchSize/2),
        patchSize,
        patchSize
      );
      
      const avgColor = calculateAverageColor(imageData);
      if (avgColor) {
        patches.push(avgColor);
      }
    } catch (error) {
      console.log('패치 추출 실패:', error);
    }
  }
  
  console.log('추출된 색상 패치 수:', patches.length);
  
  // 패치가 없으면 더미 사용
  if (patches.length === 0) {
    return createDummyColorPatch();
  }
  
  return createColorPatchImage(patches);
}

// 스킨 패치 추출 (기존 함수 - 예비용)
function extractColorPatches(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // 여러 영역에서 색상 샘플 추출
  const patches = [];
  const patchSize = 20; // 20x20 픽셀 패치
  
  // 이마, 볼, 턱 영역에서 샘플링
  const sampleAreas = [
    { x: width * 0.3, y: height * 0.2 }, // 왼쪽 이마
    { x: width * 0.7, y: height * 0.2 }, // 오른쪽 이마
    { x: width * 0.2, y: height * 0.5 }, // 왼쪽 볼
    { x: width * 0.8, y: height * 0.5 }, // 오른쪽 볼
    { x: width * 0.5, y: height * 0.7 }, // 턱
  ];
  
  for (const area of sampleAreas) {
    try {
      const imageData = ctx.getImageData(
        Math.max(0, area.x - patchSize/2),
        Math.max(0, area.y - patchSize/2),
        patchSize,
        patchSize
      );
      
      // 평균 색상 계산
      const avgColor = calculateAverageColor(imageData);
      if (avgColor && !isBlackPixel(avgColor)) { // 마스킹된 검은 영역 제외
        patches.push(avgColor);
      }
    } catch (error) {
      console.log('패치 추출 실패:', error);
    }
  }
  
  console.log('추출된 색상 패치 수:', patches.length);
  
  // 패치들을 작은 캔버스로 만들어서 Base64로 변환
  return createColorPatchImage(patches);
}

// 평균 색상 계산
function calculateAverageColor(imageData) {
  const data = imageData.data;
  let r = 0, g = 0, b = 0, count = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    // 완전히 검은 픽셀은 제외 (마스킹된 영역)
    if (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  
  if (count === 0) return null;
  
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  };
}

// 검은 픽셀 체크 (마스킹된 영역 제외용)
function isBlackPixel(color) {
  return color.r < 20 && color.g < 20 && color.b < 20;
}

// 색상 패치들을 하나의 이미지로 만들기
function createColorPatchImage(patches) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // 5개 패치를 가로로 나열
  canvas.width = patches.length * 50;
  canvas.height = 50;
  
  patches.forEach((color, index) => {
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.fillRect(index * 50, 0, 50, 50);
  });
  
  // Base64로 변환
  return canvas.toDataURL('image/png');
}

// 더미 색상 패치 생성 (최종 대체 방안)
function createDummyColorPatch() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 250;
  canvas.height = 50;
  
  // 5개의 베이지 색상 패치 생성
  const colors = [
    'rgb(245, 230, 210)', // 밝은 베이지
    'rgb(235, 220, 200)', // 중간 베이지
    'rgb(225, 210, 190)', // 표준 베이지
    'rgb(215, 200, 180)', // 어두운 베이지
    'rgb(205, 190, 170)'  // 더 어두운 베이지
  ];
  
  colors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(index * 50, 0, 50, 50);
  });
  
  console.log('더미 색상 패치 생성됨');
  return canvas.toDataURL('image/png');
}