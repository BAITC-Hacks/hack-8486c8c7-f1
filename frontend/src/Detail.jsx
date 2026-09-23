import React from 'react';
import {
  ChevronLeft,
  Bot,
  Rocket,
  ArrowUpRight,
  Sparkles,
  Trophy,
  Coins,
  Check,
  Clock,
  ExternalLink,
  CheckCircle2,
  X,
  Zap
} from 'lucide-react';

import {
  go,
  date,
  spotlight,
  LABELS,
  LEVELS,
  PRIZES,
  STAGES,
  LevelIcon,
  Badge,
  Ring,
  ScoreBreakdown,
  Status
} from './ui';


export function TaskDetail({
  task: t,
  role,
  busy,
  onAnalyze,
  onPublish,
  onApply,
  onBuy,
  apps,
  teams
}) {
  return (
    <>
      <button
        className="back"
        onClick={() => go('catalog')}
      >
        <ChevronLeft size={16} />
        Все задачи
      </button>

      <div className="detail-heading">
        <div>
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <span className="topic-label">
              {t.topic}
            </span>

            <Badge task={t} />

            <span className="muted small-text">
              {t.published
                ? 'Опубликована'
                : 'Черновик · виден бизнесу'}
            </span>
          </div>

          <h1>{t.title}</h1>

          <p>
            {t.company} · {apps.length} откликов ·{' '}
            {date(t.created_at)}
          </p>
        </div>

        <Ring score={t.score} />
      </div>

      <div className="detail-actions">
        {role === 'Business' ? (
          <>
            <button
              className="primary"
              onClick={onAnalyze}
              disabled={busy}
            >
              <Bot size={18} />
              Улучшить с Sana Bot
            </button>

            <button
              className="secondary"
              onClick={() => go('edit/' + t.id)}
            >
              Редактировать карточку
            </button>

            {!t.published && (
              <button
                className="secondary"
                onClick={onPublish}
                disabled={busy || !t.confirmed}
              >
                <Rocket size={17} />
                Опубликовать
              </button>
            )}
          </>
        ) : (
          <button
            className="primary"
            disabled={busy || !t.published}
            onClick={onApply}
          >
            <ArrowUpRight size={18} />
            Откликнуться командой
          </button>
        )}
      </div>

      <div className="detail-grid">
        <div>
          <section className="panel brief-content">
            {Object.entries(LABELS).map(([k, label]) => (
              <div key={k}>
                <h3>{label}</h3>

                <p className={!t.fields[k] ? 'muted' : ''}>
                  {t.fields[k] ||
                    'Пока не уточнено — обсудите с бизнесом.'}
                </p>
              </div>
            ))}
          </section>

          <section className="panel mt-5">
            <div className="section-heading">
              <h2>Challenge Evolution</h2>
              <Sparkles size={19} />
            </div>

            <div className="evolution-timeline">
              {LEVELS.map((level, i) => (
                <div
                  className={
                    i <= t.level_index ? 'reached' : ''
                  }
                  key={level}
                >
                  <span>
                    <LevelIcon index={i} size={22} />
                  </span>

                  <b>{level}</b>

                  <small>
                    {['0–39', '40–69', '70–89', '90–100'][i]}
                  </small>
                </div>
              ))}
            </div>

            <div className="history">
              {t.history.length ? (
                t.history.map((h, i) => (
                  <div key={i}>
                    <span className="history-dot" />

                    <div>
                      <b>
                        {h.score}/100 · {h.level}
                      </b>

                      <small>
                        {h.title} · {date(h.at)}
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">
                  История появится после подтверждения карточки.
                </p>
              )}
            </div>
          </section>

          <section className="panel mt-5">
            <h2 className="mb-5">
              Achievements
            </h2>

            <div className="achievement-row">
              {t.achievements.length ? (
                t.achievements.map(a => (
                  <span key={a}>
                    <Trophy size={16} />
                    {a}
                  </span>
                ))
              ) : (
                <p className="muted">
                  Первые достижения впереди.
                </p>
              )}
            </div>
          </section>

          <section className="panel mt-5">
            <div className="section-heading">
              <h2>
                Отклики · {apps.length}
              </h2>

              {role === 'Business' && (
                <button
                  className="text-button purple-text"
                  onClick={() => go('dashboard')}
                >
                  Управлять
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>

            {apps.map(a => (
              <div
                className="mini-app"
                key={a.id}
              >
                <strong>
                  {
                    teams.find(
                      tm => tm.id === a.team_id
                    )?.name
                  }
                </strong>

                <span>{a.duration}</span>

                <Status status={a.status} />
              </div>
            ))}

            {!apps.length && (
              <p className="muted">
                Здесь появятся идеи студенческих команд.
              </p>
            )}
          </section>
        </div>

        <aside>
          <section className="panel">
            <div className="section-heading">
              <h3>Task Readiness</h3>

              <b className="purple-text">
                {t.score}/100
              </b>
            </div>

            <ScoreBreakdown task={t} />
          </section>

          {(role === 'Business' || role === 'Student') && (
            <section className="panel mt-5 shop-panel">
              <div className="shop-header">
                <div>
                  <h3>Магазин улучшений</h3>
                  <p className="muted small-text">
                    Тратить монеты можно прямо здесь.
                  </p>
                </div>

                <span className="shop-pill">
                  <Coins size={14} />
                  spendable
                </span>
              </div>

              <div className="shop-grid">
                {[
                  ['highlight', 50],
                  ['spotlight', 100],
                  ['aurora', 150]
                ].map(([key, cost]) => {
                  const owned =
                    t.cosmetics.includes(key) ||
                    (
                      key === 'spotlight' &&
                      spotlight(t)
                    );

                  return (
                    <div
                      className="shop-item"
                      key={key}
                    >
                      <div className="shop-item-top">
                        <span className="shop-icon">
                          <Sparkles size={14} />
                        </span>

                        <strong>
                          {PRIZES[key]}
                        </strong>
                      </div>

                      <small>
                        {owned
                          ? 'Уже активировано'
                          : `Купить за ${cost} Coins`}
                      </small>

                      <button
                        className={owned ? 'shop-button owned' : 'shop-button'}
                        disabled={busy || owned}
                        onClick={() => onBuy(key)}
                      >
                        {owned ? (
                          <>
                            <Check size={16} />
                            Куплено
                          </>
                        ) : (
                          <>
                            Купить
                            <Coins size={13} />
                            {cost}
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}


export function Application({
  app: a,
  task,
  team,
  role,
  busy,
  decide,
  progress
}) {
  return (
    <article className="panel application">
      <div className="application-head">
        <span className="avatar">
          {team?.name.slice(0, 2)}
        </span>

        <div>
          <h3>{team?.name}</h3>

          <a href={'#task/' + a.challenge_id}>
            {task?.title || 'Challenge'}
          </a>
        </div>

        <Status status={a.status} />
      </div>

      <div className="application-body">
        <div>
          <h4>Идея решения</h4>
          <p>{a.idea}</p>

          <h4>План</h4>
          <p>{a.plan}</p>
        </div>

        <div className="application-meta">
          <span>
            <Clock size={16} />
            {a.duration}
          </span>

          {a.prototype ? (
            <a
              href={a.prototype}
              target="_blank"
              rel="noreferrer"
            >
              Прототип
              <ExternalLink size={14} />
            </a>
          ) : (
            <span className="muted">
              Прототип пока не приложен
            </span>
          )}

          <div className="tags">
            {team?.skills.map(s => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {a.milestones.length > 0 && (
        <div className="milestones">
          {a.milestones.map(m => (
            <div key={m.stage}>
              <CheckCircle2 size={16} />

              <span>
                <b>
                  {STAGES[m.stage]} · +{m.xp} XP
                </b>

                <small>{m.evidence}</small>
              </span>
            </div>
          ))}
        </div>
      )}

      {role === 'Business' && (
        <div className="application-actions">
          <button
            className="primary"
            disabled={
              busy ||
              a.status === 'selected'
            }
            onClick={() => decide('selected')}
          >
            <Check size={16} />
            Select · Выбрать
          </button>

          <button
            className="secondary"
            disabled={
              busy ||
              a.status === 'rejected'
            }
            onClick={() => decide('rejected')}
          >
            <X size={16} />
            Reject · Отклонить
          </button>

          {a.status === 'selected' && (
            <button
              className="secondary"
              disabled={
                busy ||
                a.milestones.length === 3
              }
              onClick={progress}
            >
              <Zap size={16} />
              Подтвердить этап
            </button>
          )}
        </div>
      )}
    </article>
  );
}