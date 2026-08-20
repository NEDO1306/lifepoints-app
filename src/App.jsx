import { useEffect, useMemo, useState } from 'react'

const defaultTasks = [
  { id: 'legumes', label: 'Hülsenfrüchte essen', points: 4, category: 'Ernährung' },
  { id: 'proteinmeal', label: 'Proteinreiche Mahlzeit', points: 3, category: 'Ernährung' },
  { id: 'omega3', label: 'Omega-3-Quelle', points: 5, category: 'Ernährung' },
  { id: 'smoothie', label: 'Gesunden Smoothie trinken', points: 4, category: 'Ernährung' },
  { id: 'vegmeal', label: 'Gemüsegericht (ohne Kohlenhydrate)', points: 5, category: 'Ernährung' },
  { id: 'steps', label: '10.000 Schritte', points: 6, category: 'Bewegung' },
  { id: 'sport', label: 'Sport / Workout', points: 10, category: 'Bewegung' },
  { id: 'stretch', label: 'Dehnübungen / Mobility', points: 4, category: 'Bewegung' },
  { id: 'breathing', label: 'Atemübung', points: 4, category: 'Achtsamkeit' },
  { id: 'sauna', label: 'Sauna', points: 6, category: 'Achtsamkeit' },
  { id: 'screenfree', label: 'Bildschirmfreie Morgen- oder Abendroutine', points: 5, category: 'Achtsamkeit' },
  { id: 'coldchamber', label: 'Kältekammer', points: 4, category: 'Achtsamkeit' },
  { id: 'massage', label: 'Massage', points: 4, category: 'Achtsamkeit' },
]

const defaultTarget = 120
const STORAGE_KEY = 'lifepoints-v2'

// Visual identity per category — dark green/turquoise card tone, light accent for
// text/confetti, header icon. Purely presentational, not used by any app logic below.
const categoryTheme = {
  Ernährung: { card: '#4A735E', light: '#B9E3C4', icon: 'ti-apple' },
  Bewegung: { card: '#0E4F52', light: '#8FD9DB', icon: 'ti-run' },
  Achtsamkeit: { card: '#14425A', light: '#9CC7DE', icon: 'ti-moon' },
}

// Task-specific icon per item, distinct from the category header icon.
const taskIcons = {
  legumes: 'ti-seedling',
  proteinmeal: 'ti-meat',
  omega3: 'ti-fish',
  smoothie: 'ti-glass',
  vegmeal: 'ti-salad',
  steps: 'ti-walk',
  sport: 'ti-barbell',
  stretch: 'ti-yoga',
  breathing: 'ti-wind',
  sauna: 'ti-flame',
  screenfree: 'ti-device-mobile-off',
  coldchamber: 'ti-snowflake',
  massage: 'ti-hand-stop',
}

const HEADER_BG = '#91AB98'
const HEADER_INK = '#173725'
const HEADER_SUB = '#3F6B54'
const DARK_ACCENT_BG = '#1F4237'
const CONFETTI_PALETTE = ['#FFD166', '#06D6A0', '#EF476F', '#118AB2', '#8338EC']

function formatLocalDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA').format(date)
}

function startOfWeek(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function endOfWeek(date = new Date()) {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

function getTodayKey(date = new Date()) {
  return formatLocalDateKey(date)
}

function getWeekKey(date = new Date()) {
  return formatLocalDateKey(startOfWeek(date))
}

function formatShort(date) {
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function formatWeekRangeFromKey(weekKey) {
  const start = new Date(`${weekKey}T00:00:00`)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    from: formatShort(start),
    to: formatShort(end),
  }
}

function createEmptyCounts() {
  return {}
}

function getTaskPointsFromCounts(counts) {
  return defaultTasks.reduce((sum, task) => sum + (counts[task.id] || 0) * task.points, 0)
}

function normalizeArchiveItem(item) {
  return {
    id: item?.id || '',
    from: item?.from || '',
    to: item?.to || '',
    points: typeof item?.points === 'number' ? item.points : 0,
    goalReached: Boolean(item?.goalReached),
  }
}

function finalizePreviousWeek({ oldWeekKey, oldCountsWeek, weeklyGoal, oldArchive }) {
  const alreadyArchived = oldArchive.some((item) => item.id === oldWeekKey)
  if (alreadyArchived) return oldArchive

  const previousWeekPoints = getTaskPointsFromCounts(oldCountsWeek)
  const range = formatWeekRangeFromKey(oldWeekKey)

  return [
    {
      id: oldWeekKey,
      from: range.from,
      to: range.to,
      points: previousWeekPoints,
      goalReached: previousWeekPoints >= weeklyGoal,
    },
    ...oldArchive,
  ]
}

// Small one-shot confetti burst, purely decorative reward feedback on tap.
function ConfettiBurst({ colors }) {
  const pieces = useMemo(() => {
    const count = 16
    return Array.from({ length: count }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.5 - 0.25)
      const distance = 24 + Math.random() * 28
      const tx = Math.cos(angle) * distance
      const ty = Math.sin(angle) * distance - 6
      const rot = Math.random() * 360
      const color = colors[i % colors.length]
      const delay = Math.random() * 50
      const size = 5 + Math.random() * 4
      const isSquare = Math.random() > 0.5
      return { id: i, tx, ty, rot, color, delay, size, isSquare }
    })
  }, [colors])

  return (
    <span className="pointer-events-none absolute inset-0 z-10">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
            '--rot': `${p.rot}deg`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.isSquare ? '2px' : '999px',
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </span>
  )
}

export default function App() {
  const [countsToday, setCountsToday] = useState(createEmptyCounts)
  const [countsWeek, setCountsWeek] = useState(createEmptyCounts)
  const [countsTotal, setCountsTotal] = useState(createEmptyCounts)
  const [weekArchive, setWeekArchive] = useState([])
  const [weeklyGoal] = useState(defaultTarget)
  const [todayKey, setTodayKey] = useState(getTodayKey())
  const [weekKey, setWeekKey] = useState(getWeekKey())
  const [showCongrats, setShowCongrats] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [weekResultNotice, setWeekResultNotice] = useState(null)
  const [confettiBursts, setConfettiBursts] = useState({})

  useEffect(() => {
    const currentTodayKey = getTodayKey()
    const currentWeekKey = getWeekKey()
    let saved = null

    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    } catch {
      saved = null
    }

    let nextCountsToday = {}
    let nextCountsWeek = {}
    let nextCountsTotal = {}
    let nextArchive = []
    let nextWeekNotice = null

    if (saved) {
      nextCountsTotal = saved.countsTotal || {}
      nextArchive = Array.isArray(saved.weekArchive) ? saved.weekArchive.map(normalizeArchiveItem) : []

      if (saved.todayKey === currentTodayKey) {
        nextCountsToday = saved.countsToday || {}
      }

      if (saved.weekKey === currentWeekKey) {
        nextCountsWeek = saved.countsWeek || {}
      } else if (saved.weekKey && saved.countsWeek) {
        nextArchive = finalizePreviousWeek({
          oldWeekKey: saved.weekKey,
          oldCountsWeek: saved.countsWeek || {},
          weeklyGoal,
          oldArchive: nextArchive,
        })

        const previousWeekPoints = getTaskPointsFromCounts(saved.countsWeek || {})
        nextWeekNotice = {
          weekKey: saved.weekKey,
          points: previousWeekPoints,
          goalReached: previousWeekPoints >= weeklyGoal,
        }
      }

      if (saved.lastWeekResultShownFor === currentWeekKey) {
        nextWeekNotice = null
      }
    }

    setCountsToday(nextCountsToday)
    setCountsWeek(nextCountsWeek)
    setCountsTotal(nextCountsTotal)
    setWeekArchive(nextArchive)
    setTodayKey(currentTodayKey)
    setWeekKey(currentWeekKey)
    setWeekResultNotice(nextWeekNotice)
    setHydrated(true)
  }, [weeklyGoal])

  useEffect(() => {
    if (!hydrated) return

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        todayKey,
        weekKey,
        countsToday,
        countsWeek,
        countsTotal,
        weekArchive,
        lastWeekResultShownFor: weekResultNotice ? null : weekKey,
      })
    )
  }, [hydrated, todayKey, weekKey, countsToday, countsWeek, countsTotal, weekArchive, weekResultNotice])

  useEffect(() => {
    if (!hydrated) return

    const timer = setInterval(() => {
      const now = new Date()
      const newTodayKey = getTodayKey(now)
      const newWeekKey = getWeekKey(now)

      if (newTodayKey !== todayKey) {
        setTodayKey(newTodayKey)
        setCountsToday({})
      }

      if (newWeekKey !== weekKey) {
        const previousWeekPoints = getTaskPointsFromCounts(countsWeek)
        const nextArchive = finalizePreviousWeek({
          oldWeekKey: weekKey,
          oldCountsWeek: countsWeek,
          weeklyGoal,
          oldArchive: weekArchive,
        })

        setWeekArchive(nextArchive)
        setWeekKey(newWeekKey)
        setCountsWeek({})
        setWeekResultNotice({
          weekKey,
          points: previousWeekPoints,
          goalReached: previousWeekPoints >= weeklyGoal,
        })
      }
    }, 60000)

    return () => clearInterval(timer)
  }, [hydrated, todayKey, weekKey, countsWeek, weekArchive, weeklyGoal])

  const todayDate = new Date()
  const currentEnd = endOfWeek(todayDate)
  const daysUntilReset = Math.max(0, Math.ceil((currentEnd - todayDate) / 86400000))

  const groupedTasks = useMemo(
    () =>
      defaultTasks.reduce((acc, task) => {
        if (!acc[task.category]) acc[task.category] = []
        acc[task.category].push(task)
        return acc
      }, {}),
    []
  )

  const todayPoints = useMemo(
    () => defaultTasks.reduce((sum, task) => sum + (countsToday[task.id] || 0) * task.points, 0),
    [countsToday]
  )

  const weekPoints = useMemo(
    () => defaultTasks.reduce((sum, task) => sum + (countsWeek[task.id] || 0) * task.points, 0),
    [countsWeek]
  )

  const totalPoints = useMemo(
    () => defaultTasks.reduce((sum, task) => sum + (countsTotal[task.id] || 0) * task.points, 0),
    [countsTotal]
  )

  const categoryPoints = useMemo(() => {
    const out = {}
    for (const task of defaultTasks) out[task.category] = 0
    for (const task of defaultTasks) out[task.category] += (countsWeek[task.id] || 0) * task.points
    return out
  }, [countsWeek])

  const topTasks = useMemo(() => {
    return [...defaultTasks]
      .map((task) => ({ ...task, totalCount: countsTotal[task.id] || 0 }))
      .filter((task) => task.totalCount > 0)
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 5)
  }, [countsTotal])

  const goalReached = weekPoints >= weeklyGoal && weeklyGoal > 0
  const weekEnded = daysUntilReset === 0

  useEffect(() => {
    if (goalReached) {
      setShowCongrats(true)
      const timer = setTimeout(() => setShowCongrats(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [goalReached])

  const addPoints = (taskId) => {
    setCountsToday((prev) => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }))
    setCountsWeek((prev) => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }))
    setCountsTotal((prev) => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }))

    // Short haptic pulse as tactile reward feedback (silently no-ops where unsupported, e.g. iOS Safari).
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(25)
    }

    // Trigger a short confetti burst on this task's row as reward feedback.
    const burstId = Date.now() + Math.random()
    setConfettiBursts((prev) => ({ ...prev, [taskId]: burstId }))
    setTimeout(() => {
      setConfettiBursts((prev) => {
        if (prev[taskId] !== burstId) return prev
        const next = { ...prev }
        delete next[taskId]
        return next
      })
    }, 700)
  }

  const undoPoints = (taskId) => {
    setCountsToday((prev) => {
      const c = prev[taskId] || 0
      if (c <= 0) return prev
      return { ...prev, [taskId]: c - 1 }
    })
    setCountsWeek((prev) => {
      const c = prev[taskId] || 0
      if (c <= 0) return prev
      return { ...prev, [taskId]: c - 1 }
    })
    setCountsTotal((prev) => {
      const c = prev[taskId] || 0
      if (c <= 0) return prev
      return { ...prev, [taskId]: c - 1 }
    })
  }

  const dismissWeekNotice = () => {
    const currentWeekForStorage = weekKey
    setWeekResultNotice(null)

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {}
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...saved,
          lastWeekResultShownFor: currentWeekForStorage,
        })
      )
    } catch {
      // nothing
    }
  }

  const weekProgressPct = weeklyGoal > 0 ? Math.min((weekPoints / weeklyGoal) * 100, 100) : 0

  return (
    <div
      className="min-h-screen text-[#151A17] px-4 py-6"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundImage: 'linear-gradient(180deg, #B8CAB7 0%, #A6B9A4 100%)' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');
        .font-display { font-family: 'Manrope', system-ui, sans-serif; letter-spacing: -0.01em; }

        @keyframes confetti-pop {
          0% { transform: translate(0, 0) scale(0.6) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1) rotate(var(--rot)); opacity: 0; }
        }
        .confetti-piece {
          position: absolute;
          top: 50%;
          left: 44px;
          animation: confetti-pop 650ms cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
          pointer-events: none;
        }
      `}</style>

      <div className="mx-auto max-w-md space-y-5">
        {/* Header */}
        <header
          className="relative overflow-hidden rounded-[32px] p-6 shadow-[0_10px_30px_rgba(30,60,45,0.14)]"
          style={{ background: HEADER_BG, color: HEADER_INK }}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold" style={{ color: HEADER_SUB }}>
            Dein Fortschritt
          </p>
          <h1 className="font-display text-[30px] leading-none font-bold mt-1">LifePoints 🌿</h1>

          <div className="mt-5">
            <div className="rounded-2xl p-4" style={{ background: '#87A28F' }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-semibold" style={{ color: HEADER_SUB }}>Wochenziel</span>
                  <div className="font-display text-3xl font-bold mt-0.5 leading-none">
                    {weekPoints} <span className="text-lg font-semibold" style={{ color: HEADER_SUB }}>/ {weeklyGoal}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px]" style={{ color: HEADER_SUB }}>noch {daysUntilReset} Tage</p>
                  <p className="text-xs" style={{ color: HEADER_SUB }}>{Math.max(weeklyGoal - weekPoints, 0)} bis zum Ziel</p>
                </div>
              </div>

              <div
                className="relative h-3 rounded-full overflow-hidden border"
                style={{
                  backgroundColor: 'rgba(23,55,37,0.12)',
                  borderColor: 'rgba(23,55,37,0.35)',
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${weekProgressPct}%`, backgroundColor: HEADER_SUB }}
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: HEADER_SUB }}>
              <i className="ti ti-sparkles" style={{ fontSize: 13 }} aria-hidden="true"></i>
              <span>
                Punkte heute: <span className="font-semibold" style={{ color: HEADER_INK }}>{todayPoints}</span>
              </span>
            </div>

            {goalReached && (
              <p className="mt-2 text-xs font-semibold" style={{ color: '#1B4332' }}>
                {weekEnded ? 'Woche abgeschlossen – Ziel erreicht!' : 'Geschafft! 🎉'}
              </p>
            )}
            {!goalReached && weekEnded && (
              <p className="mt-2 text-xs font-semibold" style={{ color: '#8A3B1F' }}>Woche abgeschlossen – Ziel leider nicht erreicht.</p>
            )}
            {showCongrats && <p className="mt-2 text-xs animate-pulse" style={{ color: '#1B4332' }}>🎊 Ziel erreicht!</p>}
          </div>
        </header>

        {/* Week result notice */}
        {weekResultNotice && (
          <section
            className="rounded-[28px] p-5"
            style={{
              background: weekResultNotice.goalReached ? '#1B4030' : '#4A2A1E',
              color: '#F2F7F4',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-1" style={{ color: '#B9CBC0' }}>
                  Wochenabschluss
                </h2>
                <p className="text-sm leading-6 opacity-90">
                  {weekResultNotice.goalReached
                    ? `Hurra, du hast die Punktzahl diese Woche erreicht. Du hast ${weekResultNotice.points} Punkte gesammelt.`
                    : `Diese Woche wurde das Ziel leider nicht erreicht. Du hast ${weekResultNotice.points} von ${weeklyGoal} Punkten gesammelt.`}
                </p>
              </div>

              <button
                onClick={dismissWeekNotice}
                className="shrink-0 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-medium
                  transition-all duration-150 ease-out hover:-translate-y-0.5 active:scale-90"
                style={{ color: '#F2F7F4' }}
              >
                OK
              </button>
            </div>
          </section>
        )}

        {/* Category sections — each a dark green/turquoise card */}
        {Object.entries(groupedTasks).map(([category, tasks]) => {
          const theme = categoryTheme[category] || { card: '#1B4332', light: '#A9D8B4', icon: 'ti-list' }

          return (
            <section
              key={category}
              className="rounded-[32px] p-4 shadow-[0_16px_40px_rgba(16,40,30,0.28)]"
              style={{ background: theme.card, color: '#F2F7F4' }}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/12">
                    <i className={`ti ${theme.icon}`} style={{ fontSize: 16, color: theme.light }} aria-hidden="true"></i>
                  </span>
                  <h2 className="text-[15px] font-bold">{category}</h2>
                </div>
                <span className="font-display text-lg font-bold" style={{ color: theme.light }}>
                  {categoryPoints[category] || 0}
                </span>
              </div>

              <div className="space-y-2.5">
                {tasks.map((task) => {
                  const todayCount = countsToday[task.id] || 0
                  const weekCount = countsWeek[task.id] || 0
                  const totalCount = countsTotal[task.id] || 0
                  const hasAny = todayCount > 0 || weekCount > 0 || totalCount > 0

                  return (
                    <button
                      key={task.id}
                      onClick={() => addPoints(task.id)}
                      className="relative flex w-full items-center gap-3 rounded-3xl bg-white/[0.08] p-3 text-left
                        transition-all duration-150 ease-out
                        hover:-translate-y-0.5 hover:bg-white/[0.12]
                        active:translate-y-0 active:scale-[0.98]"
                    >
                      {confettiBursts[task.id] && (
                        <ConfettiBurst key={confettiBursts[task.id]} colors={[theme.light, ...CONFETTI_PALETTE]} />
                      )}

                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                        style={{ background: theme.card }}
                      >
                        <i className={`ti ${taskIcons[task.id] || theme.icon}`} style={{ fontSize: 22, color: '#F2F7F4' }} aria-hidden="true"></i>
                      </span>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[14px] font-semibold leading-tight truncate">{task.label}</h3>
                        <p className="text-[10px] mt-0.5" style={{ color: '#C4D6CB' }}>
                          Heute {todayCount} · Woche {weekCount} · Gesamt {totalCount}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className="rounded-full bg-white text-xs font-bold px-2.5 py-1"
                          style={{ color: theme.card }}
                        >
                          +{task.points}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            undoPoints(task.id)
                          }}
                          disabled={!hasAny}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 border border-white/15
                            transition-all duration-150 ease-out hover:bg-white/20 active:scale-90
                            disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                          <i className="ti ti-arrow-back-up" style={{ fontSize: 12, color: '#F2F7F4' }} aria-hidden="true"></i>
                        </button>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* Gesamtbilanz */}
        <section
          className="rounded-[28px] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.3)]"
          style={{ background: DARK_ACCENT_BG, color: '#F2F7F4' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: '#AEC4B8' }}>
              <i className="ti ti-chart-bar" style={{ fontSize: 15, marginRight: 6 }} aria-hidden="true"></i>
              Gesamtbilanz
            </p>
            <p className="font-display text-2xl font-bold">{totalPoints}</p>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.12em]" style={{ color: '#7E9C8C' }}>Top 5 am häufigsten</p>
            {topTasks.length > 0 ? (
              topTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-3"
                >
                  <span className="text-sm" style={{ color: '#E4EEE8' }}>
                    {index + 1}. {task.label}
                  </span>
                  <span className="text-sm font-medium" style={{ color: '#AEC4B8' }}>{task.totalCount}x</span>
                </div>
              ))
            ) : (
              <p className="text-sm" style={{ color: '#7E9C8C' }}>Noch keine Einträge.</p>
            )}
          </div>
        </section>

        {/* Vergangene Wochen */}
        <section
          className="rounded-[28px] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.3)]"
          style={{ background: DARK_ACCENT_BG, color: '#F2F7F4' }}
        >
          <h2 className="font-display text-lg font-bold mb-3">
            <i className="ti ti-calendar-event" style={{ fontSize: 17, marginRight: 6 }} aria-hidden="true"></i>
            Vergangene Wochen
          </h2>

          {weekArchive.length > 0 ? (
            <div className="space-y-2">
              {weekArchive.map((week) => (
                <div
                  key={week.id}
                  className="flex items-center justify-between rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-3 gap-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {week.from} – {week.to}
                    </p>
                    <p className="text-xs" style={{ color: '#AEC4B8' }}>
                      {week.points} / {weeklyGoal} Punkte
                    </p>
                  </div>

                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: week.goalReached ? '#A9E8B4' : '#F2B58A',
                    }}
                  >
                    {week.goalReached ? 'Ziel erreicht' : 'Nicht erreicht'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#7E9C8C' }}>Noch keine abgeschlossenen Wochen.</p>
          )}
        </section>
      </div>
    </div>
  )
}