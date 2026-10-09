function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.ceil(totalSeconds));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function getPhaseLabel(phase) {
    if (phase === 'SHORT_BREAK') return 'Short Break';
    if (phase === 'LONG_BREAK') return 'Long Break';
    return 'Focus';
}

export default function PomodoroTimer({
    task,
    phase = 'FOCUS',
    remainingSeconds = 20 * 60,
    isActive = false,
    isLoading = false,
    error = '',
    onStart,
    onPause,
    onStop,
    onReset,
}) {
    return (
        <section className="pomodoro-timer">
            <div className="timer-header">
                <h2 id="timer-heading">{getPhaseLabel(phase)}</h2>
            </div>

            <div className="timer-display">
                {formatTime(remainingSeconds)}
            </div>

            {task ? (
                <p className="timer-task">
                    Working on: <strong>{task.title}</strong>
                </p>
            ) : (
                <p className="timer-task">Select a task to begin.</p>
            )}

            {error && (
                <div className="timer-error" role="alert">
                    {error}
                </div>
            )}

            <div className="timer-controls">
                {!isActive ? (
                    <button
                        type="button"
                        className="timer-start"
                        onClick={onStart}
                        disabled={isLoading || !task}
                    >
                        Play
                    </button>
                ) : (
                    <button
                        type="button"
                        className="timer-pause"
                        onClick={onPause}
                        disabled={isLoading}
                    >
                        Pause
                    </button>
                )}

                <button
                    type="button"
                    className="timer-stop"
                    onClick={onStop}
                    disabled={isLoading || !isActive}
                >
                    Stop
                </button>

                <button
                    type="button"
                    className="timer-reset"
                    onClick={onReset}
                    disabled={isLoading}
                >
                    Reset
                </button>

            </div>
        </section>  
    );
}