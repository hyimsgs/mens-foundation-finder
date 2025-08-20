// 이미지 전처리: 얼굴 특징 블러 + 스킨 패치 추출
import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

// Face-api 모델 로드
export async function loadFaceApiModels() {
  if (modelsLoaded) return;
  
  // 브라우저 환경에서만 실행
  if (typeof window === 'undefined') {
    console.log('서버 환경에서는 face-api 사용 불가');
    return;
  }
  
  try {
    console.log('Face-api 모델 로드 시작...');
    // CDN에서 모델들 로드
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model'),
      faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model'),
    ]);
    modelsLoaded = true;
    console.log('Face-api 모델 로드 완료');
  } catch (error) {
    console.error('Face-api 모델 로드 실패:', error);
    console.log('모델 로드 실패해도 기본 색상 추출로 진행');
    // 에러를 throw하지 않고 계속 진행
  }
}

// 얼굴 특징 블러 처리
export async function preprocessImage(imageBase64) {
  try {
    console.log('이미지 전처리 시작...');
    
    // Base64를 이미지로 변환
    const img = await createImageFromBase64(imageBase64);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    // 얼굴 감지 및 랜드마크 추출
    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();
    
    if (!detection) {
      console.log('얼굴을 감지하지 못함, 원본 이미지 사용');
      return extractColorPatches(canvas);
    }
    
    console.log('얼굴 감지 성공, 특징 마스킹 시작...');
    
    // 얼굴 특징 마스킹
    const landmarks = detection.landmarks;
    
    // 눈 영역 블러
    blurFacialFeature(ctx, landmarks.getLeftEye(), 15);
    blurFacialFeature(ctx, landmarks.getRightEye(), 15);
    
    // 코 영역 블러  
    blurFacialFeature(ctx, landmarks.getNose(), 12);
    
    // 입 영역 블러
    blurFacialFeature(ctx, landmarks.getMouth(), 10);
    
    // 눈썹 영역 블러
    blurFacialFeature(ctx, landmarks.getLeftEyeBrow(), 8);
    blurFacialFeature(ctx, landmarks.getRightEyeBrow(), 8);
    
    console.log('얼굴 특징 마스킹 완료');
    
    // 스킨 패치 추출
    return extractColorPatches(canvas);
    
  } catch (error) {
    console.error('이미지 전처리 에러:', error);
    // 실패 시 원본에서 색상 추출
    const img = await createImageFromBase64(imageBase64);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    return extractColorPatches(canvas);
  }
}

// Base64를 Image 객체로 변환
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

// 스킨 패치 추출 (얼굴 외곽 영역에서 색상 샘플링)
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