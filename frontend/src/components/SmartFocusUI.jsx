import { useCallback, useEffect, useRef, useState } from 'react';

import {
    createTask,
    deleteTask,
    getNextTask,
    getTimerStatus,
    pauseTimer,
    resetTimer,
    startTimer,
    stopTimer,
} from '../services/apiClient.js';

import StartSessionButton from './StartSessionButton.jsx';
import Dashboard from './Dashboard.jsx';
import PomodoroTimer from './PomodoroTimer.jsx';
import SettingsPanel from './SettingsPanel.jsx';

const DEFAULT_FOCUS_SECONDS = 20 * 60;
const SHORT_BREAK_SECONDS = 5 * 60;
const EMPTY_TASK_FORM = { title: '', description: '', dueDate: '' };

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
    const [taskError, setTaskError] = useState('');
    const [taskNotice, setTaskNotice] = useState('');
    const [taskActionError, setTaskActionError] = useState('');
    const [taskActionNotice, setTaskActionNotice] = useState('');
    const clearMessageNotice = useCallback(() => setMessage(''), []);
    const clearTaskNotice = useCallback(() => setTaskNotice(''), []);
    const clearTaskActionNotice = useCallback(() => setTaskActionNotice(''), []);
    const isMessageFading = useAutoDismissNotice(message, clearMessageNotice);
    const isTaskNoticeFading = useAutoDismissNotice(taskNotice, clearTaskNotice);
    const isTaskActionNoticeFading = useAutoDismissNotice(taskActionNotice, clearTaskActionNotice);
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

    const handleBackgroundChange = (nextBackground) => {
        setBackground(nextBackground);
        try {
            window.localStorage.setItem('project-katchup-background', nextBackground);
        } catch {
            // Selector will still operate if and when storage is unavailable.
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
        <main className={`smart-focus-ui workspace-background-${background}`}>
            <Dashboard
                selectedTask={task}
                taskSelectionDisabled={hasStartedSession}
                onSelectTask={handleSelectTask}
                refreshSignal={taskRefreshSignal}
                onDeleteTask={handleDeleteTask}
                deletingTaskId={deletingTaskId}
                taskActionError={taskActionError}
                taskActionNotice={taskActionNotice}
                taskActionNoticeFading={isTaskActionNoticeFading}
            />

            <SettingsPanel 
                background={background}
                onBackgroundChange={handleBackgroundChange}
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
    );
}
