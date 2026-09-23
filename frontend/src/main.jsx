import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import {
  Zap,
  LayoutGrid,
  BriefcaseBusiness,
  Users,
  Coins,
  CheckCircle2,
  LoaderCircle,
  CircleHelp,
  X
} from 'lucide-react';

import {
  go,
  PRIZES,
  Modal,
  Empty
} from './ui';

import Catalog from './Catalog';

import {
  NewTask,
  Editor,
  ProposalForm,
  ProgressForm
} from './forms';

import { TaskDetail } from './Detail';

import {
  Dashboard,
  Teams
} from './Workspace';

import './styles.css';


function App() {
  const [role, setRole] = useState(
    localStorage.getItem('tq-role') || 'Business'
  );

  const [team, setTeam] = useState(
    Number(localStorage.getItem('tq-team') || 1)
  );

  const [route, setRoute] = useState(
    location.hash.slice(1) || 'catalog'
  );

  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null);

  const locked = useRef(false);


  async function api(path, method = 'GET', body) {
    const res = await fetch('/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Role': role
      },
      body: body
        ? JSON.stringify(body)
        : undefined
    });

    let value;

    try {
      value = await res.json();
    } catch {
      throw Error(
        'Сервер недоступен. Проверьте запуск backend.'
      );
    }

    if (!res.ok) {
      throw Error(
        Array.isArray(value.detail)
          ? value.detail
              .map(
                x =>
                  x.loc.slice(1).join('.') +
                  ': ' +
                  x.msg
              )
              .join('; ')
          : value.detail ||
            'Действие не выполнено'
      );
    }

    return value;
  }


  async function refresh() {
    const value = await api('/state');

    setData(value);

    return value;
  }


  async function act(fn) {
    if (locked.current) {
      return;
    }

    locked.current = true;

    setBusy(true);
    setError('');

    try {
      await fn();
    } catch (e) {
      setError(
        e.message ||
        'Ошибка соединения. Проверьте запуск backend.'
      );
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }


  useEffect(() => {
    const handler = () => {
      setRoute(
        location.hash.slice(1) || 'catalog'
      );

      setError('');

      window.scrollTo(0, 0);
    };

    window.addEventListener(
      'hashchange',
      handler
    );

    return () => {
      window.removeEventListener(
        'hashchange',
        handler
      );
    };
  }, []);


  useEffect(() => {
    let active = true;

    setData(null);

    api('/state')
      .then(value => {
        if (active) {
          setData(value);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            'Не удалось загрузить данные. Запустите backend и повторите.'
          );
        }
      });

    localStorage.setItem(
      'tq-role',
      role
    );

    return () => {
      active = false;
    };
  }, [role]);


  useEffect(() => {
    localStorage.setItem(
      'tq-team',
      String(team)
    );
  }, [team]);


  useEffect(() => {
    if (!toast) {
      return;
    }

    const id = setTimeout(
      () => setToast(''),
      5000
    );

    return () => {
      clearTimeout(id);
    };
  }, [toast]);


  const tasks =
    data?.challenges || [];

  const apps =
    data?.applications || [];

  const teams =
    data?.teams || [];

  const wallet =
    data?.wallet || {
      coins: 0,
      xp: 0,
      history: []
    };


  const current = tasks.find(
    t =>
      t.id ===
      Number(route.split('/')[1])
  );


  const selectedTeam = teams.find(
    t => t.id === team
  );


  const nav = [
    [
      'catalog',
      LayoutGrid,
      'Каталог задач'
    ],
    [
      'dashboard',
      BriefcaseBusiness,
      role === 'Business'
        ? 'Мой кабинет'
        : 'Мои отклики'
    ],
    [
      'teams',
      Users,
      'Команды'
    ]
  ];


  const mutate = (
    path,
    body,
    message
  ) =>
    act(async () => {
      await api(
        path,
        'POST',
        body
      );

      await refresh();

      setToast(message);
    });


  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <a
          className="brand"
          href="#catalog"
        >
          <span className="brand-mark">
            <Zap
              size={23}
              fill="currentColor"
            />
          </span>

          <span>
            TaskQuest

            <span className="brand-ai">
              AI
            </span>
          </span>
        </a>


        <div className="workspace-label">
          AI SANA · CHALLENGE HUB
        </div>


        <nav>
          {nav.map(
            ([key, Icon, text]) => (
              <a
                key={key}
                href={'#' + key}
                className={
                  route === key
                    ? 'active'
                    : ''
                }
              >
                <Icon size={19} />

                {text}
              </a>
            )
          )}
        </nav>


        <div className="sidebar-bottom">

          <span className="avatar small">
            {role === 'Business'
              ? 'S'
              : 'C'}
          </span>

          <div>
            <strong>
              {role === 'Business'
                ? 'Sana Studio'
                : selectedTeam?.name}
            </strong>

            <small>
              {role === 'Business'
                ? 'Business workspace'
                : 'Student workspace'}
            </small>
          </div>

          <span className="online-dot" />

        </div>

      </aside>


      {/* MAIN SHELL */}

      <div className="shell">

        {/* TOPBAR */}

        <header className="topbar">

          <div className="breadcrumb">
            Workspace

            <span>/</span>

            <strong>
              {
                route.startsWith('edit')
                  ? 'Конструктор'
                  : route.startsWith('task')
                    ? 'Challenge'
                    : route === 'new'
                      ? 'Новая задача'
                      : nav.find(
                          n => n[0] === route
                        )?.[2] || 'TaskQuest'
              }
            </strong>
          </div>


          <div className="top-actions">

            <div
              className="role-switch"
              aria-label="Демо-роль"
            >
              {[
                'Business',
                'Student'
              ].map(value => (
                <button
                  key={value}
                  disabled={busy}
                  onClick={() => {
                    setRole(value);
                    setModal(null);
                    go('catalog');
                  }}
                  className={
                    role === value
                      ? 'chosen'
                      : ''
                  }
                >
                  {value === 'Business' ? (
                    <BriefcaseBusiness
                      size={14}
                    />
                  ) : (
                    <Users size={14} />
                  )}

                  {value}
                </button>
              ))}
            </div>


            {role === 'Student' && (
              <select
                aria-label="Активная команда"
                value={team}
                onChange={e =>
                  setTeam(
                    Number(e.target.value)
                  )
                }
              >
                {teams.map(t => (
                  <option
                    key={t.id}
                    value={t.id}
                  >
                    {t.name}
                  </option>
                ))}
              </select>
            )}


            <div className="balance">
              <Coins size={17} />

              <b>
                {wallet.coins}
              </b>

              <span>
                Sana Coins
              </span>
            </div>


            <div className="xp-pill">
              <Zap size={15} />

              {role === 'Business'
                ? wallet.xp
                : selectedTeam?.xp || 0}

              {' '}XP
            </div>

          </div>

        </header>


        {/* CONTENT */}

        <main>

          {error && (
            <div
              role="alert"
              className="alert"
            >
              <CircleHelp size={18} />

              <span>
                {error}
              </span>

              <button
                onClick={() =>
                  act(refresh)
                }
              >
                Повторить загрузку
              </button>

              <button
                aria-label="Закрыть ошибку"
                onClick={() =>
                  setError('')
                }
              >
                <X size={16} />
              </button>
            </div>
          )}


          {!data ? (

            <div className="loading">
              <LoaderCircle className="spin" />

              Загружаем ваш workspace…
            </div>

          ) : (
            <>

              {/* CATALOG */}

              {route === 'catalog' && (
                <Catalog
                  tasks={tasks}
                  apps={apps}
                  teams={teams}
                  role={role}
                />
              )}


              {/* NEW TASK */}

              {route === 'new' && (
                role === 'Business' ? (

                  <NewTask
                    busy={busy}
                    submit={body =>
                      act(async () => {

                        const task =
                          await api(
                            '/challenges',
                            'POST',
                            body
                          );

                        await refresh();

                        go(
                          'task/' +
                          task.id
                        );

                        const result =
                          await api(
                            '/challenges/' +
                            task.id +
                            '/analyze',
                            'POST'
                          );

                        await refresh();

                        setToast(
                          result.notice
                        );

                        go(
                          'edit/' +
                          task.id
                        );

                      })
                    }
                  />

                ) : (

                  <Empty
                    text="Создание задач доступно в режиме Business."
                  />

                )
              )}


              {/* EDITOR */}

              {route.startsWith('edit/') && (
                current &&
                role === 'Business' ? (

                  <Editor
                    key={
                      current.id +
                      '-' +
                      current.version
                    }
                    task={current}
                    busy={busy}
                    save={body =>
                      act(async () => {

                        await api(
                          '/challenges/' +
                          current.id,
                          'PUT',
                          body
                        );

                        await refresh();

                        setToast(
                          'Карточка подтверждена. Рейтинг пересчитан.'
                        );

                        go(
                          'task/' +
                          current.id
                        );

                      })
                    }
                  />

                ) : (

                  <Empty
                    text="Карточка недоступна."
                  />

                )
              )}


              {/* TASK DETAIL */}

              {route.startsWith('task/') && (
                current ? (

                  <TaskDetail
                    task={current}
                    role={role}
                    busy={busy}

                    onAnalyze={() =>
                      act(async () => {

                        const result =
                          await api(
                            '/challenges/' +
                            current.id +
                            '/analyze',
                            'POST'
                          );

                        await refresh();

                        setToast(
                          result.notice
                        );

                        go(
                          'edit/' +
                          current.id
                        );

                      })
                    }

                    onPublish={() =>
                      mutate(
                        '/challenges/' +
                        current.id +
                        '/publish',
                        undefined,
                        'Challenge опубликован и доступен всем командам.'
                      )
                    }

                    onApply={() => {
                      setError('');

                      setModal({
                        type: 'apply',
                        task: current
                      });
                    }}

                    onBuy={item =>
                      mutate(
                        '/challenges/' +
                        current.id +
                        '/purchase',
                        { item },
                        PRIZES[item] +
                        ' активировано'
                      )
                    }

                    apps={
                      apps.filter(
                        a =>
                          a.challenge_id ===
                          current.id
                      )
                    }

                    teams={teams}
                  />

                ) : (

                  <Empty
                    text="Задача не найдена или ещё не опубликована."
                  />

                )
              )}


              {/* DASHBOARD */}

              {route === 'dashboard' && (
                <Dashboard
                  tasks={tasks}
                  apps={apps}
                  teams={teams}
                  role={role}
                  team={team}
                  busy={busy}

                  decide={(
                    id,
                    status
                  ) =>
                    mutate(
                      '/applications/' +
                      id +
                      '/decision',
                      { status },
                      status === 'selected'
                        ? 'Команда выбрана вами'
                        : 'Отклик отклонён'
                    )
                  }

                  progress={application => {
                    setError('');

                    setModal({
                      type: 'progress',
                      app: application
                    });
                  }}
                />
              )}


              {/* TEAMS */}

              {route === 'teams' && (
                <Teams
                  teams={teams}
                  role={role}
                  team={team}

                  choose={id => {
                    setTeam(id);

                    setToast(
                      'Активная команда изменена'
                    );
                  }}
                />
              )}

            </>
          )}


          <footer>
            <span>
              <Zap size={13} />
              TaskQuest AI
            </span>

            <span>
              AI Sana Challenge Hub · Hackathon MVP
            </span>

            <span>
              Синтетические данные · Демо-режим
            </span>
          </footer>

        </main>

      </div>


      {/* BUSY */}

      {busy && (
        <div
          className="busy-bar"
          role="status"
        >
          <LoaderCircle
            className="spin"
            size={16}
          />

          Сохраняем изменения…
        </div>
      )}


      {/* TOAST */}

      {toast && (
        <div
          className="toast"
          role="status"
        >
          <CheckCircle2 size={19} />

          {toast}

          <button
            aria-label="Закрыть уведомление"
            onClick={() =>
              setToast('')
            }
          >
            <X size={16} />
          </button>
        </div>
      )}


      {/* MODALS */}

      {modal && (
        <Modal
          close={() => {
            if (!busy) {
              setModal(null);
            }
          }}
        >

          {/* APPLICATION */}

          {modal.type === 'apply' && (
            <ProposalForm
              task={modal.task}
              team={selectedTeam}
              busy={busy}
              error={error}

              submit={body =>
                act(async () => {

                  await api(
                    '/challenges/' +
                    modal.task.id +
                    '/applications',
                    'POST',
                    {
                      ...body,
                      team_id: team
                    }
                  );

                  await refresh();

                  setModal(null);

                  setToast(
                    'Отклик отправлен. Решение примет бизнес.'
                  );

                  go('dashboard');

                })
              }
            />
          )}


          {/* PROGRESS */}

          {modal.type === 'progress' && (
            <ProgressForm
              app={modal.app}
              busy={busy}
              error={error}

              submit={body =>
                act(async () => {

                  const result =
                    await api(
                      '/applications/' +
                      modal.app.id +
                      '/progress',
                      'POST',
                      body
                    );

                  await refresh();

                  setModal(null);

                  setToast(
                    'Прогресс подтверждён: +' +
                    result.xp +
                    ' XP команде'
                  );

                })
              }
            />
          )}

        </Modal>
      )}

    </div>
  );
}


createRoot(
  document.getElementById('root')
).render(
  <App />
);