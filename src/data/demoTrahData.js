const p = (id, firstName, gender, { lastName = '', title = '', birth = '', death = '', bio = '', parents = [], children = [], spouses = [] } = {}) => ({
  id,
  data: {
    'first name': firstName,
    'last name': lastName,
    gender,
    ...(title ? { gelar: title } : {}),
    ...(birth ? { birthday: birth } : {}),
    ...(death ? { death } : {}),
    ...(bio ? { bio } : {}),
  },
  rels: { parents, children, spouses },
});

export const DEMO_TRAH_DATA = {
  id: 'trah-nusantara',
  label: 'Contoh Trah Keluarga',
  title: 'Silsilah Keluarga Trah Wira Kusuma',
  defaultOverview: true,
  appearance: {
    portraitShape: 'rounded',
    lineStyle: 'solid',
    theme: 'midnight',
  },
  people: [
    // Generasi 1 (Leluhur Utama)
    p('g1-a', 'R. Wira Kusuma', 'M', {
      title: 'Cikal Bakal Trah',
      birth: '1885',
      death: '1958',
      bio: 'Tokoh pendiri padukuhan dan pelopor pertanian di lereng perbukitan.',
      spouses: ['g1-b'],
      children: ['g2-1', 'g2-2', 'g2-3'],
    }),
    p('g1-b', 'Nyai Sekar Arum', 'F', {
      birth: '1892',
      death: '1966',
      bio: 'Pendamping setia dan penggerak pendidikan mengaji warga sekitar.',
      spouses: ['g1-a'],
      children: ['g2-1', 'g2-2', 'g2-3'],
    }),

    // Generasi 2
    p('g2-1', 'H. Ahmad Suryo', 'M', {
      birth: '1914',
      death: '1989',
      parents: ['g1-a', 'g1-b'],
      spouses: ['g2-1s'],
      children: ['g3-1', 'g3-2', 'g3-3', 'g3-4', 'g3-5', 'g3-6'],
    }),
    p('g2-1s', 'Hj. Siti Aminah', 'F', {
      birth: '1918',
      death: '1995',
      spouses: ['g2-1'],
      children: ['g3-1', 'g3-2', 'g3-3', 'g3-4', 'g3-5', 'g3-6'],
    }),
    p('g2-2', 'K.H. Hasan Basri', 'M', {
      birth: '1919',
      death: '1993',
      parents: ['g1-a', 'g1-b'],
      spouses: ['g2-2s'],
      children: ['g3-7', 'g3-8', 'g3-9', 'g3-10'],
    }),
    p('g2-2s', 'Nyai Maryam', 'F', {
      birth: '1923',
      death: '2001',
      spouses: ['g2-2'],
      children: ['g3-7', 'g3-8', 'g3-9', 'g3-10'],
    }),
    p('g2-3', 'R. Ayu Kartini W.', 'F', {
      birth: '1924',
      death: '1998',
      parents: ['g1-a', 'g1-b'],
      spouses: ['g2-3s'],
      children: ['g3-11', 'g3-12'],
    }),
    p('g2-3s', 'R. Prawiro', 'M', {
      birth: '1920',
      death: '1990',
      spouses: ['g2-3'],
      children: ['g3-11', 'g3-12'],
    }),

    // Generasi 3 (Cabang 1 — 6 anak, otomatis tampil grid 3x2)
    p('g3-1', 'Drs. Bambang S.', 'M', { birth: '1942', death: '2018', parents: ['g2-1', 'g2-1s'], spouses: ['g3-1s'], children: ['g4-1', 'g4-2', 'g4-3'] }),
    p('g3-1s', 'Endang Lestari', 'F', { birth: '1946', spouses: ['g3-1'], children: ['g4-1', 'g4-2', 'g4-3'] }),
    p('g3-2', 'Sri Wahyuni', 'F', { birth: '1945', parents: ['g2-1', 'g2-1s'] }),
    p('g3-3', 'Ir. Hendro P.', 'M', { birth: '1948', parents: ['g2-1', 'g2-1s'], spouses: ['g3-3s'], children: ['g4-4', 'g4-5'] }),
    p('g3-3s', 'Ratna Dewi', 'F', { birth: '1951', spouses: ['g3-3'], children: ['g4-4', 'g4-5'] }),
    p('g3-4', 'Agus Salim', 'M', { birth: '1951', parents: ['g2-1', 'g2-1s'] }),
    p('g3-5', 'Nunik Haryati', 'F', { birth: '1954', parents: ['g2-1', 'g2-1s'] }),
    p('g3-6', 'Darmawan', 'M', { birth: '1957', parents: ['g2-1', 'g2-1s'] }),

    // Generasi 3 (Cabang 2 — 4 anak)
    p('g3-7', 'Ust. Fathurrahman', 'M', { birth: '1947', parents: ['g2-2', 'g2-2s'], spouses: ['g3-7s'], children: ['g4-6', 'g4-7', 'g4-8'] }),
    p('g3-7s', 'Umi Kulsum', 'F', { birth: '1950', spouses: ['g3-7'], children: ['g4-6', 'g4-7', 'g4-8'] }),
    p('g3-8', 'Zainal Abidin', 'M', { birth: '1950', parents: ['g2-2', 'g2-2s'] }),
    p('g3-9', 'Laila Munawaroh', 'F', { birth: '1953', parents: ['g2-2', 'g2-2s'] }),
    p('g3-10', 'M. Ridwan', 'M', { birth: '1956', parents: ['g2-2', 'g2-2s'] }),

    // Generasi 3 (Cabang 3 — 2 anak)
    p('g3-11', 'Wibowo Prawiro', 'M', { birth: '1949', parents: ['g2-3', 'g2-3s'], spouses: ['g3-11s'], children: ['g4-9', 'g4-10'] }),
    p('g3-11s', 'Siti Rahayu', 'F', { birth: '1952', spouses: ['g3-11'], children: ['g4-9', 'g4-10'] }),
    p('g3-12', 'Retno Palupi', 'F', { birth: '1954', parents: ['g2-3', 'g2-3s'] }),

    // Generasi 4
    p('g4-1', 'Rizky Pratama', 'M', { birth: '1974', parents: ['g3-1', 'g3-1s'], spouses: ['g4-1s'], children: ['g5-1', 'g5-2'] }),
    p('g4-1s', 'Dina Permata', 'F', { birth: '1977', spouses: ['g4-1'], children: ['g5-1', 'g5-2'] }),
    p('g4-2', 'Ayu Wulandari', 'F', { birth: '1978', parents: ['g3-1', 'g3-1s'] }),
    p('g4-3', 'Bagas Adi', 'M', { birth: '1982', parents: ['g3-1', 'g3-1s'] }),
    p('g4-4', 'Nadia Putri', 'F', { birth: '1979', parents: ['g3-3', 'g3-3s'] }),
    p('g4-5', 'Fajar Nugroho', 'M', { birth: '1984', parents: ['g3-3', 'g3-3s'] }),
    p('g4-6', 'Ahmad Fauzan', 'M', { birth: '1976', parents: ['g3-7', 'g3-7s'], spouses: ['g4-6s'], children: ['g5-3', 'g5-4'] }),
    p('g4-6s', 'Zahra Aulia', 'F', { birth: '1980', spouses: ['g4-6'], children: ['g5-3', 'g5-4'] }),
    p('g4-7', 'Salma Khairunnisa', 'F', { birth: '1981', parents: ['g3-7', 'g3-7s'] }),
    p('g4-8', 'Luqman Hakim', 'M', { birth: '1985', parents: ['g3-7', 'g3-7s'] }),
    p('g4-9', 'Galih Santoso', 'M', { birth: '1979', parents: ['g3-11', 'g3-11s'] }),
    p('g4-10', 'Sekar Kinanti', 'F', { birth: '1983', parents: ['g3-11', 'g3-11s'] }),

    // Generasi 5
    p('g5-1', 'Rafa Alfarizi', 'M', { birth: '2005', parents: ['g4-1', 'g4-1s'] }),
    p('g5-2', 'Kayla Azzahra', 'F', { birth: '2009', parents: ['g4-1', 'g4-1s'] }),
    p('g5-3', 'M. Rayyan', 'M', { birth: '2007', parents: ['g4-6', 'g4-6s'] }),
    p('g5-4', 'Aisyah Humaira', 'F', { birth: '2011', parents: ['g4-6', 'g4-6s'] }),
  ],
};
