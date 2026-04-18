# SparkFlow — Design Document v1.0

**Версия:** 1.0  
**Дата:** 2026-04-19  
**Статус:** Draft  
**Автор:** Искра-Кодер vΩ.6

---

## 1. Product Vision

**SparkFlow** — веб-ориентированное приложение для проектирования электроснабжения жилых помещений (квартиры, частные дома).

### 1.1 Problem Statement

Рынок электропроектирования в России характеризуется следующими проблемами:

| Проблема | Статус | Решение SparkFlow |
|----------|--------|-------------------|
| Desktop-software дорогая и требует установки | Существует | Web-native, работает везде |
| Ручной расчёт нагрузок занимает 2-4 часа | Существует | AI-автоматизация за 5 мин |
| Нормы СП 31-110 сложны для новичков | Существует | AI-ассистент с подсказками |
| Генерация документации требует экспертизы | Существует | Автоматическая генерация |
| Нет инструментов для самопроверки | Существует | Compliance checking AI |

### 1.2 USP (Unique Selling Proposition)

1. **AI-ассистент** — автоматическая расстановка розеток, выключателей, освещения по нормам СП 31-110-2003
2. **Автоматический расчёт** — нагрузки, сечения кабелей, номиналы автоматов с обоснованием
3. **Генерация документации** — однолинейная схема, спецификация, кабельный журнал в 3 клика
4. **Визуальный редактор** — 3D-расчёт длины кабелей с учётом высоты монтажа

### 1.3 Target Audience

| Сегмент | Описание | Pain Points | SparkFlow Solution |
|---------|----------|------------|-------------------|
| **Электрики-проектировщики** | Фрилансеры, работают с частными заказами | Тратят 60% времени на рутину | AI-ускорение в 5 раз |
| **Инженеры-проектировщики** | Начинающие специалисты в проектных бюро | Не знают нюансов норм | AI-проверка соответствия |
| **Владельцы жилья** | Ремонт квартиры/дома своими силами | Не знают как спроектировать | Простой интерфейс + AI |
| **Строительные бригады** | Выполняют электромонтаж | Нужна документация для заказчика | Генерация PDF за 1 мин |

### 1.4 Product Goals (SMART)

| Goal | Metric | Target | Timeline |
|------|--------|--------|----------|
| Время создания проекта | Минуты на типовую 2-комн. квартиру | < 30 мин | MVP |
| Качество расчётов | Соответствие СП 31-110 | 100% | Phase 2 |
| User Retention | DAU/MAU | > 20% | Phase 3 |
| Conversion | Free → Paid | > 5% | Phase 3 |

---

## 2. Benchmark Analysis

### 2.1 Проанализированные проекты

| Проект | Тип | Ключевые фичи | Технология | Лицензия | Revenue Model |
|--------|-----|---------------|------------|----------|---------------|
| **QElectroTech** | Desktop CAD | Элементы, схемы, автоматизация | Qt/C++ | GPLv2 | Free (open source) |
| **LibrePCB** | Desktop CAD | Библиотеки, схемный редактор, PCB | C++/Qt | GPLv3 | Donation |
| **DesignSpark Electrical** | Desktop CAD | 2D/3D, библиотеки компонентов | Windows App | Freemium | $99/год |
| **uPlan** | Web SaaS | Электрика, BIM, совместная работа | Cloud | Subscription | €15-50/мес |
| **Drawer AI** | Web SaaS | AI генерация планов, смета | Cloud AI | Subscription | $29-99/мес |
| **Electro Planner** | Web Free | Проектирование, спецификация | Web | Free | Ads |
| **AutoCAD Electrical** | Desktop Enterprise | Полный CAD, интеграции | Windows | Subscription | $2k+/год |
| **ProfiCAD** | Desktop CAD | Электрические схемы | Windows | Paid | €99 (one-time) |

### 2.2 Feature Comparison Matrix

| Feature | QElectroTech | uPlan | Drawer AI | SparkFlow |
|---------|--------------|-------|-----------|-----------|
| Визуальный редактор | ✅ | ✅ | ⚠️ | ✅ |
| AI-расстановка | ❌ | ❌ | ✅ | ✅ |
| Расчёт нагрузок | ⚠️ ручной | ✅ | ✅ | ✅ |
| Спецификация | ✅ | ✅ | ✅ | ✅ |
| PDF/DXF export | ✅ | ✅ | ✅ | ✅ |
| 3D-расчёт кабелей | ❌ | ❌ | ❌ | ✅ |
| Российские нормы | ❌ | ⚠️ | ❌ | ✅ |
| Web-based | ❌ | ✅ | ✅ | ✅ |

### 2.3 Key Learnings из бенчмарка

**Functional Requirements (must-have):**
- [x] Визуальный редактор (drag&drop элементов)
- [x] Библиотека компонентов (розетки, выключатели, щиты)
- [x] Расчёт нагрузок (суммарная мощность, ток)
- [x] Подбор кабелей и автоматов
- [x] Генерация однолинейной схемы
- [x] Спецификация материалов (BOM)
- [x] Экспорт в PDF/DXF
- [x] Undo/Redo

**AI Features (differentiator):**
- Автоматическая расстановка элементов по нормам
- Распознавание планов из PDF/изображений
- Проверка соответствия нормам (compliance checking)
- AI-аудит спецификации

**UX Patterns:**
- Интуитивный sidebar с инструментами
- Многооконный интерфейс (план + щит + спецификация)
- Real-time расчёты при изменении
- Undo/Redo для всех действий
- Подсказки и help tooltips

**Business Model:**
- Freemium (базовые функции бесплатно, AI — платно)
- Subscription для профи (безлимитные проекты)
- B2B: интеграция со смежными сервисами

---

## 3. Architecture

### 3.1 System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Users                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Электрики   │  │ Инженеры   │  │ Владельцы   │  │ Бригады     │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
└─────────┼────────────────┼────────────────┼────────────────┼───────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SparkFlow Web App                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     React 19 SPA                                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐  │   │
│  │  │Dashboard│ │FloorPlan│ │ Panel   │ │ Reports │ │ AITools   │  │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └─────┬─────┘  │   │
│  └───────┼───────────┼───────────┼───────────┼────────────┼────────┘   │
│          │           │           │           │            │             │
│  ┌───────┴───────────┴───────────┴───────────┴────────────┴────────┐   │
│  │                     ProjectContext (State)                         │   │
│  └───────────────────────────────┬───────────────────────────────────┘   │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
            ┌────────────┐  ┌───────────┐  ┌─────────────┐
            │localStorage│  │Gemini API │  │ PDF.js      │
            │(persistence)│  │(AI brain) │  │(PDF parsing)│
            └────────────┘  └───────────┘  └─────────────┘
```

### 3.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      apps/iskra-web                         │
│                    (SparkFlow React App)                    │
├─────────────────────────────────────────────────────────────┤
│  pages/          │  components/      │  services/           │
│  - Dashboard     │  - FloorPlanEditor│  - geminiService    │
│  - FloorPlan    │  - PanelEditor    │  - dxfService       │
│  - PanelSchedule│  - LoadAnalyzer   │  - pdfService       │
│  - Reports      │  - SpecTable      │  - exportService    │
│  - AITools      │  - CableJournal   │                      │
├─────────────────────────────────────────────────────────────┤
│                      packages/                               │
├─────────────────┬──────────────────┬─────────────────────────┤
│   @iskra/core   │   @iskra/math    │    @iskra/engine       │
│   (Types, const)│   (Pure funcs)   │    (State, IO)         │
│   - types.ts    │  - electrical   │    - ProjectContext   │
│   - constants   │    Formulas.ts  │    - storageService   │
│   - manifests   │  - materialCalc  │    - calculationEngine│
│   - schemas     │  - validators   │    - eventBus         │
└─────────────────┴──────────────────┴─────────────────────────┘
```

### 3.3 Component Boundaries

| Компонент | Ответственность | Public API | Dependencies |
|-----------|-----------------|------------|--------------|
| FloorPlanEditor | Canvas, drag-drop, undo/redo | `<FloorPlanEditor />` | useProject, calculateVoltageDrop |
| PanelEditor | Редактирование щита, модули | `<PanelEditor />` | useProject, calculateShortCircuit |
| LoadAnalyzer | Ввод нагрузок, AI-анализ | `<LoadAnalyzer />` | geminiService, useProject |
| ReportsPage | Генерация PDF, спецификация | `<ReportsPage />` | dxfService, materialCalculator |
| geminiService | AI вызовы (Gemini API) | `analyzeLoads()`, `selectComponent()` | GoogleGenAI client |
| materialCalculator | Расчёт спецификации | `calculateMaterials()` | pure functions |
| dxfService | Генерация DXF | `generateDXF()` | - |

### 3.4 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interactions                         │
│  (Click, Drag, Input, Keyboard)                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ProjectContext (Store)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐  │
│  │ loads[]     │ │elements[]   │ │cableRuns[]  │ │panelConfig│  │
│  │ walls[]     │ │specification│ │metadata     │ │settings   │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│  Derived State  │ │  Computed       │ │  Triggers               │
│  (useMemo)      │ │  Values         │ │  (side effects)         │
│  - totalPower   │ │  - voltageDrop  │ │  - localStorage save    │
│  - designCurrent│ │  - cableLength  │ │  - validation          │
│  - groupedLoads │ │  - prices       │ │  - analytics events    │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Calculations                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐ │
│  │ electricalFormulas│ │ materialCalculator│ │ calculationEngine │ │
│  │ - voltageDrop   │ │ - BOM generation │ │ - demand factors    │ │
│  │ - shortCircuit  │ │ - pricing       │ │ - phase balance     │ │
│  │ - derating      │ │ - labor calc    │ │ - compliance check  │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Export / Output                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ PDF (jsPDF) │ │ DXF Export  │ │ JSON Export │ │Print View │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 State Management

```typescript
// Store Structure (ProjectContext)
interface ProjectState {
  // Metadata
  projectName: string;
  metadata: ProjectMetadata;
  
  // Domain
  loads: LoadItem[];
  floorPlanElements: PlanElement[];
  walls: Wall[];
  cableRuns: CableRun[];
  panelConfig: PanelConfig;
  
  // Output
  specification: SpecificationItem[];
  
  // Assets
  floorPlanBackgroundImage: string | null;
  roomDimensions: RoomDimensions;
}
```

**State Updates Pattern:**
```typescript
// All updates go through actions
const updateLoad = (id: string, updates: Partial<LoadItem>) => {
  setLoads(prev => prev.map(l => l.id === id ? {...l, ...updates} : l));
  // Auto-triggers:
  // 1. localStorage sync (debounced 500ms)
  // 2. Recalculate derived values
  // 3. Run validation
};
```

### 3.6 Key Technical Decisions

| Решение | Rationale | Trade-off |
|---------|-----------|-----------|
| React 19 + Vite | Modern, fast dev server, HMR | SSR complexity (not needed for MVP) |
| TypeScript strict | Type safety для электрических расчётов | Strict mode overhead |
| Context for state | Simple enough для MVP | Performance at scale (mitigate with useMemo) |
| localStorage persistence | Quick MVP без backend | Storage limits (~5MB), no sync |
| Gemini API for AI | Best cost/quality ratio для текста | API costs, dependency |
| SVG for canvas | Lightweight, scalable, exportable | Performance with 1000+ elements |
| Tailwind CSS | Rapid development, consistent design | Bundle size (use purge) |

### 3.7 Infrastructure Decisions

| Component | Technology | Justification |
|-----------|------------|---------------|
| Hosting | Vercel / Netlify | Zero-config, CDN, auto-ssl |
| CI/CD | GitHub Actions | Native integration, free for open |
| Analytics | Plausible / Simple | Privacy-focused, lightweight |
| Error tracking | Sentry | Free tier, React integration |

---

## 4. Feature Specification

### 4.1 Core Features

#### F1: Управление нагрузками (Load Management)

**Description:** CRUD операции с электрическими нагрузками

**User Stories:**
- Как пользователь, я хочу добавить нагрузку с названием, мощностью и количеством
- Как пользователь, я хочу редактировать существующие нагрузки
- Как пользователь, я хочу удалить нагрузку
- Как пользователь, я хочу импортировать нагрузки из текстового описания (AI)

**Acceptance Criteria:**
- [ ] Форма добавления с валидацией (мощность > 0, название обязательно)
- [ ] Список нагрузок с сортировкой по категории
- [ ] AI-импорт распознаёт минимум: розетки, свет, плита, холодильник, стиральная машина
- [ ]Undo/Redo для всех операций

**Implementation:**
```typescript
interface LoadItem {
  id: string;
  name: string;
  power: number; // kW
  count: number;
  category: 'lighting' | 'socket' | 'heavy' | 'hvac';
  phase?: 'L1' | 'L2' | 'L3' | 'ABC';
}

// Default loads for new project
const defaultLoads: LoadItem[] = [
  { id: '1', name: 'Освещение (LED)', power: 0.15, count: 10, category: 'lighting' },
  { id: '2', name: 'Розетки (Общие)', power: 0.3, count: 8, category: 'socket' },
  { id: '3', name: 'Стиральная машина', power: 2.2, count: 1, category: 'heavy' },
];
```

---

#### F2: Анализ нагрузок (Load Analysis)

**Description:** Автоматический расчёт электрических параметров по СП 31-110-2003

**Calculations:**

| Parameter | Formula | Norm Reference |
|-----------|---------|----------------|
| Установленная мощность (Pi) | Σ(P × n) для всех нагрузок | СП 31-110, п. 6.1 |
| Расчётная мощность (Pp) | Pi × Kc (коэффициент спроса) | СП 31-110, табл. 6.1 |
| Расчётный ток (Ip) | Pp × 1000 / (U × cos φ) | СП 31-110, п. 8.2 |
| cos φ по умолчанию | 0.9 для бытовых | СП 31-110, п. 8.1 |

**Demand Factors (Kc) by Category:**

| Category | Kc (СП 31-110) | Notes |
|----------|----------------|-------|
| Освещение | 0.75-0.9 | Зависит от количества |
| Розетки | 0.7-0.8 | 5-10 розеток |
| Силовое (пылесос) | 0.5 | - |
| Силовое (печь) | 0.35 | Эл. плита |
| Стиральная машина | 0.6 | - |
| Кондиционер | 0.7 | - |

**Acceptance Criteria:**
- [ ] Расчёт Pi (установленная мощность)
- [ ] Расчёт Pp (расчётная мощность) с выбором Kc
- [ ] Расчёт Ip (расчётный ток)
- [ ] Рекомендации по сечению кабеля (VVGng-LS)
- [ ] Рекомендации по автоматам (B/C тип)
- [ ] Соответствие СП 31-110 (валидация)

---

#### F3: Визуальный редактор плана (Floor Plan Editor)

**Description:** Интерактивный canvas для размещения электрических элементов

**Canvas Specifications:**
- Размер: 100×100 (проценты от ширины/высоты комнаты)
- Coordinate system: Top-left = (0,0), Bottom-right = (100,100)
- Z-index: Walls (1) → Elements (10) → Cables (5) → Labels (20)

**Element Types:**

| Type | Icon | Default Height | Default Power | Color |
|------|------|----------------|---------------|-------|
| socket | Zap | 30cm | 3.5 kW | #2563EB |
| switch | ToggleLeft | 90cm | 0.1 kW | #16a34a |
| light | Lightbulb | 270cm | 0.1 kW | #f59e0b |
| db | Box | 180cm | - | #dc2626 |
| appliance | Monitor | 30cm | по факту | #475569 |
| door | Door | 0 | - | #d97706 |
| window | Window | 0 | - | #3b82f6 |

**Interaction Modes:**

| Mode | Cursor | Action |
|------|--------|--------|
| move | pointer | Drag elements, select |
| wire | crosshair | Draw cables between elements |
| pan | grab | Pan canvas |
| wall | line | Draw walls |
| eraser | not-allowed | Delete elements/walls |
| ruler | ruler | Measure distance |

**3D Cable Calculation:**
```
Length = Horizontal + Vertical Drop 1 + Vertical Drop 2

Horizontal = 
  - Orthogonal: |x1-x2| + |y1-y2| (Manhattan)
  - Direct: √((x1-x2)² + (y1-y2)²)

Vertical Drop 1 = max(0, CeilingHeight - mountingHeight1)
Vertical Drop 2 = max(0, CeilingHeight - mountingHeight2)
```

**Acceptance Criteria:**
- [ ] Drag&Drop всех элементов
- [ ] Рисование стен (line, snap to grid)
- [ ] Прокладка кабелей (click-click)
- [ ] 3D-расчёт длины в метрах
- [ ] Undo/Redo (30 шагов)
- [ ] AI-генерация плана из описания
- [ ] Layers toggle (стены, элементы, кабели, подписи)
- [ ] Zoom/Pan

---

#### F4: Редактор щита (Panel Schedule Editor)

**Description:** Визуальное проектирование распределительного щита

**Module Types:**

| Type | Width (modules) | Example |
|------|-----------------|---------|
| breaker_1p | 1 | Автомат 1P 16A |
| breaker_2p | 2 | Автомат 2P 25A |
| breaker_3p | 3 | Автомат 3P 32A |
| rcd | 2 | УЗО 40A 30mA |
| diff | 1 или 2 | Дифавтомат 1P или 2P |
| switch_3p | 3 | Рубильник 3P |
| meter | 4 | Счётчик |
| relay | 1 | Реле напряжения |

**Busbar Types:**
- comb_3p: Комбинированная шина (L1+L2+L3)
- L1: Фаза L1
- L2: Фаза L2
- L3: Фаза L3

**Default Panel Layout:**
```
┌─────────────────────────────────────────┐
│  Row 1: Input + Protection              │
│  [Input] [UZO] [Diff] [Diff]           │
├─────────────────────────────────────────┤
│  Row 2: Lighting                        │
│  [1P] [1P] [1P] [1P] [1P]              │
├─────────────────────────────────────────┤
│  Row 3: Power                            │
│  [1P] [1P] [1P] [2P] [2P]              │
└─────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Drag&Drop модулей в щит
- [ ] Автоматический подсчёт ширины
- [ ] Связь с группами на плане (circuitId)
- [ ] Валидация: не более N модулей в ряду
- [ ] AI-генерация схемы щита

---

#### F5: Генерация документации

**Outputs:**

| Document | Format | Content |
|----------|--------|---------|
| Однолинейная схема | SVG/PDF | Щит, групповые линии |
| Спецификация | PDF/Excel | Материалы, количества, цены |
| Кабельный журнал | PDF | Маршруты, длины, сечения |
| Паспорт щита | PDF | Модули, номиналы |
| Штамп | PDF | ГОСТ Р 21.1101-2013 |

**Specification Categories:**

```
Equipment:     Щит распределительный, DIN-рейка
Cable:         Кабель ВВГнг-LS 3x2.5, 3x1.5
Wiring:        Розетка, Выключатель, Подрозетник
Protection:   Автомат ВА47-29, УЗО ВД1-63
Consumables:   Дюбель-хомут, Гофра, Клеммники
Services:      Штробление, Укладка кабеля, Монтаж
```

**Pricing Tiers:**

| Tier | Brands | Markup |
|------|--------|--------|
| Budget | IEK/EKF | 1.0x |
| Standard | Schneider Electric | 1.5x |
| Premium | ABB/Legrand | 2.5x |

---

#### F6: AI Features

**AI Services:**

| Service | Input | Output | Model |
|----------|-------|--------|-------|
| analyzeLoads | LoadItem[] | AnalysisResult | gemini-2.5-flash |
| parseLoadsFromText | text description | LoadItem[] | gemini-2.5-flash |
| selectComponent | ComponentRequest | ComponentResult | gemini-2.5-flash |
| checkCompliance | project description | compliance report | gemini-2.5-flash |
| generateRoomLayout | RoomLayoutRequest | LayoutGenerationResult | gemini-2.5-flash |
| generatePanelLayout | loads description | PanelConfig | gemini-2.5-flash |
| auditProjectSpecification | SpecificationItem[] | ProjectAuditResult | gemini-2.5-flash |
| recognizePlanFromImage | base64 image | {walls, elements} | gemini-2.5-flash |

**AI Error Handling:**

| Error | User Message | Fallback |
|-------|--------------|----------|
| API timeout | "Временная ошибка. Попробуйте ещё раз" | Manual input |
| Invalid JSON | "Не удалось обработать ответ. Попробуйте ещё раз" | Retry with adjusted prompt |
| Rate limit | "Слишком много запросов. Подождите..." | Queue requests |
| Invalid API key | "Проверьте API ключ в настройках" | Show settings |

---

### 4.2 User Flows

#### Flow 1: Создание проекта с нуля

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Dashboard → "Новый проект"                               │
│    └─> Ввод: projectName, clientName, projectAddress        │
├─────────────────────────────────────────────────────────────┤
│ 2. AI-Инструменты → Анализ нагрузок                         │
│    ├─> Вариант A: Ручной ввод (таблица)                     │
│    └─> Вариант B: AI-импорт ("Кухня: плита, холодильник...")│
├─────────────────────────────────────────────────────────────┤
│ 3. AI-анализ → "Рассчитать нагрузки"                         │
│    └─> Output: Pi, Pp, Ip, рекомендации по группам           │
├─────────────────────────────────────────────────────────────┤
│ 4. Поэтажный план                                            │
│    ├─> Вариант A: Ручная расстановка (drag&drop)           │
│    └─> Вариант B: AI-генерация ("Спальня 20м2")            │
├─────────────────────────────────────────────────────────────┤
│ 5. Щит → "Создать из плана"                                  │
│    └─> Auto: модули по группам с плана                      │
├─────────────────────────────────────────────────────────────┤
│ 6. Отчёты                                                    │
│    └─> Generate: схема, спецификация, журнал                │
├─────────────────────────────────────────────────────────────┤
│ 7. Экспорт                                                   │
│    └─> Download: PDF / JSON / DXF                           │
└─────────────────────────────────────────────────────────────┘

Total time: ~25 min (MVP target: 30 min)
```

#### Flow 2: Импорт существующего плана

```
1. Поэтажный план → "Импорт PDF"
2. Выбор файла (PDF/JPG/PNG)
3. AI анализ → {walls[], elements[], width, length}
4. Пользователь корректирует (добавить/удалить/переместить)
5. Продолжает с Flow 1, п.4
```

#### Flow 3: Корректировка существующего проекта

```
1. Dashboard → Выбрать проект из списка (localStorage)
2. Загружается всё состояние
3. Редактирование любого раздела
4. Auto-save в localStorage
5. Export
```

### 4.3 Edge Cases

| Case | Detection | Handling | User Message |
|------|-----------|----------|--------------|
| AI недоступен | Network error / API timeout | Fallback to manual | "AI временно недоступен. Введите данные вручную." |
| PDF не распознался | Low confidence < 50% | Ask user to re-upload | "Изображение нечёткое. Загрузите более качественное." |
| Превышена мощность | Ip > 63A (однофазный ввод) | Warn + 3-phase rec | "Превышена мощность однофазного ввода. Рекомендуется 3-фазное питание." |
| Нет места в щите | modules > enclosureSize | Warn + add row | "Щит переполнен. Добавьте второй ряд." |
| localStorage переполнен | QuotaExceededError | Migrate to IndexedDB | "Проект слишком большой. Перенесено в IndexedDB." |
| Отрицательная мощность | validation error | Prevent save | "Мощность должна быть положительной." |
| Неназначенные группы | circuitId = undefined | Warn | "Не все элементы назначены на группы. Назначьте группы." |

---

## 5. UI/UX Specification

### 5.1 Design Principles

1. **Progressive Disclosure** — показывать сложность постепенно
2. **Default to Smart** — AI-вариант по умолчанию, ручной — опционально
3. **Forgiving UX** — отмена любого действия (undo/redo)
4. **Visual Feedback** — индикация расчётов, загрузки, ошибок

### 5.2 Layout Structure

```
┌────────────────────────────────────────────────────────────┐
│  Header (Logo, Project Name, Stage: ЭП/РД, Actions: Save) │
├─────────┬──────────────────────────────────────────────────┤
│         │                                                  │
│ Sidebar │              Main Content                       │
│  (Nav)  │         (Page-specific content)                  │
│         │                                                  │
│ 240px   │              flex-1                              │
│         │                                                  │
└─────────┴──────────────────────────────────────────────────┘
```

**Header Actions:**
- Project dropdown (если несколько)
- Save indicator (auto-save status)
- Export button
- Settings
- Help

**Sidebar Navigation:**
- Dashboard (d)
- AI-Инструменты (a)
- Поэтажный план (p)
- Щит (s)
- Отчёты (r)
- Настройки проекта (,)

### 5.3 Navigation (Sidebar)

| Item | Icon | Hotkey | Description |
|------|------|--------|-------------|
| Dashboard | LayoutDashboard | d | Главная страница |
| AI-Инструменты | Wand2 | a | Анализ, подбор, проверка |
| Поэтажный план | Map | p | Редактор плана |
| Щит | CircuitBoard | s | Редактор щита |
| Отчёты | FileText | r | Спецификация, схемы |
| Настройки | Settings | , | Метаданные проекта |

### 5.4 Visual Design

#### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| primary | #2563EB | Buttons, links, active states |
| primary-hover | #1D4ED8 | Button hover |
| secondary | #475569 | Text, icons |
| accent | #F59E0B | Warnings, highlights |
| background | #F8FAFC | Page background |
| surface | #FFFFFF | Cards, panels |
| surface-elevated | #F1F5F9 | Hover states |
| border | #E2E8F0 | Dividers, outlines |
| error | #EF4444 | Errors, delete actions |
| success | #22C55E | Success states |
| warning | #F59E0B | Warnings |
| info | #3B82F6 | Info states |

#### Dark Mode Colors (Future)

| Token | Value |
|-------|-------|
| background | #0F172A |
| surface | #1E293B |
| text-primary | #F8FAFC |
| text-secondary | #94A3B8 |

#### Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| H1 | Inter | 24px | 700 | 1.2 |
| H2 | Inter | 20px | 600 | 1.3 |
| H3 | Inter | 16px | 600 | 1.4 |
| Body | Inter | 14px | 400 | 1.5 |
| Small | Inter | 12px | 400 | 1.5 |
| Mono | JetBrains Mono | 13px | 400 | 1.4 |

#### Spacing System

| Token | Value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| 2xl | 48px |

#### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| sm | 4px | Inputs, small buttons |
| md | 8px | Cards, panels |
| lg | 12px | Modals, large elements |
| full | 9999px | Pills, avatars |

#### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| sm | 0 1px 2px rgba(0,0,0,0.05) | Subtle |
| md | 0 4px 6px rgba(0,0,0,0.1) | Cards |
| lg | 0 10px 15px rgba(0,0,0,0.1) | Modals |
| xl | 0 20px 25px rgba(0,0,0,0.15) | Dropdowns |

### 5.5 Component States

| Component | States | Behavior |
|-----------|--------|----------|
| Buttons | default, hover, active, disabled, loading | 150ms transition |
| Inputs | default, focus, error, disabled | Focus ring: 2px primary |
| Cards | default, hover, selected | Hover: slight lift shadow |
| Canvas elements | default, selected (blue border), highlighted (cable path) | Selection: dashed border |
| Toggle | off (gray), on (primary) | 200ms slide |
| Dropdown | closed, open, item-hover | Fade + slide 100ms |

### 5.6 Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Sidebar → Bottom nav |
| Tablet | 640-1024px | Collapsible sidebar |
| Desktop | > 1024px | Full sidebar |
| Large | > 1440px | Max-width container 1200px |

### 5.7 Animation Guidelines

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| Micro-interaction | 150ms | ease-out | Hover states |
| Page transition | 200ms | ease-in-out | Route changes |
| Modal | 250ms | cubic-bezier | Open/close |
| Toast | 300ms | ease-out | Notifications |
| Canvas zoom | 100ms | linear | Zoom gestures |

---

## 6. Data Models

### 6.1 Core Entities

```typescript
// Load Management
interface LoadItem {
  id: string;
  name: string;
  power: number; // kW
  count: number;
  category: 'lighting' | 'socket' | 'heavy' | 'hvac';
  phase?: 'L1' | 'L2' | 'L3' | 'ABC';
}

// Floor Plan
interface PlanElement {
  id: string;
  type: 'socket' | 'switch' | 'light' | 'db' | 'appliance' | 'door' | 'window';
  x: number; // 0-100%
  y: number;
  rotation?: number; // 0, 90, 180, 270
  mountingHeight?: number; // cm from floor
  label?: string;
  circuitId?: string; // Group assignment "Gr-1"
  power?: number; // kW
  phase?: 'L1' | 'L2' | 'L3';
  lumens?: number; // For lighting calc
  loadId?: string; // Reference to LoadItem
}

interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number; // pixels
}

interface CableRun {
  id: string;
  fromId: string;
  toId: string;
  type: 'power' | 'light';
  length: number; // meters (calculated 3D)
  points?: {x: number, y: number}[]; // Custom waypoints
}

// Panel
interface PanelModule {
  id: string;
  type: ModuleType;
  name: string;
  rating: string; // "16A", "40A 30mA"
  width: number; // 17.5mm modules count
  color?: string;
}

type ModuleType = 'breaker_1p' | 'breaker_2p' | 'breaker_3p' | 'rcd' | 'diff' | 'switch_3p' | 'meter' | 'relay';

interface PanelRow {
  id: string;
  modules: PanelModule[];
  busType?: BusbarType;
}

type BusbarType = 'comb_3p' | 'L1' | 'L2' | 'L3';

interface PanelConfig {
  rows: PanelRow[];
  enclosureSize: number; // Total modules capacity
}

// Specification
interface SpecificationItem {
  id: string;
  category: 'Equipment' | 'Cable' | 'Wiring' | 'Protection' | 'Consumables' | 'Services';
  name: string;
  model?: string;
  unit: string;
  quantity: number;
  estimatedPrice?: number;
  isAutoGenerated?: boolean;
}

// Room
interface RoomDimensions {
  width: number; // meters
  length: number; // meters
  ceilingHeight: number; // meters
}

// Project
interface ProjectMetadata {
  clientName: string;
  projectAddress: string;
  designerName: string;
  projectDate: string;
  projectStage: 'ЭП' | 'РД';
  projectCode: string;
}
```

### 6.2 Derived Values

```typescript
interface AnalysisResult {
  totalInstalledPower: number; // Pi (kW)
  designPower: number; // Pp (kW)
  designCurrent: number; // Ip (A)
  powerFactor: number; // cos phi
  demandFactor: number; // Kc
  recommendations: string[];
  suggestedGroups: {
    name: string;
    load: number;
    breaker: string;
    cable: string;
  }[];
}

interface ProjectAuditResult {
  score: number; // 0-100
  missingItems: string[];
  optimizations: string[];
  summary: string;
}
```

---

## 7. Technical Roadmap

### Phase 1: MVP (Q2 2026)

**Goal:** Запуск рабочего продукта с базовым функционалом

| Feature | Status | Priority |
|---------|--------|----------|
| Управление нагрузками | In Progress | P0 |
| Визуальный редактор плана | In Progress | P0 |
| Редактор щита | In Progress | P0 |
| Генерация отчётов (PDF) | Todo | P0 |
| AI импорт из текста | Todo | P1 |
| DXF export | Todo | P1 |
| localStorage persistence | Done | P0 |

**Milestone:** 1000 пользователей, 100 проектов/день

### Phase 2: AI Enhancement (Q3 2026)

**Goal:** Полноценный AI-ассистент

| Feature | Status | Priority |
|---------|--------|----------|
| AI распознавание планов (PDF) | Todo | P0 |
| AI автоматическая расстановка | Todo | P0 |
| Compliance checking | Todo | P1 |
| AI аудит спецификации | Todo | P1 |

**Milestone:** 5000 пользователей, 10% AI usage

### Phase 3: Collaboration (Q4 2026)

**Goal:** Командная работа

| Feature | Status | Priority |
|---------|--------|----------|
| Multi-user editing | Todo | P0 |
| Cloud storage | Todo | P0 |
| Version history | Todo | P1 |
| Share links | Todo | P1 |

**Milestone:** 10000 пользователей, 50 daily active projects

### Phase 4: Scale (2027)

**Goal:** Масштабирование

| Feature | Status | Priority |
|---------|--------|----------|
| Mobile responsive | Todo | P1 |
| Offline mode | Todo | P0 |
| Plugin system | Todo | P2 |
| API for integrations | Todo | P2 |

---

## 8. Security

### 8.1 Client-Side Security

| Aspect | Implementation |
|--------|----------------|
| API Keys | Never stored in code, only in env variables |
| localStorage | Encrypted with user-provided key (future) |
| XSS | React sanitizes by default |
| CSRF | Not applicable (stateless API) |

### 8.2 AI Service Security

| Aspect | Implementation |
|--------|----------------|
| Input Sanitization | Strip prompt injection patterns |
| Output Validation | Schema validation for AI responses |
| Rate Limiting | Client-side queue + server-side (future) |
| Cost Control | Monthly budget caps |

---

## 9. Performance

### 9.1 Targets

| Metric | Target | Measurement |
|--------|--------|--------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Bundle Size | < 500KB (gzipped) | Build output |
| API Response (AI) | < 5s | Network tab |
| Canvas FPS | > 30fps | 100 elements |

### 9.2 Optimizations

| Technique | Implementation |
|-----------|----------------|
| Code Splitting | React.lazy for pages |
| Virtualization | react-window for long lists |
| Memoization | useMemo/useCallback for expensive |
| Debounce | localStorage saves (500ms) |
| Image Optimization | Lazy load PDF previews |

---

## 10. Testing Strategy

### 10.1 Test Pyramid

```
        /\
       /  \
      / E2E \     ← 10% (Critical user journeys)
     /--------\
    /Integration\ ← 20% (Component interaction)
   /------------\
  /   Unit Tests \ ← 70% (Pure functions, utils)
 /______________\
```

### 10.2 Coverage Targets

| Layer | Target | Tools |
|-------|--------|-------|
| Unit | 80% functions | Vitest |
| Integration | 50% user flows | Vitest + Testing Library |
| E2E | 5 critical flows | Playwright |

### 10.3 Test Categories

| Category | What to Test | Examples |
|----------|--------------|----------|
| Calculations | electricalFormulas.ts | voltageDrop, shortCircuit |
| Components | FloorPlanEditor | render, interactions |
| Integration | ProjectContext | save/load |
| E2E | Full user flow | Create project, add loads, generate report |

---

## 11. Risks и Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AI API costs exceed revenue | High | Medium | Cache, fallback, pricing tiers |
| PDF parsing fails | Medium | High | User correction UI, multiple passes |
| Performance degrades with scale | Medium | Low | Virtualization, optimization |
| Browser compatibility issues | Low | Low | Test suite, polyfills |
| Data loss (localStorage) | High | Low | IndexedDB migration, export |
| Regulatory changes (norms) | Medium | Low | Versioned calculation engine |

---

## 12. Success Metrics

### 12.1 Product Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Время создания проекта | < 30 мин | - | - |
| Conversion rate | > 5% | - | - |
| NPS | > 40 | - | - |
| Support tickets | < 10/week | - | - |
| DAU/MAU | > 20% | - | - |

### 12.2 Technical Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Uptime | > 99.5% | - | - |
| API latency (p95) | < 2s | - | - |
| Lighthouse score | > 80 | - | - |
| Bundle size | < 500KB | - | - |

---

## 13. Appendices

### A. Нормативные ссылки

1. **СП 31-110-2003** — Проектирование электроустановок жилых зданий
2. **ПУЭ** — Правила устройства электроустановок, 7-е издание
3. **ГОСТ Р 50571.5.52-2011** — Выбор и монтаж кабельно-проводниковой продукции
4. **ГОСТ Р 21.1101-2013** — Основные требования к проектной документации

### B. Технологический стек

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS |
| State | React Context + localStorage |
| AI | Google Gemini API |
| PDF | pdfjs-dist |
| Export | Custom DXF generator |
| Testing | Vitest, React Testing Library, Playwright |
| CI/CD | GitHub Actions |

### C. Конкурентные преимущества

1. **AI-first** — единственное решение с полным AI-циклом
2. **Web-native** — не требует установки, работает везде
3. **Российские нормы** — изначально спроектировано под СП 31-110
4. **Pricing** — дешевле Desktop-решений для малых проектов
5. **3D-расчёт** — уникальная фича для расчёта длины кабелей

### D. Glossary

| Term | Definition |
|------|------------|
| Pi | Установленная мощность (сумма всех нагрузок) |
| Pp | Расчётная мощность (с учётом коэффициента спроса) |
| Ip | Расчётный ток |
| Kc | Коэффициент спроса |
| cos φ | Коэффициент мощности |
| ВВГнг-LS | Кабель с низким дымо- и газовыделением |
| УЗО | Устройство защитного отключения |
| Дифавтомат | Дифференциальный автоматический выключатель |

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-04-19  
**Next Review:** 2026-05-19  
**Owner:** Искра-Кодер vΩ.6