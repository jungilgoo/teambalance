// 리그 오브 레전드 챔피언 한글-영어 매핑 및 이미지 URL 생성
export const championNameMap: Record<string, string> = {
  '가렌': 'Garen',
  '갈리오': 'Galio', 
  '갱플랭크': 'Gangplank',
  '그라가스': 'Gragas',
  '그레이브즈': 'Graves',
  '그웬': 'Gwen',
  '나르': 'Gnar',
  '나미': 'Nami',
  '나서스': 'Nasus',
  '나피리': 'Naafiri',
  '노틸러스': 'Nautilus',
  '녹턴': 'Nocturne',
  '누누와 윌럼프': 'Nunu',
  '니달리': 'Nidalee',
  '니코': 'Neeko',
  '닐라': 'Nilah',
  '다리우스': 'Darius',
  '다이애나': 'Diana',
  '드레이븐': 'Draven',
  '라이즈': 'Ryze',
  '라칸': 'Rakan',
  '람머스': 'Rammus',
  '렐': 'Rell',
  '럭스': 'Lux',
  '럼블': 'Rumble',
  '레나타 글라스크': 'Renata',
  '레넥톤': 'Renekton',
  '레오나': 'Leona',
  '렉사이': 'RekSai',
  '렌가': 'Rengar',
  '루시안': 'Lucian',
  '룰루': 'Lulu',
  '르블랑': 'Leblanc',
  '리 신': 'LeeSin',
  '리븐': 'Riven',
  '리산드라': 'Lissandra',
  '릴리아': 'Lillia',
  '마스터 이': 'MasterYi',
  '마오카이': 'Maokai',
  '말자하': 'Malzahar',
  '말파이트': 'Malphite',
  '멜': 'Mel',
  '모데카이저': 'Mordekaiser',
  '모르가나': 'Morgana',
  '문도 박사': 'DrMundo',
  '미스 포츈': 'MissFortune',
  '밀리오': 'Milio',
  '바드': 'Bard',
  '바루스': 'Varus',
  '바이': 'Vi',
  '베이가': 'Veigar',
  '베인': 'Vayne',
  '벡스': 'Vex',
  '벨베스': 'Belveth',
  '벨코즈': 'Velkoz',
  '볼리베어': 'Volibear',
  '브라움': 'Braum',
  '브라이어': 'Briar',
  '브랜드': 'Brand',
  '블라디미르': 'Vladimir',
  '블리츠크랭크': 'Blitzcrank',
  '비에고': 'Viego',
  '빅토르': 'Viktor',
  '뽀삐': 'Poppy',
  '사미라': 'Samira',
  '사이온': 'Sion',
  '사일러스': 'Sylas',
  '샤코': 'Shaco',
  '세나': 'Senna',
  '세라핀': 'Seraphine',
  '세주아니': 'Sejuani',
  '센': 'Zhen',
  '소나': 'Sona',
  '소라카': 'Soraka',
  '쉔': 'Shen',
  '쉬바나': 'Shyvana',
  '스웨인': 'Swain',
  '스카너': 'Skarner',
  '스몰더': 'Smolder',
  '시비르': 'Sivir',
  '신 짜오': 'XinZhao',
  '신드라': 'Syndra',
  '신지드': 'Singed',
  '쓰레쉬': 'Thresh',
  '아리': 'Ahri',
  '아무무': 'Amumu',
  '아우렐리온 솔': 'AurelionSol',
  '아이번': 'Ivern',
  '아지르': 'Azir',
  '아칼리': 'Akali',
  '아크샨': 'Akshan',
  '아펠리오스': 'Aphelios',
  '알리스타': 'Alistar',
  '암베사': 'Ambessa',
  '애니': 'Annie',
  '애니비아': 'Anivia',
  '애쉬': 'Ashe',
  '야스오': 'Yasuo',
  '에코': 'Ekko',
  '엘리스': 'Elise',
  '오공': 'MonkeyKing',
  '오른': 'Ornn',
  '오리아나': 'Orianna',
  '오로라': 'Aurora',
  '올라프': 'Olaf',
  '요네': 'Yone',
  '요릭': 'Yorick',
  '우디르': 'Udyr',
  '우르곳': 'Urgot',
  '워윅': 'Warwick',
  '유나라': 'Yunara',
  '유미': 'Yuumi',
  '이렐리아': 'Irelia',
  '이블린': 'Evelynn',
  '이즈리얼': 'Ezreal',
  '일라오이': 'Illaoi',
  '자르반 4세': 'JarvanIV',
  '자야': 'Xayah',
  '자이라': 'Zyra',
  '자크': 'Zac',
  '잔나': 'Janna',
  '잭스': 'Jax',
  '제드': 'Zed',
  '제라스': 'Xerath',
  '제리': 'Zeri',
  '조이': 'Zoe',
  '직스': 'Ziggs',
  '진': 'Jhin',
  '질리언': 'Zilean',
  '징크스': 'Jinx',
  '초가스': 'Chogath',
  '카르마': 'Karma',
  '카밀': 'Camille',
  '카사딘': 'Kassadin',
  '카시오페아': 'Cassiopeia',
  '카이사': 'Kaisa',
  '카직스': 'Khazix',
  '카타리나': 'Katarina',
  '칼리스타': 'Kalista',
  '케넨': 'Kennen',
  '케이틀린': 'Caitlyn',
  '케인': 'Kayn',
  '케일': 'Kayle',
  '코그모': 'KogMaw',
  '코르키': 'Corki',
  '크산테': 'KSante',
  '퀸': 'Quinn',
  '키아나': 'Qiyana',
  '킨드레드': 'Kindred',
  '타릭': 'Taric',
  '타론': 'Talon',
  '탈론': 'Talon',
  '탈리야': 'Taliyah',
  '탐 켄치': 'TahmeKench',
  '트런들': 'Trundle',
  '트리스타나': 'Tristana',
  '트린다미어': 'Tryndamere',
  '트위스티드 페이트': 'TwistedFate',
  '트위치': 'Twitch',
  '티모': 'Teemo',
  '파이크': 'Pyke',
  '판테온': 'Pantheon',
  '피들스틱': 'Fiddlesticks',
  '피오라': 'Fiora',
  '피즈': 'Fizz',
  '하이머딩거': 'Heimerdinger',
  '헤카림': 'Hecarim',
  '흐웨이': 'Hwei'
};

/**
 * 챔피언 스플래시 아트 이미지 URL을 반환합니다
 * @param koreanName 한글 챔피언 이름
 * @param skinNumber 스킨 번호 (기본값: 0 = 기본 스킨)
 * @returns 이미지 URL 또는 null
 */
export const getChampionSplashArt = (koreanName?: string, skinNumber: number = 0): string | null => {
  if (!koreanName) return null;
  
  const englishName = championNameMap[koreanName];
  if (!englishName) {
    console.warn(`챔피언 매핑을 찾을 수 없습니다: ${koreanName}`);
    return null;
  }
  
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${englishName}_${skinNumber}.jpg`;
};

/**
 * 챔피언 정사각형 아이콘 이미지 URL을 반환합니다 (카드에 더 적합할 수 있음)
 * @param koreanName 한글 챔피언 이름  
 * @returns 이미지 URL 또는 null
 */
export const getChampionSquareIcon = (koreanName?: string): string | null => {
  if (!koreanName) return null;
  
  const englishName = championNameMap[koreanName];
  if (!englishName) return null;
  
  // 최신 패치 버전은 동적으로 가져올 수도 있지만, 일단 고정
  return `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/${englishName}.png`;
};

/**
 * 챔피언 이미지가 로드되지 않을 때의 fallback 색상을 반환합니다
 */
export const getChampionFallbackGradient = (koreanName?: string): string => {
  if (!koreanName) return 'from-gray-200 to-gray-300';
  
  // 챔피언 이름의 해시값을 기반으로 색상 생성
  const hash = koreanName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    'from-blue-400 to-purple-500',
    'from-green-400 to-blue-500', 
    'from-pink-400 to-red-500',
    'from-yellow-400 to-orange-500',
    'from-purple-400 to-pink-500',
    'from-indigo-400 to-blue-500',
    'from-red-400 to-pink-500',
    'from-orange-400 to-red-500'
  ];
  
  return colors[hash % colors.length];
};
