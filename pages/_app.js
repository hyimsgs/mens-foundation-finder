import '../styles/globals.css'
import Head from 'next/head'

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>남자 파운데이션 몇 호? | 사진으로 5초 진단</title>
        <meta name="description" content="사진 1장으로 21/23호 파운데이션 호수 추천. 남자 전용 간단 진단, 쿠팡 링크로 바로 구매." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph */}
        <meta property="og:title" content="남자 파운데이션 몇 호?" />
        <meta property="og:description" content="사진 1장으로 5초 만에 파운데이션 호수 진단" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og-image.jpg" />
        
        {/* 쿠팡 파트너스 광고 고지 */}
        <meta name="coupang-verification" content="파트너스 활동을 통해 일정액의 수수료를 제공받을 수 있음" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp