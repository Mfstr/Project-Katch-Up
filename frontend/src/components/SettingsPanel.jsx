import { useState } from 'react';

const EMPTY_TASK_FORM = { title: '', description: '', dueDate: '' };

const BACKGROUNDS = [
    { value: 'plain', label: 'Plain White', description: 'Clean white background' },
    { value: 'paper', label: 'Warm Paper', description: 'Gives background a paper-like texture'},
    { value: 'greenery', label: 'Soft Greenery', description:'Subtle green garden-like tones' },
    { value: 'sunset', label: 'Warm Sunset', description: 'Muted peach and cream tones' },
    { value: 'blue-grid', label: 'Blue Grid', description: 'Light blue notebook grid'}
];

export default function SettingsPanel({
    background,
    onBackgroundChange,
    isYoutubePlayerEnabled = true,
    onYoutubePlayerToggle = () => {},
    isTaskManagerOpen = false,
    taskForm = EMPTY_TASK_FORM,
    isCreatingTask = false,
    taskError = '',
    taskNotice = '',
    taskNoticeFading = false,
    onTaskManagerToggle = () => {},
    onTaskManagerClose = () => {},
    onTaskFormChange = () => {},
    onCreateTask = (event) => event.preventDefault(),
}) {
    const [isBackgroundOpen, setBackgroundOpen] = useState(false);

    return (
        <aside className="settings-panel">
            <button
                type="button"
                className={`settings-shortcut settings-background-trigger${isBackgroundOpen ? ' is-active' : ''}`}
                onClick={() => {
                    onTaskManagerClose?.();
                    setBackgroundOpen((open) => !open)
                }}
                title="Change Background"
            >
                <span>B</span>
            </button>

            <button
                type="button"
                className={`settings-shortcut settings-youtube-trigger${isYoutubePlayerEnabled ? ' is-active' : ''}`}
                onClick={onYoutubePlayerToggle}
                title={isYoutubePlayerEnabled ? 'Turn off YouTube music player' : 'Turn on YouTube music player'}
            >
                <span>Y</span>
            </button>

            <button
                type="button"
                className={`settings-shortcut settings-task-trigger${isTaskManagerOpen ? ' is-active' : ''}`}
                onClick={() => {
                    setBackgroundOpen(false);
                    onTaskManagerToggle?.();
                }}
                title="Add a Task"
            >
                <span>T</span>
            </button>

            {isBackgroundOpen && (
                <div className="background-selector" id="background-selector">
                    <label htmlFor="background-image-select">Background Image</label>
                    <select
                        id="background-image-select"
                        value={background}
                        onChange={(event) => onBackgroundChange(event.target.value)}
                    >
                        {BACKGROUNDS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <p className="background-selector-help">
                        Choose a look for your background.
                    </p>
                </div>
            )}

            {isTaskManagerOpen && (
                <section
                    className="task-manager-panel"
                    id="task-manager-panel"
                >
                    <div className="task-manager-header">
                        <div>
                            <h2 id="task-manager-heading">Add a Task</h2>
                            <p>Enter the details for your new task.</p>
                        </div>
                        <button
                            type="button"
                            className="task-manager-close"
                            onClick={onTaskManagerClose}
                        >
                            X
                        </button>
                    </div>

                    {taskError && (
                        <p className="task-manager-feedback-error" role="alert">
                            {taskError}
                        </p>
                    )}
                    {taskNotice && (
                        <p className={`task-manager-feedback is-success auto-dismiss-notice${taskNoticeFading ? ' is-fading' : ''}`} role="status">
                            {taskNotice}
                        </p>
                    )}

                    <form className="task-create-form" onSubmit={onCreateTask}>
                        <label htmlFor="task-title">Task Title</label>
                        <input
                            id="new-task-title"
                            name="title"
                            type="text"
                            value={taskForm.title}
                            onChange={(event) => onTaskFormChange('title', event.target.value)}
                            maxLength={150}
                            required
                        />

                        <label htmlFor="new-task-description">Description <span>(optional)</span></label>
                        <textarea
                            id="new-task-description"
                            name="description"
                            value={taskForm.description}
                            onChange={(event) => onTaskFormChange('description', event.target.value)}
                            maxLength={500}
                            rows={2}
                        />

                        <label htmlFor="new-task-due-date">Due Date <span>(optional)</span></label>
                        <input
                            id="new-task-due-date"
                            name="dueDate"
                            type="date"
                            value={taskForm.dueDate}
                            onChange={(event) => onTaskFormChange('dueDate', event.target.value)}
                        />

                        <button
                            type="submit"
                            className="task-manager-add-button"
                            disabled={isCreatingTask}
                        >
                            {isCreatingTask ? 'Adding...' : 'Add Task'}
                        </button>
                    </form>
                </section>
            )}
        </aside>
    );
}