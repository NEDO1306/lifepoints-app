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
  { id: 'tidy', label: 'Aufräumen', points: 3, category: 'Produktivität' },
  { id: 'clean', label: 'Putzen', points: 3, category: 'Produktivität' },
  { id: 'creative', label: '1h+ Kreativprozess', points: 5, category: 'Produktivität' },
]

const defaultTarget = 120
const STORAGE_KEY = 'lifepoints-v2'

const categoryTints = {
  Ernährung: 'from-emerald-400/12 to-teal-300/6',
  Bewegung: 'from-sky-400/12 to-cyan-300/6',
  Achtsamkeit: 'from-violet-400/12 to-fuchsia-300/6',
  Produktivität: 'from-rose-400/12 to-rose-700/10',
}

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

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-4 py-5">
      <div className="mx-auto max-w-md space-y-4">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/6 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] p-5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/18 via-white/6 to-transparent" />
          <div className="relative">
            <h1 className="text-3xl font-semibold tracking-tight">🌿 LifePoints</h1>
            <p className="text-sm text-white/70 mt-1">
              Heute: <span className="text-emerald-400 font-semibold">{todayPoints} Punkte</span>
            </p>
          </div>

          <div className="relative mt-5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <span className="text-sm text-white/70">Wochenziel</span>
                <div className="text-sm text-white/75 mt-1">
                  {weekPoints} / {weeklyGoal}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/35">noch {daysUntilReset} Tage ...</p>
                <p className="text-xs text-white/50">{Math.max(weeklyGoal - weekPoints, 0)} bis zum Ziel</p>
              </div>
            </div>

            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((weekPoints / weeklyGoal) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, rgba(236,72,153,0.55), rgba(244,114,182,0.95))',
                }}
              />
            </div>

            {goalReached && (
              <div className="mt-2 text-xs text-emerald-400 font-medium">
                {weekEnded ? 'Woche abgeschlossen - Ziel erreicht!' : 'Geschafft! 🎉'}
              </div>
            )}

            {!goalReached && weekEnded && (
              <div className="mt-2 text-xs text-rose-300 font-medium">
                Woche abgeschlossen - Ziel leider nicht erreicht.
              </div>
            )}

            {showCongrats && <div className="mt-3 text-sm text-emerald-300 animate-pulse">🎊 Ziel erreicht!</div>}
          </div>
        </header>

        {weekResultNotice && (
          <section
            className={`rounded-3xl border p-4 backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.28)] ${
              weekResultNotice.goalReached
                ? 'border-emerald-400/30 bg-emerald-400/10'
                : 'border-rose-400/30 bg-rose-400/10'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold mb-1">Wochenabschluss</h2>
                <p className="text-sm text-white/80 leading-6">
                  {weekResultNotice.goalReached
                    ? `Hurra, du hast die Punktzahl diese Woche erreicht. Du hast ${weekResultNotice.points} Punkte gesammelt.`
                    : `Diese Woche wurde das Ziel leider nicht erreicht. Du hast ${weekResultNotice.points} von ${weeklyGoal} Punkten gesammelt.`}
                </p>
              </div>

              <button
                onClick={dismissWeekNotice}
                className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80"
              >
                OK
              </button>
            </div>
          </section>
        )}

        {Object.entries(groupedTasks).map(([category, tasks]) => (
          <section
            key={category}
            className={`relative rounded-3xl border border-white/10 bg-gradient-to-br ${
              categoryTints[category] || 'from-white/8 to-white/4'
            } backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.28)] p-3 overflow-hidden`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent" />
            <h2 className="relative text-[17px] font-medium mb-2 text-white/80 flex items-baseline gap-2">
              <span>{category}</span>
              <span className="text-[20px] font-semibold tracking-tight text-white/6 select-none leading-none">
                {categoryPoints[category] || 0}
              </span>
            </h2>

            <div className="relative space-y-2">
              {tasks.map((task) => {
                const todayCount = countsToday[task.id] || 0
                const weekCount = countsWeek[task.id] || 0
                const totalCount = countsTotal[task.id] || 0

                return (
                  <button
                    key={task.id}
                    onClick={() => addPoints(task.id)}
                    className="relative w-full text-left rounded-2xl border border-white/10 bg-white/6 backdrop-blur-xl shadow-sm px-3 py-2.5 active:scale-[0.99] transition overflow-hidden"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/14 via-white/4 to-transparent" />
                    <div className="pointer-events-none absolute -top-6 right-4 h-16 w-16 rounded-full bg-white/10 blur-xl" />

                    <div className="relative flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[16px] font-medium text-white">{task.label}</h3>
                        <p className="text-[11px] text-white/45 mt-1">
                          Heute {todayCount} · Woche {weekCount} · Gesamt {totalCount}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-emerald-400 font-semibold text-xl leading-none">+{task.points}</p>
                      </div>
                    </div>

                    <div className="relative mt-2 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          undoPoints(task.id)
                        }}
                        disabled={todayCount === 0 && weekCount === 0 && totalCount === 0}
                        className="text-[10px] rounded-full bg-white/8 border border-white/10 px-2 py-1 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ↩︎
                      </button>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.28)] p-5">
          <h2 className="text-lg font-semibold mb-3">📊 Gesamtbilanz</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/65">Insgesamt</p>
            <p className="text-2xl font-bold text-emerald-400">{totalPoints}</p>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm text-white/50">Top 5 am häufigsten:</p>
            {topTasks.length > 0 ? (
              topTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-4 py-3"
                >
                  <span className="text-sm text-white/80">
                    {index + 1}. {task.label}
                  </span>
                  <span className="text-sm font-medium text-white/60">{task.totalCount}x</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/40">Noch keine Einträge.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.28)] p-5">
          <h2 className="text-lg font-semibold mb-3">🗓 Vergangene Wochen</h2>

          {weekArchive.length > 0 ? (
            <div className="space-y-2">
              {weekArchive.map((week) => (
                <div
                  key={week.id}
                  className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-4 py-3 gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white/85">
                      {week.from} – {week.to}
                    </p>
                    <p className="text-xs text-white/45">
                      {week.points} / {weeklyGoal} Punkte
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      week.goalReached
                        ? 'bg-emerald-400/15 text-emerald-300'
                        : 'bg-rose-400/15 text-rose-300'
                    }`}
                  >
                    {week.goalReached ? 'Ziel erreicht' : 'Nicht erreicht'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">Noch keine abgeschlossenen Wochen.</p>
          )}
        </section>
      </div>
    </div>
  )
}