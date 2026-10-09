import { useCallback, useEffect, useState } from 'react';

import {
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

const DEFAULT_FOCUS_SECONDS = 20 * 60;
const SHORT_BREAK_SECONDS = 5 * 60;

function normalizeTasks(payload) {
    const task = payload?.task ?? payload?.data ?? payload;

    if (!task || typeof task !== 'object') {
        throw new Error('The next-task response did not contain a task.');
    }

    return {
        id: task.id ?? task.taskId,
        title: task.title ?? task.name ?? 'Untitled task',
        description: task.description ?? '',
        dueDate: task.dueDate ?? task.due_date ?? null,
        durationSeconds: task.durationSeconds ?? task.duration_seconds ?? DEFAULT_FOCUS_SECONDS,
        isComplete: Boolean(task.isComplete ?? task.is_complete),
    };
}

export default function SmartFocusUI() {
    const [task, setTask] = useState(null);
    const [phase, setPhase] = useState('FOCUS');
    const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_FOCUS_SECONDS);
    const [endTime, setEndTime] = useState(null);
    const [isActive, setActive] = useState(false);
    const [isLoading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const applyTimerStatus = useCallback((status) => {
        if (!status) return;

        const nextPhase = status.phase ?? 'FOCUS';
        const nextRemaining = Number(status.remainingSeconds);

        setPhase(nextPhase);
        setRemainingSeconds(
            Number.isFinitie(nextRemaining)
                ? nextRemaining
                : nextPhase === 'SHORT_BREAK'
                    ? SHORT_BREAK_SECONDS
                    : DEFAULT_FOCUS_SECONDS,
        );
        
        setActive(Boolean(status.isActive));
        setEndTime(status.endTime ? new Date(status.endTime).getTime() : null);
    }, []);

    const refreshTimer = useCallback(async () => {
        const status = await getTimerStatus();
        applyTimerStatus(status);
    }, [applyTimerStatus]);

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

            if (nextRemaining === 0) {
                refreshTimer().catch(() => setActive(false));
            }
        };

        updateCountdown();
        const intervalId = window.setInterval(updateCountdown, 250);

        return () => window.clearInterval(intervalId);
    }, [endTime, isActive, refreshTimer]);

    const runTimerAction = async (action) => {
        setLoading(true);
        setError('');

        try {
            const response = await action();

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
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const nextTask = normalizeTasks(await getNextTask());
            setTask(nextTask);

            const response = await startTimer({
                taskId: nextTask.id,
                durationSeconds: nextTask.durationSeconds,
            });

            if (response?.endTime) {
                setEndTime(new Date(response.endTime).getTime());
            }

            setActive(true);
            setMessage(`Session Started: ${nextTask.title}`);
            await refreshTimer;
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

    const handleSelectTask = (selectedTask) => {
        setTask(selectedTask);
        setMessage('');
        setError('');
    };

    const handleStart = () =>
        runTimerAction(() =>
            startTimer({
                taskId: task?.id,
                durationSeconds:
                    phase === 'SHORT BREAK'
                        ? SHORT_BREAK_SECONDS
                        : task?.durationSeconds ?? DEFAULT_FOCUS_SECONDS,
            }),
        );
    
    const handlePause = () => runTimerAction(pauseTimer);
    const handleStop = () => runTimerAction(stopTimer);
    
    const handleReset = () =>
        runTimerAction(async () => {
            const response = await resetTimer();
            setPhase('FOCUS');
            setRemainingSeconds(DEFAULT_FOCUS_SECONDS);
            setEndTime(null);
            setActive(false);
            return response;
        });

    return (
        <main className="smart-focus-ui">
            <Dashboard
                selectedTask={task}
                onSelectTask={handleSelectTask}
            />
            
            <div className="smart-focus-session-button">
                <StartSessionButton
                    onClick={startSession}
                    loading={isLoading}
                    disabled={isActive}
                />
            </div>

            {error && (
                <div className="smart-focus-error" role="alert">
                    {error}
                </div>
            )}

            {message && !error && (
                <div className="smart-focus-message" role="status">
                    {message}
                </div>
            )}

            <PomodoroTimer
                task={task}
                phase={phase}
                remainingSeconds={remainingSeconds}
                isactive={isActive}
                isLoading={isLoading}
                error={''}
                onStart={handleStart}
                onPause={handlePause}
                onStop={handleStop}
                onReset={handleReset}
            />
            
        </main>
    );
}