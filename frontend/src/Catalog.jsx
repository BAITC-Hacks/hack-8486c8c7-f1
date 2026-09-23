import React, { useState } from 'react';
import {
  Plus,
  Sparkles,
  ArrowRight,
  Coins,
  Trophy,
  Layers,
  Users,
  Rocket,
  Target,
  Search,
  SlidersHorizontal,
  CircleHelp,
  ArrowUpRight
} from 'lucide-react';

import {
  go,
  TOPICS,
  LEVELS,
  LevelIcon,
  TaskCard,
  spotlight,
  Empty
} from './ui';


function Stat({ icon: C, value, label, color }) {
  return (
    <div className="stat">
      <span className={'stat-icon ' + color}>
        <C size={21} />
      </span>

      <div>
        <b>{value}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}


export default function Catalog({ tasks, apps, teams, role }) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('');
  const [sort, setSort] = useState('score');

  const filtered = tasks
    .filter(
      t =>
        t.published &&
        (!topic || t.topic === topic) &&
        (!level || t.level === level) &&
        (t.title + ' ' + t.company)
          .toLowerCase()
          .includes(query.toLowerCase())
    )
    .sort((a, b) =>
      sort === 'new'
        ? b.id - a.id
        : b.score - a.score || b.id - a.id
    );

  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">ОТ ИДЕИ К РЕШЕНИЮ</div>

          <h1>
            Найдите свой следующий <span>challenge.</span>
          </h1>

          <p>
            Реальные задачи бизнеса. Смелые идеи студентов.
            Общий результат.
          </p>
        </div>

        {role === 'Business' && (
          <button
            className="primary"
            onClick={() => go('new')}
          >
            <Plus size={18} />
            Создать задачу
          </button>
        )}
      </div>

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-tag">
            <Sparkles size={13} />
            ПРОКАЧИВАЙТЕ ИДЕИ
          </span>

          <h2>
            Большие решения
            <br />
            начинаются с ясной задачи.
          </h2>

          <p>
            Sana Bot поможет собрать детали.
            <br />
            Чем полнее задача, тем выше её готовность.
          </p>

          <button
            onClick={() =>
              go(role === 'Business' ? 'new' : 'catalog')
            }
          >
            {role === 'Business'
              ? 'Создать challenge'
              : 'Найти challenge'}

            <ArrowRight size={17} />
          </button>
        </div>

        <div className="evolution-hero">
          <div className="orbit-label">
            <span />
            CHALLENGE EVOLUTION
          </div>

          <div className="evolution-steps">
            {LEVELS.map((l, i) => (
              <React.Fragment key={l}>
                <div className={'evolution-node e-' + i}>
                  <div>
                    <LevelIcon
                      index={i}
                      size={i === 3 ? 32 : 24}
                    />
                  </div>

                  <strong>
                    {l === 'Launch Ready'
                      ? 'Launch'
                      : l === 'Gold Challenge'
                        ? 'Gold'
                        : l}
                  </strong>

                  <small>
                    {['0–39', '40–69', '70–89', '90–100'][i]}
                  </small>
                </div>

                {i < 3 && (
                  <span className="evolution-line" />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="hero-reward">
            <Coins size={16} />
            Sana Coins

            <span>+</span>

            <Trophy size={16} />
            Achievements
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <Stat
          icon={Layers}
          value={tasks.filter(t => t.published).length}
          label="открытых задач"
          color="purple"
        />

        <Stat
          icon={Users}
          value={teams.length}
          label="студенческих команд"
          color="blue"
        />

        <Stat
          icon={Rocket}
          value={
            tasks.filter(
              t => t.published && t.score >= 70
            ).length
          }
          label="готовы к старту"
          color="green"
        />

        <Stat
          icon={Target}
          value={apps.length}
          label="откликов на задачи"
          color="orange"
        />
      </div>

      {tasks.some(
        t => t.published && spotlight(t)
      ) && (
        <section className="spotlight-strip">
          <Sparkles size={19} />

          <strong>Spotlight</strong>

          <span>
            В центре внимания · косметическое продвижение
          </span>

          {tasks
            .filter(t => t.published && spotlight(t))
            .map(t => (
              <button
                key={t.id}
                onClick={() => go('task/' + t.id)}
              >
                {t.title}
                <ArrowUpRight size={14} />
              </button>
            ))}
        </section>
      )}

      <div className="section-heading">
        <h2>
          Открытые задачи{' '}
          <span>
            {tasks.filter(t => t.published).length}
          </span>
        </h2>

        <span className="muted small-text">
          Любой уровень — возможность начать
        </span>
      </div>

      <div className="filters">
        <label className="search">
          <Search size={18} />

          <input
            aria-label="Поиск задач"
            placeholder="Найти задачу или компанию…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </label>

        <select
          aria-label="Тема"
          value={topic}
          onChange={e => setTopic(e.target.value)}
        >
          <option value="">Все направления</option>

          {TOPICS.map(t => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <select
          aria-label="Уровень готовности"
          value={level}
          onChange={e => setLevel(e.target.value)}
        >
          <option value="">Все уровни</option>

          {LEVELS.map(t => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <label className="sort">
          <SlidersHorizontal size={15} />

          <select
            aria-label="Сортировка"
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            <option value="score">По готовности</option>
            <option value="new">Сначала новые</option>
          </select>
        </label>
      </div>

      <div className="cards">
        {filtered.map(t => (
          <TaskCard
            key={t.id}
            task={t}
            count={
              apps.filter(
                a => a.challenge_id === t.id
              ).length
            }
          />
        ))}
      </div>

      {!filtered.length && (
        <Empty
          text="По этим фильтрам задач нет."
          action={() => {
            setTopic('');
            setLevel('');
            setQuery('');
          }}
          actionText="Сбросить фильтры"
        />
      )}

      <div className="catalog-note">
        <CircleHelp size={15} />
        Readiness отражает полноту подтверждённой карточки.
        Задачи с низким рейтингом тоже открыты для откликов.
      </div>
    </>
  );
}