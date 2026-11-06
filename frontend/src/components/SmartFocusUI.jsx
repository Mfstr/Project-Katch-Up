import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom'

import {
    addCalendar,
    createTask,
    deleteCalendar,
    deleteTask,
    getCalendars,
    getTimerStatus,
    logout,
    pauseTimer,
    resetTimer,
    startTimer,
    stopTimer,
    syncCalendar,
    updateTask,
} from '../services/apiClient.js';

import StartSessionButton from './StartSessionButton.jsx';
import Dashboard from './Dashboard.jsx';
import PomodoroTimer from './PomodoroTimer.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import InsightAlert from './InsightAlert.jsx';

const DEFAULT_FOCUS_SECONDS = 20 * 60;
const SHORT_BREAK_SECONDS = 5 * 60;
const EMPTY_TASK_FORM = { title: '', description: '', dueDate: '' };
const EMPTY_CALENDAR_FORM = { name: '', url: '', description: '' };

function readSavedTask() {
    try {
        const savedTask = window.localStorage.getItem('project-katchup-selected-task');
        return savedTask ? JSON.parse(savedTask) : null;
    } catch {
        return null;
    }
}

function useAutoDismissNotice(notice, clearNotice, fadeAfterMs = 3500, fadeDurationMs = 450) {
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        if (!notice) {
            setIsFading(false);
            return undefined;
        }

        setIsFading(false);
        const fadeTimeout = window.setTimeout(() => setIsFading(true), fadeAfterMs);
        const clearTimeoutId = window.setTimeout(
            clearNotice,
            fadeAfterMs + fadeDurationMs,
        );

        return () => {
            window.clearTimeout(fadeTimeout);
            window.clearTimeout(clearTimeoutId);
        };
    }, [notice, clearNotice, fadeAfterMs, fadeDurationMs]);

    return isFading;
}

export default function SmartFocusUI() {
    const navigate = useNavigate();
    const [task, setTask] = useState(readSavedTask);
    const [phase, setPhase] = useState('FOCUS');
    const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_FOCUS_SECONDS);
    const [endTime, setEndTime] = useState(null);
    const [isActive, setActive] = useState(false);
    const [hasStartedSession, setHasStartedSession] = useState(() => {
        try {
            return window.sessionStorage.getItem('project-katchup-session-started') === 'true';
        } catch {
            return false;
        }
    });
    const [isLoading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [sessionCompleted, setSessionCompleted] = useState(false);
    const [taskRefreshSignal, setTaskRefreshSignal] = useState(0);
    const [isTaskManagerOpen, setTaskManagerOpen] = useState(false);
    const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
    const [isCreatingTask, setCreatingTask] = useState(false);
    const [deletingTaskId, setDeletingTaskId] = useState(null);
    const [updatingTaskId, setUpdatingTaskId] = useState(null);
    const [taskError, setTaskError] = useState('');
    const [taskNotice, setTaskNotice] = useState('');
    const [taskActionError, setTaskActionError] = useState('');
    const [taskActionNotice, setTaskActionNotice] = useState('');
    const [calendars, setCalendars] = useState([]);
    const [isLoadingCalendars, setLoadingCalendars] = useState(false);
    const [isCalendarManagerOpen, setCalendarManagerOpen] = useState(false);
    const [calendarForm, setCalendarForm] = useState(EMPTY_CALENDAR_FORM);
    const [isAddingCalendar, setAddingCalendar] = useState(false);
    const [deletingCalendarId, setDeletingCalendarId] = useState(null);
    const [syncingCalendarId, setSyncingCalendarId] = useState(null);
    const [calendarError, setCalendarError] = useState('');
    const [calendarNotice, setCalendarNotice] = useState('');
    const clearMessageNotice = useCallback(() => setMessage(''), []);
    const clearTaskNotice = useCallback(() => setTaskNotice(''), []);
    const clearTaskActionNotice = useCallback(() => setTaskActionNotice(''), []);
    const clearCalendarNotice = useCallback(() => setCalendarNotice(''), []);
    const isMessageFading = useAutoDismissNotice(message, clearMessageNotice);
    const isTaskNoticeFading = useAutoDismissNotice(taskNotice, clearTaskNotice);
    const isTaskActionNoticeFading = useAutoDismissNotice(taskActionNotice, clearTaskActionNotice);
    const isCalendarNoticeFading = useAutoDismissNotice(calendarNotice, clearCalendarNotice);
    const chimeRef = useRef(null);
    const completionHandledRef = useRef(false);
    const notificationPermRequestRef = useRef(false);
    const [background, setBackground] = useState(() => {
        try {
            return window.localStorage.getItem('project-katchup-background') || 'plain';
        } catch {
            return 'plain';
        }
    });

    const [isYoutubePlayerEnabled, setYoutubePlayerEnabled] = useState(() => {
        try {
            return window.localStorage.getItem('project-katchup-youtube-player-enabled') === 'true';
        } catch {
            return false;
        }
    });

    const updateSessionStarted = useCallback((started) => {
        setHasStartedSession(started);
        try {
            if (started) {
                window.sessionStorage.setItem('project-katchup-session-started', 'true');
            } else {
                window.sessionStorage.removeItem('project-katchup-session-started');
            }
        } catch {
            // Timer controls will still work when browser storage is unavailable.
        }
    }, []);

    const applyTimerStatus = useCallback((status) => {
        if (!status) return;

        const nextPhase = status.phase ?? 'FOCUS';
        const nextRemaining = Number(status.remainingSeconds);

        setPhase(nextPhase);
        setRemainingSeconds(
            Number.isFinite(nextRemaining)
                ? nextRemaining
                : nextPhase === 'SHORT_BREAK'
                    ? SHORT_BREAK_SECONDS
                    : DEFAULT_FOCUS_SECONDS,
        );
        
        setActive(Boolean(status.isActive));
        setEndTime(status.endTime ? new Date(status.endTime).getTime() : null);

        if (status.isActive) {
            updateSessionStarted(true);
        } else if (Number.isFinite(nextRemaining) && nextRemaining <= 0) {
            updateSessionStarted(false);
            setSessionCompleted(true);
        }
    }, [updateSessionStarted]);

    const refreshTimer = useCallback(async () => {
        const status = await getTimerStatus();
        applyTimerStatus(status);
    }, [applyTimerStatus]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (Notification.permission !== 'default') return;
        if (notificationPermRequestRef.current) return;

        notificationPermRequestRef.current = true;

        try {
            Notification.requestPermission().catch((permissionError) => {
                console.warn('Unable to request notification permission.', permissionError);
            });
        } catch (permissionError) {
            console.warn('Unable to request notification permission.', permissionError);
        }
    }, []);

    const showCompletionNotification = useCallback(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        try {
            const notification = new Notification('Timer Complete', {
                body: task?.title
                    ? `Your session for "${task.title}" is complete.`
                    : 'Your timer has finished.',
                tag: 'project-katchup-timer-complete',
            });

            notification.onClick = () => {
                window.focus();
                notification.close();
            };
        } catch (notificationError) {
            console.warn('Unable to show the timer completion notification.', notificationError);
        }
    }, [task?.title]);

    useEffect(() => {
        if (typeof Audio === 'undefined') return undefined;

        const chime = new Audio(`${import.meta.env.BASE_URL}audio/timer-chime.mp3`);
        chime.preload = 'auto';
        chime.volume = 0.75;
        chimeRef.current = chime;

        return () => {
            chime.pause();
            chime.currentTime = 0;
            chimeRef.current = null;
        };
    }, []);

    const playCompletionChime = useCallback(() => {
        const chime = chimeRef.current;
        if (!chime) return;

        chime.currentTime = 0;
        chime.play().catch((playbackError) => {
            console.warn('Unable to play the timer completion chime.', playbackError);
        });
    }, []);

    useEffect(() => {
        refreshTimer().catch(() => {
            // Default local timer state can still be used if server is down.
        });
    }, [refreshTimer]);

    useEffect(() => {
        if (!isActive || !endTime) return undefined;

        const updateCountdown = () => {
            const nextRemaining = Math.max(
                0,
                Math.ceil((endTime - Date.now()) / 1000),
            );
            
            setRemainingSeconds(nextRemaining);

            if (nextRemaining === 0 && !completionHandledRef.current) {
                completionHandledRef.current = true;
                setSessionCompleted(true);
                updateSessionStarted(false);
                playCompletionChime();
                showCompletionNotification();
                refreshTimer().catch(() => setActive(false));
            }
        };

        updateCountdown();
        const intervalId = window.setInterval(updateCountdown, 250);

        return () => window.clearInterval(intervalId);
    }, [endTime, isActive, playCompletionChime, refreshTimer, showCompletionNotification, updateSessionStarted]);

    const runTimerAction = async (action, onSuccess) => {
        setLoading(true);
        setError('');

        try {
            const response = await action();
            onSuccess?.(response);

            if (response?.endTime) {
                setEndTime(new Date(response.endTime).getTime());
            }

            await refreshTimer();
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Unable to update the timer.',
            );
        } finally {
            setLoading(false);
        }
    };

    const startSession = async () => {
        if (!task || task.id == null) {
            setError('Select a task from the dashboard before starting a session.');
            return;
        }

        if (isActive || hasStartedSession || isLoading) return;

        completionHandledRef.current = false;
        setSessionCompleted(false);
        setLoading(true);
        setMessage('');
        setError('');

        try {
            await resetTimer();
            setPhase('FOCUS');
            setEndTime(null);

            const response = await startTimer({
                taskId: task.id,
                durationSeconds: task.durationSeconds ?? DEFAULT_FOCUS_SECONDS,
            });

            updateSessionStarted(true);
            if (response?.endTime) {
                setEndTime(new Date(response.endTime).getTime());
            }

            setMessage(`Session Started: ${task.title}`);
            await refreshTimer();
        } catch (requestError) {
            setError(
                requestError instanceof Error
                ? requestError.message
                : 'Session was unable to start.',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const confirmed = window.confirm('Are you sure you want to log out?');
        if (!confirmed) return;

        try {
            await logout();
        } catch {
            // Logout helper clears local auth token when server request fails.
        } finally {
            try {
                window.sessionStorage.removeItem('project-katchup-session-started');
                window.sessionStorage.removeItem('project-katchup-selected-task');
                window.localStorage.removeItem('project-katchup-selected-task');
            } catch {
                // Will still logout if browser storage is unavailable
            }

            navigate('/login', { replace: true });
        }
    };

    const handleBackgroundChange = (nextBackground) => {
        setBackground(nextBackground);
        try {
            window.localStorage.setItem('project-katchup-background', nextBackground);
        } catch {
            // Selector will still operate if and when storage is unavailable.
        }
    };

    const handleYoutubePlayerToggle = () => {
        const nextEnabled = !isYoutubePlayerEnabled;
        setYoutubePlayerEnabled(nextEnabled);
        try {
            window.localStorage.setItem(
                'project-katchup-youtube-player-enabled',
                String(nextEnabled),
            );
        } catch {
            // Youtube player toggle will still work if the current page's storage is unavailable.
        }
    };

    const handleSelectTask = (selectedTask) => {
        if (hasStartedSession) return;
        
        setTask(selectedTask);

        try {
            window.sessionStorage.setItem('project-katchup-selected-task', JSON.stringify(selectedTask));
        } catch {
            // Can still select task if browser storage is unavailable.
        }

        setMessage('');
        setError('');
    };

    const handleTasksChanged = useCallback((deletedTaskId = null) => {
        setTaskRefreshSignal((currentSignal) => currentSignal + 1);

        if (
            deletedTaskId !== null &&
            String(task?.id) === String(deletedTaskId) &&
            !isActive &&
            !hasStartedSession
        ) {
            setTask(null);
            try {
                window.sessionStorage.removeItem('project-katchup-selected-task');
            } catch {
                // Ignores browser storage that is unavailable.
            }
        }
    }, [hasStartedSession, isActive, task?.id]);

    const handleTaskManagerToggle = () => {
        setTaskManagerOpen((isOpen) => !isOpen);
        setTaskNotice('');
        setTaskError('');
    };

    const handleTaskManagerClose = () => setTaskManagerOpen(false);

    const handleTaskFormChange = (field, value) => {
        setTaskForm((currentForm) => ({ ...currentForm, [field]: value }));
    };

    const handleCreateTask = async (event) => {
        event.preventDefault();

        const title = taskForm.title.trim();
        if (!title) {
            setTaskError('Enter a title for your task.');
            return;
        }

        setCreatingTask(true);
        setTaskError('');
        setTaskNotice('');

        try {
            await createTask({
                title,
                description: taskForm.description.trim() || null,
                due_date: taskForm.dueDate || null,
            });

            setTaskForm(EMPTY_TASK_FORM);
            setTaskNotice(`Added "${title}" to your tasks.`);
            setTaskRefreshSignal((currentSignal) => currentSignal + 1);
        } catch (requestError) {
            setTaskError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Unable to create your task.',
            );
        } finally {
            setCreatingTask(false);
        }
    };

    const loadCalendars = useCallback(async () => {
        setLoadingCalendars(true);
        try {
            const list = await getCalendars();
            setCalendars(Array.isArray(list) ? list : []);
        } catch {
            // Silently maintain existing state
        } finally {
            setLoadingCalendars(false);
        }
    }, []);

    useEffect(() => {
        loadCalendars();
    }, [loadCalendars]);

    const handleCalendarManagerToggle = () => {
        setCalendarManagerOpen((isOpen) => !isOpen);
        setCalendarNotice('');
        setCalendarError('');
    };

    const handleCalendarManagerClose = () => setCalendarManagerOpen(false);

    const handleCalendarFormChange = (field, value) => {
        setCalendarForm((currentForm) => ({ ...currentForm, [field]: value }));
        if (calendarError) setCalendarError('');
    };

    const handleAddCalendar = async (event) => {
        event.preventDefault();
        const name = calendarForm.name.trim();
        const url = calendarForm.url.trim();

        if (!name || !url) {
            setCalendarError('Calendar name and feed URL are required.');
            return;
        }

        setAddingCalendar(true);
        setCalendarError('');
        setCalendarNotice('');

        try {
            const res = await addCalendar({
                name,
                url,
                description: calendarForm.description.trim() || null,
            });

            setCalendarForm(EMPTY_CALENDAR_FORM);
            const count = res?.syncedTasksCount ?? 0;
            setCalendarNotice(
                count > 0
                    ? `Added "${name}" and synced ${count} upcoming event(s) as tasks!`
                    : `Added "${name}" calendar feed.`,
            );
            await loadCalendars();
            setTaskRefreshSignal((currentSignal) => currentSignal + 1);
        } catch (requestError) {
            setCalendarError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Unable to add calendar.',
            );
        } finally {
            setAddingCalendar(false);
        }
    };

    const handleDeleteCalendar = async (calId) => {
        if (!window.confirm('Are you sure you want to remove this calendar feed?')) return;
        setDeletingCalendarId(calId);
        setCalendarError('');
        setCalendarNotice('');

        try {
            await deleteCalendar(calId);
            setCalendarNotice('Calendar removed successfully.');
            setCalendars((prev) => prev.filter((c) => c.id !== calId));
        } catch (requestError) {
            setCalendarError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Unable to remove calendar.',
            );
        } finally {
            setDeletingCalendarId(null);
        }
    };

    const handleSyncCalendar = async (calId) => {
        setSyncingCalendarId(calId);
        setCalendarError('');
        setCalendarNotice('');

        try {
            const res = await syncCalendar(calId);
            const count = res?.count ?? 0;
            setCalendarNotice(`Sync complete: ${count} task(s) updated.`);
            setTaskRefreshSignal((currentSignal) => currentSignal + 1);
        } catch (requestError) {
            setCalendarError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Failed to sync calendar feed.',
            );
        } finally {
            setSyncingCalendarId(null);
        }
    };

    const handleDeleteTask = async (tasktoDelete) => {
        const taskId = tasktoDelete?.id ?? tasktoDelete?.taskId;
        const taskTitle = tasktoDelete?.title ?? tasktoDelete?.name ?? 'Untitled task';
        
        if (taskId == null) {
            setTaskActionError('This task cannot be deleted because it has no task ID.');
            return;
        }
        
        const confirmed = window.confirm(
            `Are you sure you want to delete "${taskTitle}"? This will remove it from your active task list.`,
        );

        if (!confirmed) return;

        setDeletingTaskId(taskId);
        setTaskActionError('');
        setTaskActionNotice('');

        try {
            await deleteTask(taskId);
            setTaskActionNotice(`Deleted "${taskTitle}".`);
            handleTasksChanged(taskId);
        } catch (requestError) {
            setTaskActionError(
                requestError instanceof Error
                ? requestError.message
                : 'Unable to delete your task.',
            );
        } finally {
            setDeletingTaskId(null);
        }
    };

    const handleUpdateTask = async (taskToUpdate, updates) => {
        const taskId = taskToUpdate?.id ?? taskToUpdate?.taskId;
        const taskTitle = taskToUpdate?.title ?? taskToUpdate?.name ?? 'Untitled Task';

        if (taskId == null) {
            setTaskActionError('This task cannot be updated because it does not have a task ID.');
            return false;
        }

        setUpdatingTaskId(taskId);
        setTaskActionError('');
        setTaskActionNotice('');

        try {
            const updatedTask = await updateTask(taskId, updates);
            if (!updatedTask) {
                throw new Error('The given task could not be found. Refresh your task list and try again.');
            }

            setTask((currentTask) => {
                if (!currentTask || String(currentTask.id) !== String(taskId)) {
                    return currentTask;
                }

                const hasOwn = (key) => Object.prototype.hasOwnProperty.call(updatedTask, key);
                const nextDueDate = hasOwn('dueDate')
                    ? updatedTask.dueDate
                    : hasOwn('due_date')
                        ? updatedTask.due_date
                        : updates.due_date ?? updates.dueDate ?? currentTask.dueDate;
                const nextDescription = hasOwn('description')
                    ? updatedTask.description
                    : updates.description ?? currentTask.description;
                const nextIsComplete = updatedTask.isComplete
                    ?? updatedTask.is_complete
                    ?? updates.is_complete
                    ?? updates.isComplete
                    ?? currentTask.isComplete;

                return {
                    ...currentTask,
                    ...updatedTask,
                    title: updatedTask.title ?? updates.title ?? currentTask.title,
                    description: nextDescription,
                    dueDate: nextDueDate,
                    isComplete: Boolean(nextIsComplete),
                };
            });

            if (updates.is_complete !== undefined || updates.isComplete !== undefined) {
                const isNowComplete = Boolean(updates.is_complete ?? updates.isComplete);
                setTaskActionNotice(
                    isNowComplete
                        ? `Marked "${taskTitle}" as completed.`
                        : `Reopened "${taskTitle}".`,
                );
            } else {
                setTaskActionNotice(`Updated "${updates.title?.trim() || taskTitle}".`);
            }

            setTaskRefreshSignal((currentSignal) => currentSignal + 1);
            return true;
        } catch (requestError) {
            setTaskActionError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Unable to update your task.',
            );
            return false;
        } finally {
            setUpdatingTaskId(null);
        }
    };

    const handleResume = () => {
        if (!hasStartedSession || isActive || remainingSeconds <= 0 || isLoading) return;
        
        completionHandledRef.current = false;
        setSessionCompleted(false);
        return runTimerAction(startTimer);
    };
    
    const handlePause = () => runTimerAction(pauseTimer);

    const handleStop = () => {
        completionHandledRef.current = true;
        setSessionCompleted(false);
        return runTimerAction(stopTimer, () => updateSessionStarted(true));
    };

    const handleReset = () => {
        completionHandledRef.current = false;
        setSessionCompleted(false);
        return runTimerAction(resetTimer, () => {
            setPhase('FOCUS');
            setRemainingSeconds(DEFAULT_FOCUS_SECONDS);
            setEndTime(null);
            setActive(false);
            updateSessionStarted(false);
        });
    };

    return (
        <>
            <InsightAlert />
            <main className={`smart-focus-ui workspace-background-${background}`}>
                <Dashboard
                    selectedTask={task}
                    taskSelectionDisabled={hasStartedSession}
                    onSelectTask={handleSelectTask}
                    refreshSignal={taskRefreshSignal}
                    onDeleteTask={handleDeleteTask}
                    deletingTaskId={deletingTaskId}
                    onUpdateTask={handleUpdateTask}
                    updatingTaskId={updatingTaskId}
                    taskActionError={taskActionError}
                    taskActionNotice={taskActionNotice}
                    taskActionNoticeFading={isTaskActionNoticeFading}
                    isYoutubePlayerEnabled={isYoutubePlayerEnabled}
                    onLogout={handleLogout}
                    calendars={calendars}
                    onOpenCalendarManager={() => setCalendarManagerOpen(true)}
                />

                <SettingsPanel 
                    background={background}
                    onBackgroundChange={handleBackgroundChange}
                    isYoutubePlayerEnabled={isYoutubePlayerEnabled}
                    onYoutubePlayerToggle={handleYoutubePlayerToggle}
                    isTaskManagerOpen={isTaskManagerOpen}
                    taskForm={taskForm}
                    isCreatingTask={isCreatingTask}
                    taskError={taskError}
                    taskNotice={taskNotice}
                    taskNoticeFading={isTaskNoticeFading}
                    onTaskManagerToggle={handleTaskManagerToggle}
                    onTaskManagerClose={handleTaskManagerClose}
                    onTaskFormChange={handleTaskFormChange}
                    onCreateTask={handleCreateTask}
                    isCalendarManagerOpen={isCalendarManagerOpen}
                    onCalendarManagerToggle={handleCalendarManagerToggle}
                    onCalendarManagerClose={handleCalendarManagerClose}
                    calendars={calendars}
                    isLoadingCalendars={isLoadingCalendars}
                    calendarForm={calendarForm}
                    onCalendarFormChange={handleCalendarFormChange}
                    onAddCalendar={handleAddCalendar}
                    isAddingCalendar={isAddingCalendar}
                    onDeleteCalendar={handleDeleteCalendar}
                    deletingCalendarId={deletingCalendarId}
                    onSyncCalendar={handleSyncCalendar}
                    syncingCalendarId={syncingCalendarId}
                    calendarError={calendarError}
                    calendarNotice={calendarNotice}
                    calendarNoticeFading={isCalendarNoticeFading}
                />
            
                <div className="smart-focus-session-button">
                    <StartSessionButton
                        onClick={startSession}
                        loading={isLoading}
                        disabled={isActive || hasStartedSession || !task}
                    />
                </div>

                {error && (
                    <div className="smart-focus-error" role="alert">
                        {error}
                    </div>
                )}

                {message && !error && (
                    <div className={`smart-focus-message auto-dismiss-notice${isMessageFading ? ' is-fading' : ''}`} role="status">
                        {message}
                    </div>
                )}

                <PomodoroTimer
                    task={task}
                    phase={phase}
                    remainingSeconds={remainingSeconds}
                    isActive={isActive}
                    isLoading={isLoading}
                    sessionCompleted={sessionCompleted}
                    error={''}
                    onResume={handleResume}
                    canResume={hasStartedSession && !isActive && remainingSeconds > 0 && !sessionCompleted}
                    onPause={handlePause}
                    onStop={handleStop}
                    onReset={handleReset}
                />
            </main>
        </>
    );
}
