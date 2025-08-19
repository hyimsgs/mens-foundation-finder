import { useRouter } from 'next/router';
import { useState } from 'react';
import Head from 'next/head';
import { getProductsByShade } from '../data/products';

export default function Result() {
  const router = useRouter();
  const { shade, confidence } = router.query;
  
  const recommendedShade = shade || "21";
  const confidenceScore = confidence ? parseFloat(confidence) / 100 : 0.82;

  // 실제 제품 데이터 가져오기
  const products = getProductsByShade(recommendedShade);

  const handleProductClick = (url) => {
    window.open(url, '_blank');
  };

  return (
    <>
      <Head>
        <title>분석 결과 - {recommendedShade}호 | 남자 파운데이션 진단</title>
        <meta name="description" content={`당신은 ${recommendedShade}호에 가깝습니다. 추천 제품을 확인해보세요.`} />
      </Head>

      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="border-b border-gray-800 bg-black/90 backdrop-blur">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-center">분석 결과</h1>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Result Hero */}
          <div className="text-center mb-8">
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 mb-6">
              <h2 className="text-3xl font-bold mb-4">
                당신은 <span className="text-white bg-gray-700 px-3 py-1 rounded">{recommendedShade}호</span>에 가깝습니다
              </h2>
              <p className="text-gray-400 mb-4">브랜드 편차로 인접 호수도 함께 테스트해보세요</p>
            </div>
          </div>

          {/* Product Recommendations */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-6 text-center">{recommendedShade}호 추천 제품</h3>
            <div className="grid gap-4">
              {products.map((product) => (
                <div key={product.id} className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-4 md:mb-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{product.type}</span>
                        <span className="text-xs bg-blue-700 px-2 py-1 rounded text-blue-200">{product.brand}</span>
                        {product.discount && (
                          <span className="text-xs bg-red-700 px-2 py-1 rounded text-red-200">{product.discount} 할인</span>
                        )}
                      </div>
                      <h4 className="font-semibold text-lg mb-1">{product.name}</h4>
                      <p className="text-gray-400 mb-2">{product.feature}</p>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-white">{product.price}</span>
                        {product.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">{product.originalPrice}</span>
                        )}
                      </div>
                      {product.rating && (
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="text-yellow-400">⭐ {product.rating}</span>
                          <span className="text-gray-500 text-sm">({product.reviewCount.toLocaleString()}개 리뷰)</span>
                        </div>
                      )}
                    </div>
                    <div className="text-center md:text-right">
                      <button 
                        onClick={() => handleProductClick(product.coupangUrl)}
                        className="bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors w-full md:w-auto mb-2"
                      >
                        쿠팡에서 보기
                      </button>
                      <p className="text-xs text-gray-500">제휴 링크</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-8">
            <div className="text-center">
              <button 
                onClick={() => router.push('/')}
                className="bg-gray-800 hover:bg-gray-700 text-white py-3 px-6 rounded-lg transition-colors"
              >
                다른 사진으로 재진단
              </button>
            </div>
          </div>

          {/* FAQ Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">자주 묻는 질문</h3>
            <div className="space-y-3">
              <details className="bg-gray-900 rounded-lg border border-gray-800">
                <summary className="p-4 cursor-pointer font-medium">왜 21호/23호가 많나요?</summary>
                <div className="px-4 pb-4 text-gray-400 text-sm">
                  한국 남성의 평균 피부톤이 21-23호 사이에 분포되어 있습니다.
                </div>
              </details>
              <details className="bg-gray-900 rounded-lg border border-gray-800">
                <summary className="p-4 cursor-pointer font-medium">쿨/웜톤은 왜 안 나와요?</summary>
                <div className="px-4 pb-4 text-gray-400 text-sm">
                  이 서비스는 밝기(호수)만 분석합니다. 쿨/웜톤 서비스는 추후에 오픈 예정입니다.
                </div>
              </details>
              <details className="bg-gray-900 rounded-lg border border-gray-800">
                <summary className="p-4 cursor-pointer font-medium">사진을 저장하나요?</summary>
                <div className="px-4 pb-4 text-gray-400 text-sm">
                  분석 즉시 폐기되며 서버에 저장하지 않습니다.
                </div>
              </details>
            </div>
          </div>

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