import { useState } from 'react';
import { Upload, Camera, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedImage || !agreed) return;
    
    setIsAnalyzing(true);
    
    try {
      console.log('1. 분석 시작, 원본 이미지 크기:', uploadedImage.length);
      
      // 이미지 압축 (500KB 이하로)
      const compressedImage = await compressImage(uploadedImage, 500 * 1024); // 500KB
      console.log('2. 이미지 압축 완료, 압축 후 크기:', compressedImage.length);
      
      // 분석 API 호출
      console.log('3. API 호출 시작...');
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: compressedImage
        })
      });
      
      console.log('4. API 응답 받음, 상태:', response.status);
      
      const result = await response.json();
      console.log('5. JSON 파싱 완료:', result);
      
      if (result.success) {
        const { recommendedShade, confidence, secondaryShade, reasoning } = result.result;
        console.log('6. 결과 성공, 이동 시작...');
        router.push(`/result?shade=${recommendedShade}&confidence=${Math.round(confidence * 100)}&secondary=${secondaryShade || ''}&method=gpt`);
      } else {
        console.log('6. API 오류:', result.error);
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('분석 오류:', error);
      // 실패 시 기본값으로 대체
      router.push('/result?shade=21&confidence=75&method=fallback');
    } finally {
      console.log('7. 분석 종료, 로딩 해제');
      setIsAnalyzing(false);
    }
  };

  // 이미지 압축 함수
  const compressImage = (base64Image, maxSize) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 이미지 크기 조정 (600px 최대)
        const maxWidth = 600;
        const maxHeight = 600;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);
        
        // 품질 조정하며 압축
        let quality = 0.8;
        let compressedData = canvas.toDataURL('image/jpeg', quality);
        
        // 크기가 너무 크면 품질 더 낮추기
        while (compressedData.length > maxSize && quality > 0.1) {
          quality -= 0.1;
          compressedData = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(compressedData);
      };
      
      img.src = base64Image;
    });
  };

  return (
    <>
      <Head>
        <title>남자 파운데이션 몇 호? | 사진으로 5초 진단</title>
      </Head>
      
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="border-b border-gray-800 bg-black/90 backdrop-blur">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-center">남자 파운데이션 몇 호?</h1>
            <p className="text-gray-400 text-center mt-2">사진 1장으로 17/21/23/25+ 중 가까운 호수를 예측합니다</p>
            <div className="text-center mt-2">
              <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                ✓ 분석 준비됨
              </span>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Upload Guide */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-center">촬영 가이드 (3줄 규칙)</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <div className="flex items-center mb-2">
                  <Camera className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="font-medium">자연광/흰색등</span>
                </div>
                <p className="text-gray-400 text-sm">창가나 밝은 곳에서 촬영</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="font-medium">정면 + 필터 OFF</span>
                </div>
                <p className="text-gray-400 text-sm">뷰티모드, 필터 끄고 정면</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="font-medium">모자·마스크 금지</span>
                </div>
                <p className="text-gray-400 text-sm">얼굴이 잘 보이도록</p>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
            <div className="text-center">
              {!uploadedImage ? (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 hover:border-gray-500 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">사진 업로드</p>
                    <p className="text-gray-400 text-sm">JPG, PNG 파일 (최대 10MB)</p>
                  </div>
                </label>
              ) : (
                <div className="space-y-4">
                  <img
                    src={uploadedImage}
                    alt="업로드된 사진"
                    className="max-w-xs mx-auto rounded-lg border border-gray-700"
                  />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="text-gray-400 hover:text-white text-sm underline"
                  >
                    다른 사진 선택
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Agreement */}
          <div className="mb-6">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 text-white bg-gray-800 border-gray-600 rounded focus:ring-white focus:ring-2"
              />
              <span className="text-sm text-gray-300">
                분석은 참고용이며 사진은 즉시 폐기됩니다. 진단 결과에 동의합니다.
              </span>
            </label>
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!uploadedImage || !agreed || isAnalyzing}
            className="w-full bg-white text-black font-semibold py-4 px-6 rounded-lg hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                분석 중...
              </>
            ) : (
              <>
                호수 분석하기
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>

          {/* Footer Notices */}
          <div className="mt-8 space-y-4 text-xs text-gray-500">
            <div className="bg-gray-900 p-4 rounded border border-gray-800">
              <h3 className="font-medium text-gray-300 mb-2">광고 고지</h3>
              <p>본 페이지의 일부 링크에는 쿠팡 파트너스 제휴 링크가 포함되어 있으며, 구매 시 일정 수수료를 받을 수 있습니다.</p>
            </div>
            <div className="bg-gray-900 p-4 rounded border border-gray-800">
              <h3 className="font-medium text-gray-300 mb-2">개인정보 안내</h3>
              <p>업로드 사진은 분석 즉시 폐기되며 서버에 저장하지 않습니다.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}