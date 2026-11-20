import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import FamilyTree3DBoundary from './family-tree/FamilyTree3DBoundary';
import { familyPositions } from './family-tree/layout2D';
import { cleanAppearance, cleanStyle } from './family-tree/ChartStylePanel';
import { DEMO_TRAH_DATA } from './data/demoTrahData';
import { startCinematicBannerRecording } from './utils/cinematicRecorder';
import LeftEditPanel from './components/LeftEditPanel';
import FamilyTree2D from './components/FamilyTree2D';
import PersonModal from './components/PersonModal';

const FamilyTree3D = lazy(() => import('./family-tree/FamilyTree3D'));

const STORAGE_KEY = 'silsilah3d_demo_trah_v1';

const cleanPerson = (p) => ({
  ...p,
  ...(p?.style ? { style: cleanStyle(p.style) } : {}),
  data: { ...(p?.data || {}) },
  rels: {
    parents: [...(p?.rels?.parents || [])],
    children: [...(p?.rels?.children || [])],
    spouses: [...(p?.rels?.spouses || [])],
  },
});

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.people) && parsed.people.length) {
        return {
          title: parsed.title || DEMO_TRAH_DATA.title,
          people: parsed.people.map(cleanPerson),
          appearance: cleanAppearance(parsed.appearance || DEMO_TRAH_DATA.appearance || {}),
        };
      }
    }
  } catch {
    // Fallback to default demo data
  }
  return {
    title: DEMO_TRAH_DATA.title,
    people: (DEMO_TRAH_DATA.people || []).map(cleanPerson),
    appearance: cleanAppearance(DEMO_TRAH_DATA.appearance || {}),
  };
}

export default function App() {
  const initialState = useMemo(() => loadInitialState(), []);
  const [treeTitle, setTreeTitle] = useState(initialState.title);
  const [people, setPeople] = useState(initialState.people);
  const [appearance, setAppearance] = useState(initialState.appearance);
  const [viewMode, setViewMode] = useState('3d');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selected, setSelected] = useState(null);
  const [cameraReset, setCameraReset] = useState(0);
  const [modal, setModal] = useState({ open: false, mode: 'add', relation: null });
  const [recording, setRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(10);
  const stopRecorderRef = useRef(null);
  const stageRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: treeTitle, people, appearance }));
    } catch {
      // Ignore storage quota errors
    }
  }, [treeTitle, people, appearance]);

  useEffect(() => () => stopRecorderRef.current?.(), []);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const selectedPerson = selected ? peopleById.get(selected) || null : null;
  const positions = useMemo(() => familyPositions(people, 'portrait', 1), [people]);

  const handleToggleRecordBanner = () => {
    if (recording) {
      stopRecorderRef.current?.();
      stopRecorderRef.current = null;
      return;
    }

    const begin = () => {
      const canvas = stageRef.current?.querySelector('canvas');
      if (!canvas) {
        window.alert('Kanvas 3D belum siap. Tunggu sebentar lalu coba lagi.');
        return;
      }
      // Trigger the built-in cinematic camera tour ("Play Sorot Leluhur") so the banner animates smoothly!
      const playBtn = stageRef.current?.querySelector('.dgft3d-tour-pill button');
      if (playBtn && !playBtn.classList.contains('is-active')) {
        playBtn.click();
      }
      setRecording(true);
      setRecordingSec(10);
      stopRecorderRef.current = startCinematicBannerRecording({
        sourceCanvas: canvas,
        title: treeTitle || DEMO_TRAH_DATA.title,
        subtitle: 'SILSILAH 3D · BANNER CINEMATIK',
        durationMs: 10000,
        onTick: (sec) => setRecordingSec(sec),
        onComplete: () => {
          setRecording(false);
          stopRecorderRef.current = null;
        },
        onError: (msg) => {
          setRecording(false);
          stopRecorderRef.current = null;
          window.alert(msg);
        },
      });
    };

    if (viewMode !== '3d') {
      setViewMode('3d');
      setTimeout(begin, 750);
    } else {
      begin();
    }
  };

  const handleSavePerson = (data) => {
    if (modal.mode === 'edit' && selectedPerson) {
      setPeople((prev) =>
        prev.map((p) => (p.id === selectedPerson.id ? { ...p, data: { ...p.data, ...data } } : p)),
      );
    } else {
      const newId = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const newPerson = cleanPerson({ id: newId, data, rels: { parents: [], children: [], spouses: [] } });

      setPeople((prev) => {
        const next = prev.map(cleanPerson);
        const anchor = selectedPerson ? next.find((p) => p.id === selectedPerson.id) : null;
        if (anchor && modal.relation === 'child') {
          const parentIds = [anchor.id, ...(anchor.rels.spouses.slice(0, 1))];
          newPerson.rels.parents = parentIds;
          for (const pid of parentIds) {
            const par = next.find((p) => p.id === pid);
            if (par && !par.rels.children.includes(newId)) par.rels.children.push(newId);
          }
        } else if (anchor && modal.relation === 'spouse') {
          newPerson.rels.spouses = [anchor.id];
          if (!anchor.rels.spouses.includes(newId)) anchor.rels.spouses.push(newId);
        } else if (anchor && modal.relation === 'parent') {
          newPerson.rels.children = [anchor.id];
          if (!anchor.rels.parents.includes(newId)) anchor.rels.parents.push(newId);
        }
        next.push(newPerson);
        return next;
      });
      setSelected(newId);
    }
    setModal({ open: false, mode: 'add', relation: null });
  };

  const handleDeleteSelected = () => {
    if (!selectedPerson) return;
    const id = selectedPerson.id;
    setPeople((prev) =>
      prev
        .filter((p) => p.id !== id)
        .map((p) => ({
          ...p,
          rels: {
            parents: (p.rels?.parents || []).filter((x) => x !== id),
            children: (p.rels?.children || []).filter((x) => x !== id),
            spouses: (p.rels?.spouses || []).filter((x) => x !== id),
          },
        })),
    );
    setSelected(null);
  };

  const handleExportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ title: treeTitle, appearance, people }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'silsilah-3d-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed?.people;
      if (!Array.isArray(list) || !list.length) return;
      if (parsed?.title) setTreeTitle(String(parsed.title));
      setPeople(list.map(cleanPerson));
      if (parsed?.appearance) setAppearance(cleanAppearance(parsed.appearance));
      setSelected(null);
      setCameraReset((v) => v + 1);
    } catch {
      window.alert('Format JSON tidak valid.');
    }
  };

  const handleResetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTreeTitle(DEMO_TRAH_DATA.title);
    setPeople((DEMO_TRAH_DATA.people || []).map(cleanPerson));
    setAppearance(cleanAppearance(DEMO_TRAH_DATA.appearance || {}));
    setSelected(null);
    setCameraReset((v) => v + 1);
  };

  const effectiveAppearance = useMemo(
    () => ({
      ...appearance,
      cover: { ...(appearance.cover || {}), title: treeTitle || DEMO_TRAH_DATA.title },
    }),
    [appearance, treeTitle],
  );

  const relationLabelMap = { child: 'Anak', spouse: 'Pasangan', parent: 'Orang Tua' };

  return (
    <div className={`s3d-workspace ${sidebarOpen ? 'is-sidebar-open' : 'is-sidebar-closed'}`}>
      {sidebarOpen && (
        <LeftEditPanel
          treeTitle={treeTitle}
          onChangeTreeTitle={setTreeTitle}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          peopleCount={people.length}
          selectedPerson={selectedPerson}
          onAddRoot={() => setModal({ open: true, mode: 'add', relation: null })}
          onEditSelected={() => setModal({ open: true, mode: 'edit', relation: null })}
          onAddRelation={(rel) => setModal({ open: true, mode: 'add', relation: rel })}
          onDeleteSelected={handleDeleteSelected}
          appearance={appearance}
          onChangeAppearance={setAppearance}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          onResetDemo={handleResetDemo}
          onCollapse={() => setSidebarOpen(false)}
          recording={recording}
          recordingSec={recordingSec}
          onToggleRecordBanner={handleToggleRecordBanner}
        />
      )}

      <main ref={stageRef} className="s3d-stage dgft" aria-label="Kanvas Silsilah">
        {!sidebarOpen && (
          <button
            type="button"
            className="s3d-open-sidebar-btn"
            onClick={() => setSidebarOpen(true)}
            title="Buka panel edit"
          >
            <PanelLeftOpen size={17} />
            <span>Editor</span>
          </button>
        )}

        {viewMode === '3d' ? (
          <FamilyTree3DBoundary>
            <Suspense fallback={<div className="s3d-loading">Memuat ruang 3D…</div>}>
              <FamilyTree3D
                people={people}
                positions={positions}
                generationPositions={positions}
                selected={selected}
                onSelect={setSelected}
                appearance={effectiveAppearance}
                reset={cameraReset}
                initialOverview={Boolean(DEMO_TRAH_DATA.defaultOverview)}
              />
            </Suspense>
          </FamilyTree3DBoundary>
        ) : (
          <FamilyTree2D
            people={people}
            positions={positions}
            selected={selected}
            onSelect={setSelected}
          />
        )}
      </main>

      <PersonModal
        open={modal.open}
        mode={modal.mode}
        relationLabel={modal.relation ? relationLabelMap[modal.relation] : ''}
        initial={modal.mode === 'edit' ? selectedPerson : null}
        onClose={() => setModal({ open: false, mode: 'add', relation: null })}
        onSave={handleSavePerson}
      />
    </div>
  );
}
