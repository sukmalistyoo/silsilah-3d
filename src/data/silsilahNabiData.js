// Silsilah Nasab Mulia Nabi Muhammad SAW hingga Nabi Adam AS
// - Nabi Muhammad SAW s.d. Adnan: 21 generasi muttafaq 'alaih (disepakati seluruh ulama sirah & nasab).
// - Adnan s.d. Nabi Ibrahim AS & Nabi Adam AS: merujuk riwayat masyhur kitab sirah klasik
//   (Sirah Ibnu Hisyam & Ar-Rahiq Al-Makhtum) dengan catatan perbedaan jumlah generasi antara Nabi Ismail AS dan Adnan.

function node(id, name, arabic, gender, meta = {}, rels = {}) {
  const tier = meta.tier || '';
  return {
    id,
    ...(tier === 'rasul'
      ? { style: { stroke: '#ffe066' } }
      : tier === 'nabi'
        ? { style: { stroke: '#34d399' } }
        : {}),
    data: {
      'first name': name,
      'last name': '',
      arabic,
      tier,
      gender,
      title: meta.title || '',
      clan: meta.clan || 'Nasab Mulia Nabi Muhammad SAW',
      biography: meta.bio || '',
      verification: 'verified',
      source: meta.source || 'Sirah Nabawiyah (Ibnu Hisyam & Ar-Rahiq Al-Makhtum)',
    },
    rels: {
      parents: rels.parents || [],
      spouses: rels.spouses || [],
      children: rels.children || [],
    },
  };
}

export const SILSILAH_NABI_DATA = {
  static: true,
  version: 'nabi-muhammad-v2-adam',
  defaultFrameIds: ['muhammad', 'khadijah', 'qasim', 'ibrahim', 'hasan', 'husain'],
  ariaLabel: 'Bagan interaktif 3D Silsilah Nabi Muhammad SAW hingga Nabi Adam AS',
  appearance: {
    portraitShape: 'rounded',
  },
  people: [
    // =========================================================================
    // BAGIAN III (Atas): Nabi Adam AS hingga Nabi Ibrahim AS & Nabi Ismail AS
    // =========================================================================
    node('adam', 'Nabi Adam AS', 'آدَمُ\nعليه السلام', 'M', {
      tier: 'nabi',
      title: 'Abul Basyar · Nabi & Manusia Pertama',
      clan: 'Leluhur Para Nabi',
      bio: 'Nabi pertama dan bapak seluruh umat manusia yang diciptakan langsung oleh Allah SWT.',
    }, { children: ['syits'] }),

    node('syits', 'Nabi Syits AS', 'شِيثٌ\nعليه السلام', 'M', {
      tier: 'nabi',
      title: 'Putra Nabi Adam AS · Penerima Shuhuf',
      clan: 'Leluhur Para Nabi',
      bio: 'Putra Nabi Adam AS yang menerima 50 shuhuf (lembaran wahyu) dan meneruskan risalah tauhid.',
    }, { parents: ['adam'], children: ['anusy'] }),

    node('anusy', 'Anusy', 'أَنُوشُ', 'M', {
      title: 'Putra Nabi Syits AS',
      clan: 'Leluhur Para Nabi',
    }, { parents: ['syits'], children: ['qainan'] }),

    node('qainan', 'Qainan', 'قَيْنَانُ', 'M', {
      title: 'Putra Anusy',
      clan: 'Leluhur Para Nabi',
    }, { parents: ['anusy'], children: ['mahlail'] }),

    node('mahlail', 'Mahlail', 'مَهْلَائِيلُ', 'M', {
      title: 'Putra Qainan',
      clan: 'Leluhur Para Nabi',
    }, { parents: ['qainan'], children: ['yarid'] }),

    node('yarid', 'Yarid', 'يَارِدُ', 'M', {
      title: 'Putra Mahlail · Ayahanda Nabi Idris AS',
      clan: 'Leluhur Para Nabi',
    }, { parents: ['mahlail'], children: ['idris'] }),

    node('idris', 'Nabi Idris AS', 'إِدْرِيسُ\nعليه السلام', 'M', {
      tier: 'nabi',
      title: 'Akhnukh bin Yarid · Nabi Pertama yang Menulis dengan Pena',
      clan: 'Leluhur Para Nabi',
      bio: 'Nabi yang diangkat Allah SWT ke martabat yang tinggi (QS. Maryam: 56–57), dikenal sebagai pelopor ilmu tulis-menulis dan astronomi.',
    }, { parents: ['yarid'], children: ['mutawasylikh'] }),

    node('mutawasylikh', 'Mutawasylikh', 'مَتُّوشَلَخُ', 'M', {
      title: 'Putra Nabi Idris AS',
      clan: 'Leluhur Para Nabi',
    }, { parents: ['idris'], children: ['lamak'] }),

    node('lamak', 'Lamak', 'لَمَكُ', 'M', {
      title: 'Putra Mutawasylikh · Ayahanda Nabi Nuh AS',
      clan: 'Leluhur Para Nabi',
    }, { parents: ['mutawasylikh'], children: ['nuh'] }),

    node('nuh', 'Nabi Nuh AS', 'نُوحٌ\nعليه السلام', 'M', {
      tier: 'nabi',
      title: 'Rasul Ulul Azmi · Syaikhul Mursalin',
      clan: 'Leluhur Para Nabi',
      bio: 'Rasul pertama yang diutus kepada kaum musyrik dan diselamatkan bersama orang beriman dalam peristiwa bahtera besar.',
    }, { parents: ['lamak'], children: ['sam'] }),

    node('sam', 'Sam', 'سَامٌ', 'M', {
      title: 'Putra Nabi Nuh AS · Leluhur Bangsa Semit',
      clan: 'Keturunan Nabi Nuh AS',
    }, { parents: ['nuh'], children: ['arfakhsyadz'] }),

    node('arfakhsyadz', 'Arfakhsyadz', 'أَرْفَخْشَذُ', 'M', {
      title: 'Putra Sam bin Nuh AS',
      clan: 'Keturunan Nabi Nuh AS',
    }, { parents: ['sam'], children: ['syalikh'] }),

    node('syalikh', 'Syalikh', 'شَالِخُ', 'M', {
      title: 'Putra Arfakhsyadz',
      clan: 'Keturunan Nabi Nuh AS',
    }, { parents: ['arfakhsyadz'], children: ['abir'] }),

    node('abir', 'Abir', 'عَابِرٌ', 'M', {
      title: 'Putra Syalikh',
      clan: 'Keturunan Nabi Nuh AS',
    }, { parents: ['syalikh'], children: ['faligh'] }),

    node('faligh', 'Faligh', 'فَالِغُ', 'M', {
      title: 'Putra Abir',
      clan: 'Keturunan Nabi Nuh AS',
    }, { parents: ['abir'], children: ['rau'] }),

    node('rau', "Ra'u", 'رَاعُو', 'M', {
      title: 'Putra Faligh',
      clan: 'Keturunan Nabi Nuh AS',
    }, { parents: ['faligh'], children: ['saruj'] }),

    node('saruj', 'Saruj', 'سَارُوجُ', 'M', {
      title: "Putra Ra'u",
      clan: 'Keturunan Nabi Nuh AS',
    }, { parents: ['rau'], children: ['nahur'] }),

    node('nahur', 'Nahur', 'نَاحُورُ', 'M', {
      title: 'Putra Saruj · Kakek Nabi Ibrahim AS',
      clan: 'Keturunan Nabi Nuh AS',
    }, { parents: ['saruj'], children: ['tarikh'] }),

    node('tarikh', 'Tarikh (Azar)', 'تَارِحُ', 'M', {
      title: 'Ayahanda Nabi Ibrahim AS',
      clan: 'Keturunan Nabi Nuh AS',
    }, { parents: ['nahur'], children: ['ibrahim_as'] }),

    node('ibrahim_as', 'Nabi Ibrahim AS', 'إِبْرَاهِيمُ\nعليه السلام', 'M', {
      tier: 'nabi',
      title: "Khalilullah · Abul Anbiya' · Rasul Ulul Azmi",
      clan: 'Leluhur Para Nabi',
      bio: 'Kekasih Allah yang meninggikan pondasi Ka\'bah di Makkah bersama putra sulungnya Nabi Ismail AS.',
    }, { parents: ['tarikh'], children: ['ismail_as'] }),

    node('ismail_as', 'Nabi Ismail AS', 'إِسْمَاعِيلُ\nعليه السلام', 'M', {
      tier: 'nabi',
      title: 'Dzabihullah · Putra Nabi Ibrahim AS & Siti Hajar',
      clan: 'Keturunan Nabi Ibrahim AS',
      bio: 'Menetap di Makkah dan menjadi leluhur Bangsa Arab Musta\'ribah (Adnaniyah).',
    }, { parents: ['ibrahim_as'], children: ['qaidar'] }),

    // =========================================================================
    // BAGIAN II (Tengah): Jalur Penghubung Nabi Ismail AS ke Adnan
    // =========================================================================
    node('qaidar', 'Qaidar', 'قَيْدَارُ', 'M', {
      title: 'Putra Nabi Ismail AS',
      clan: 'Bani Ismail · Adnaniyah',
      bio: 'Salah satu putra terkemuka Nabi Ismail AS yang darinya bersambung jalur keturunan hingga Adnan (ulama nasab berbeda pendapat mengenai jumlah pasti generasi di antara Qaidar dan Adnan).',
    }, { parents: ['ismail_as'], children: ['udad'] }),

    node('udad', 'Udad', 'أُدَدُ', 'M', {
      title: 'Ayahanda Adnan (Jalur Riwayat Nasab)',
      clan: 'Bani Ismail · Adnaniyah',
      bio: 'Ayahanda Adnan menurut riwayat masyhur Ibnu Hisyam; para ulama sepakat bahwa Adnan adalah keturunan langsung Nabi Ismail AS.',
    }, { parents: ['qaidar'], children: ['adnan'] }),

    // =========================================================================
    // BAGIAN I (Muttafaq 'Alaih): 21 Generasi Disepakati dari Adnan ke Nabi SAW
    // =========================================================================
    node('adnan', 'Adnan', 'عَدْنَانُ', 'M', {
      title: 'Batas Nasab Muttafaq \'Alaih (Keturunan Nabi Ismail AS)',
      clan: 'Bani Quraisy · Adnaniyah',
      bio: 'Batas nasab Nabi Muhammad SAW ke atas yang disepakati kesahihannya secara ijma\' oleh seluruh ulama sirah dan ahli nasab.',
    }, { parents: ['udad'], children: ['maad'] }),

    node('maad', "Ma'ad", 'مَعَدُّ', 'M', {
      title: 'Putra Adnan',
      clan: 'Bani Quraisy · Adnaniyah',
    }, { parents: ['adnan'], children: ['nizar'] }),

    node('nizar', 'Nizar', 'نِزَارُ', 'M', {
      title: "Putra Ma'ad",
      clan: 'Bani Quraisy · Adnaniyah',
    }, { parents: ['maad'], children: ['mudhar'] }),

    node('mudhar', 'Mudhar', 'مُضَرُ', 'M', {
      title: 'Leluhur Kabilah Mudhar',
      clan: 'Bani Quraisy · Adnaniyah',
    }, { parents: ['nizar'], children: ['ilyas'] }),

    node('ilyas', 'Ilyas', 'إِلْيَاسُ', 'M', {
      title: 'Putra Mudhar',
      clan: 'Bani Quraisy · Adnaniyah',
    }, { parents: ['mudhar'], children: ['mudrikah'] }),

    node('mudrikah', 'Mudrikah', 'مُدْرِكَةُ', 'M', {
      title: 'Amir bin Ilyas',
      clan: 'Bani Quraisy · Adnaniyah',
    }, { parents: ['ilyas'], children: ['khuzaimah'] }),

    node('khuzaimah', 'Khuzaimah', 'خُزَيْمَةُ', 'M', {
      title: 'Putra Mudrikah',
      clan: 'Bani Quraisy · Adnaniyah',
    }, { parents: ['mudrikah'], children: ['kinanah'] }),

    node('kinanah', 'Kinanah', 'كِنَانَةُ', 'M', {
      title: 'Leluhur Bani Kinanah',
      clan: 'Bani Quraisy · Adnaniyah',
    }, { parents: ['khuzaimah'], children: ['annadhr'] }),

    node('annadhr', 'An-Nadhr', 'النَّضْرُ', 'M', {
      title: 'Qais bin Kinanah',
      clan: 'Bani Quraisy · Adnaniyah',
    }, { parents: ['kinanah'], children: ['malik'] }),

    node('malik', 'Malik', 'مَالِكٌ', 'M', {
      title: 'Putra An-Nadhr',
      clan: 'Bani Quraisy · Adnaniyah',
    }, { parents: ['annadhr'], children: ['fihr'] }),

    node('fihr', 'Fihr (Quraisy)', 'فِهْرٌ\nقُرَيْشٌ', 'M', {
      title: 'Leluhur Kabilah Quraisy',
      clan: 'Bani Quraisy',
      bio: 'Dikenal dengan gelar Quraisy, menjadi cikal bakal nama besar kabilah Quraisy di Makkah.',
    }, { parents: ['malik'], children: ['ghalib'] }),

    node('ghalib', 'Ghalib', 'غَالِبٌ', 'M', {
      title: 'Putra Fihr',
      clan: 'Bani Quraisy',
    }, { parents: ['fihr'], children: ['luay'] }),

    node('luay', "Lu'ay", 'لُؤَيُّ', 'M', {
      title: 'Putra Ghalib',
      clan: 'Bani Quraisy',
    }, { parents: ['ghalib'], children: ['kaab'] }),

    node('kaab', "Ka'ab", 'كَعْبٌ', 'M', {
      title: "Putra Lu'ay",
      clan: 'Bani Quraisy',
    }, { parents: ['luay'], children: ['murrah'] }),

    node('murrah', 'Murrah', 'مُرَّةُ', 'M', {
      title: "Putra Ka'ab",
      clan: 'Bani Quraisy',
    }, { parents: ['kaab'], children: ['kilab'] }),

    node('kilab', 'Kilab', 'كِلَابٌ', 'M', {
      title: 'Putra Murrah · Bertemunya Nasab Ayah & Ibu Nabi',
      clan: 'Bani Quraisy',
      bio: 'Kakek buyut tempat bertemunya garis nasab ayahanda (Abdullah) dan ibunda (Aminah binti Wahb bin Abdu Manaf bin Zuhrah bin Kilab).',
    }, { parents: ['murrah'], children: ['qushay'] }),

    node('qushay', 'Qushay', 'قُصَيُّ', 'M', {
      title: 'Pemimpin Makkah & Pendiri Darun Nadwah',
      clan: 'Bani Quraisy',
      bio: 'Menyatukan kabilah Quraisy di Makkah, memegang kunci Ka\'bah, dan mendirikan Darun Nadwah sebagai balai musyawarah.',
    }, { parents: ['kilab'], children: ['abdumanaf'] }),

    node('abdumanaf', 'Abdu Manaf', 'عَبْدُ مَنَافٍ', 'M', {
      title: 'Al-Mughirah bin Qushay',
      clan: 'Bani Quraisy',
    }, { parents: ['qushay'], children: ['hasyim'] }),

    node('hasyim', 'Hasyim', 'هَاشِمٌ', 'M', {
      title: 'Leluhur Bani Hasyim',
      clan: 'Bani Hasyim',
      bio: 'Nama aslinya Amr; digelari Hasyim karena kemurahan hatinya menghidangkan roti remuk (tsarid) bagi jamaah haji Makkah.',
    }, { parents: ['abdumanaf'], children: ['abdulmuthalib'] }),

    node('abdulmuthalib', 'Abdul Muthalib', 'عَبْدُ\nالْمُطَّلِبِ', 'M', {
      title: 'Kakek Nabi SAW · Pemimpin Quraisy',
      clan: 'Bani Hasyim',
      bio: 'Nama aslinya Syaibah al-Hamd; menggali kembali sumur Zamzam dan mengasuh Nabi Muhammad SAW setelah wafatnya ibunda Aminah.',
    }, { parents: ['hasyim'], children: ['abdullah', 'abuthalib', 'hamzah', 'alabbas'] }),

    // Ayahanda, Ibunda, & Paman Utama
    node('abdullah', 'Abdullah', 'عَبْدُ اللهِ', 'M', {
      title: 'Ayahanda Nabi Muhammad SAW',
      clan: 'Bani Hasyim',
      bio: 'Putra kesayangan Abdul Muthalib. Wafat di Yatsrib (Madinah) dalam perjalanan dagang saat Nabi Muhammad SAW masih dalam kandungan ibunda Aminah.',
    }, { parents: ['abdulmuthalib'], spouses: ['aminah'], children: ['muhammad'] }),

    node('aminah', 'Sayyidah Aminah', 'آمِنَةُ\nبِنْتُ وَهْبٍ', 'F', {
      title: 'Ibunda Nabi Muhammad SAW (Bani Zuhrah)',
      clan: 'Bani Zuhrah · Quraisy',
      bio: 'Aminah binti Wahb bin Abdu Manaf bin Zuhrah bin Kilab. Wafat di Abwa saat Nabi Muhammad SAW berusia 6 tahun.',
    }, { spouses: ['abdullah'], children: ['muhammad'] }),

    node('abuthalib', 'Abu Thalib', 'أَبُو طَالِبٍ', 'M', {
      title: 'Paman & Pelindung Nabi SAW',
      clan: 'Bani Hasyim',
      bio: 'Mengasuh Nabi Muhammad SAW sejak usia 8 tahun sepeninggal Abdul Muthalib dan membela dakwah beliau di Makkah. Ayahanda Sayyidina Ali bin Abi Thalib RA.',
    }, { parents: ['abdulmuthalib'], children: ['ali'] }),

    node('hamzah', 'Hamzah RA', 'حَمْزَةُ', 'M', {
      title: 'Paman Nabi SAW · Sayyidusy Syuhada',
      clan: 'Bani Hasyim',
      bio: 'Singa Allah dan Rasul-Nya, pahlawan Islam yang gugur syahid pada Perang Uhud.',
    }, { parents: ['abdulmuthalib'] }),

    node('alabbas', 'Al-Abbas RA', 'الْعَبَّاسُ', 'M', {
      title: 'Paman Nabi SAW · Leluhur Bani Abbasiyah',
      clan: 'Bani Hasyim',
      bio: 'Paman termuda yang sangat dicintai Nabi Muhammad SAW.',
    }, { parents: ['abdulmuthalib'] }),

    // Nabi Muhammad SAW & Sayyidah Khadijah RA
    node('muhammad', 'Nabi Muhammad SAW', 'مُحَمَّدٌ ﷺ', 'M', {
      tier: 'rasul',
      title: "Rasulullah SAW · Khatamul Anbiya'",
      clan: 'Bani Hasyim · Quraisy',
      bio: 'Lahir di Makkah pada Tahun Gajah (12 Rabiul Awal / 571 M), diutus sebagai rahmat bagi seluruh alam (Rahmatan lil \'Alamin), wafat di Madinah pada 12 Rabiul Awal 11 H (632 M).',
    }, {
      parents: ['abdullah', 'aminah'],
      spouses: ['khadijah'],
      children: ['qasim', 'zainab', 'ruqayyah', 'ummukultsum', 'fatimah', 'abdullah_putra', 'ibrahim'],
    }),

    node('khadijah', 'Sayyidah Khadijah RA', 'خَدِيجَةُ\nالْكُبْرَى', 'F', {
      title: 'Ummul Mukminin · Istri Pertama Nabi SAW',
      clan: 'Bani Asad · Quraisy',
      bio: 'Khadijah binti Khuwailid, wanita mulia pertama yang beriman kepada risalah Nabi Muhammad SAW dan ibu dari enam putra-putri beliau.',
    }, {
      spouses: ['muhammad'],
      children: ['qasim', 'zainab', 'ruqayyah', 'ummukultsum', 'fatimah', 'abdullah_putra'],
    }),

    // Putra-Putri Nabi SAW & Menantu Sayyidina Ali RA
    node('qasim', 'Al-Qasim', 'الْقَاسِمُ', 'M', {
      title: 'Putra Sulung Nabi SAW',
      clan: 'Ahlul Bait',
      bio: 'Putra pertama Nabi Muhammad SAW dan Sayyidah Khadijah RA; dari namanya Nabi bergelar Abul Qasim.',
    }, { parents: ['muhammad', 'khadijah'] }),

    node('zainab', 'Zainab RA', 'زَيْنَبُ', 'F', {
      title: 'Putri Sulung Nabi SAW',
      clan: 'Ahlul Bait',
      bio: 'Putri terbesar Nabi Muhammad SAW dan Sayyidah Khadijah RA; menikah dengan Abul Ash bin Ar-Rabi\'.',
    }, { parents: ['muhammad', 'khadijah'] }),

    node('ruqayyah', 'Ruqayyah RA', 'رُقَيَّةُ', 'F', {
      title: 'Putri Nabi SAW',
      clan: 'Ahlul Bait',
      bio: 'Menikah dengan Khalifah Utsman bin Affan RA dan turut berhijrah ke Habasyah serta Madinah.',
    }, { parents: ['muhammad', 'khadijah'] }),

    node('ummukultsum', 'Ummu Kultsum RA', 'أُمُّ كُلْثُومٍ', 'F', {
      title: 'Putri Nabi SAW',
      clan: 'Ahlul Bait',
      bio: 'Menikah dengan Khalifah Utsman bin Affan RA setelah wafatnya Sayyidah Ruqayyah RA.',
    }, { parents: ['muhammad', 'khadijah'] }),

    node('fatimah', 'Fatimah Az-Zahra RA', 'فَاطِمَةُ\nالزَّهْرَاءُ', 'F', {
      title: "Putri Bungsu Nabi SAW · Sayyidatu Nisa'il 'Alamin",
      clan: 'Ahlul Bait',
      bio: 'Putri tercinta Nabi Muhammad SAW yang dari keturunannya bersama Sayyidina Ali bin Abi Thalib RA bersambung nasab mulia Ahlul Bait hingga kini.',
    }, { parents: ['muhammad', 'khadijah'], spouses: ['ali'], children: ['hasan', 'husain'] }),

    node('ali', 'Ali bin Abi Thalib RA', 'عَلِيُّ بْنُ\nأَبِي طَالِبٍ', 'M', {
      title: 'Sepupu & Menantu Nabi SAW · Khulafaur Rasyidin ke-4',
      clan: 'Bani Hasyim · Ahlul Bait',
      bio: 'Putra Abu Thalib, pemuda pertama yang masuk Islam, suami Sayyidah Fatimah Az-Zahra RA, dan ayahanda Sayyidina Hasan & Husain RA.',
    }, { parents: ['abuthalib'], spouses: ['fatimah'], children: ['hasan', 'husain'] }),

    node('abdullah_putra', 'Abdullah (At-Thayyib)', 'عَبْدُ اللهِ\nالطَّيِّبُ', 'M', {
      title: 'Putra Nabi SAW (At-Thayyib / At-Thahir)',
      clan: 'Ahlul Bait',
      bio: 'Putra Nabi Muhammad SAW dan Sayyidah Khadijah RA, wafat saat masih kecil di Makkah.',
    }, { parents: ['muhammad', 'khadijah'] }),

    node('ibrahim', 'Ibrahim', 'إِبْرَاهِيمُ', 'M', {
      title: 'Putra Bungsu Nabi SAW',
      clan: 'Ahlul Bait',
      bio: 'Putra Nabi Muhammad SAW dari Mariyah Al-Qibthiyah RA; lahir di Madinah pada tahun 8 H.',
    }, { parents: ['muhammad'] }),

    // Cucu Mulia Nabi SAW
    node('hasan', 'Al-Hasan RA', 'الْحَسَنُ', 'M', {
      title: 'Cucu Nabi SAW · Pemimpin Pemuda Surga',
      clan: 'Ahlul Bait',
      bio: 'Sayyidina Al-Hasan bin Ali bin Abi Thalib RA, cucu sulung Nabi Muhammad SAW yang mendamaikan umat Islam pada Tahun Jamaah.',
    }, { parents: ['ali', 'fatimah'] }),

    node('husain', 'Al-Husain RA', 'الْحُسَيْنُ', 'M', {
      title: 'Cucu Nabi SAW · Pemimpin Pemuda Surga',
      clan: 'Ahlul Bait',
      bio: 'Sayyidina Al-Husain bin Ali bin Abi Thalib RA, cucu tercinta Nabi Muhammad SAW.',
    }, { parents: ['ali', 'fatimah'] }),
  ],
};
