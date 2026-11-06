import { useState } from 'react';

const EMPTY_TASK_FORM = { title: '', description: '', dueDate: '' };
const EMPTY_CALENDAR_FORM = { name: '', url: '', description: '' };

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
    isCalendarManagerOpen = false,
    onCalendarManagerToggle = () => {},
    onCalendarManagerClose = () => {},
    calendars = [],
    isLoadingCalendars = false,
    calendarForm = EMPTY_CALENDAR_FORM,
    onCalendarFormChange = () => {},
    onAddCalendar = (event) => event.preventDefault(),
    isAddingCalendar = false,
    onDeleteCalendar = () => {},
    deletingCalendarId = null,
    onSyncCalendar = () => {},
    syncingCalendarId = null,
    calendarError = '',
    calendarNotice = '',
    calendarNoticeFading = false,
}) {
    const [isBackgroundOpen, setBackgroundOpen] = useState(false);

    return (
        <aside className="settings-panel">
            <button
                type="button"
                className={`settings-shortcut settings-background-trigger${isBackgroundOpen ? ' is-active' : ''}`}
                onClick={() => {
                    onTaskManagerClose?.();
                    onCalendarManagerClose?.();
                    setBackgroundOpen((open) => !open);
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
                    onCalendarManagerClose?.();
                    onTaskManagerToggle?.();
                }}
                title="Add a Task"
            >
                <span>T</span>
            </button>

            <button
                type="button"
                className={`settings-shortcut settings-calendar-trigger${isCalendarManagerOpen ? ' is-active' : ''}`}
                onClick={() => {
                    setBackgroundOpen(false);
                    onTaskManagerClose?.();
                    onCalendarManagerToggle?.();
                }}
                title="Manage Calendars"
            >
                <span>C</span>
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
                        <label htmlFor="new-task-title">Task Title</label>
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

            {isCalendarManagerOpen && (
                <section
                    className="task-manager-panel calendar-manager-panel"
                    id="calendar-manager-panel"
                >
                    <div className="task-manager-header">
                        <div>
                            <h2 id="calendar-manager-heading">Calendars</h2>
                            <p>View connected calendars or import an iCal feed.</p>
                        </div>
                        <button
                            type="button"
                            className="task-manager-close"
                            onClick={onCalendarManagerClose}
                        >
                            X
                        </button>
                    </div>

                    {calendarError && (
                        <p className="task-manager-feedback-error" role="alert">
                            {calendarError}
                        </p>
                    )}
                    {calendarNotice && (
                        <p className={`task-manager-feedback is-success auto-dismiss-notice${calendarNoticeFading ? ' is-fading' : ''}`} role="status">
                            {calendarNotice}
                        </p>
                    )}

                    <div className="calendar-list-section">
                        <h3 className="calendar-subheading">Connected Calendars ({calendars.length})</h3>
                        {isLoadingCalendars ? (
                            <p className="calendar-loading">Loading calendars...</p>
                        ) : calendars.length === 0 ? (
                            <p className="calendar-empty">No external calendars connected yet.</p>
                        ) : (
                            <div className="calendar-cards-container">
                                {calendars.map((cal) => (
                                    <div key={cal.id} className="calendar-card-item">
                                        <div className="calendar-card-details">
                                            <strong>{cal.name}</strong>
                                            {cal.description && <p className="calendar-card-desc">{cal.description}</p>}
                                            <span className="calendar-card-url" title={cal.ical_url}>
                                                {cal.ical_url}
                                            </span>
                                        </div>
                                        <div className="calendar-card-actions">
                                            <button
                                                type="button"
                                                className="calendar-sync-btn"
                                                onClick={() => onSyncCalendar(cal.id)}
                                                disabled={syncingCalendarId === cal.id}
                                                title="Sync upcoming events into tasks"
                                            >
                                                {syncingCalendarId === cal.id ? 'Syncing...' : 'Sync'}
                                            </button>
                                            <button
                                                type="button"
                                                className="calendar-delete-btn"
                                                onClick={() => onDeleteCalendar(cal.id)}
                                                disabled={deletingCalendarId === cal.id}
                                                title="Remove this calendar"
                                            >
                                                {deletingCalendarId === cal.id ? '...' : 'Remove'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <form className="task-create-form calendar-add-form" onSubmit={onAddCalendar}>
                        <h3 className="calendar-subheading">Add a Calendar</h3>
                        <label htmlFor="new-calendar-name">Calendar Name</label>
                        <input
                            id="new-calendar-name"
                            name="name"
                            type="text"
                            placeholder="e.g. University Deadlines"
                            value={calendarForm.name}
                            onChange={(event) => onCalendarFormChange('name', event.target.value)}
                            maxLength={150}
                            required
                        />

                        <label htmlFor="new-calendar-url">iCal Feed URL (.ics)</label>
                        <input
                            id="new-calendar-url"
                            name="url"
                            type="url"
                            placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                            value={calendarForm.url}
                            onChange={(event) => onCalendarFormChange('url', event.target.value)}
                            required
                        />

                        <label htmlFor="new-calendar-desc">Description <span>(optional)</span></label>
                        <input
                            id="new-calendar-desc"
                            name="description"
                            type="text"
                            placeholder="e.g. Canvas syllabus calendar"
                            value={calendarForm.description}
                            onChange={(event) => onCalendarFormChange('description', event.target.value)}
                            maxLength={300}
                        />

                        <button
                            type="submit"
                            className="task-manager-add-button calendar-add-button"
                            disabled={isAddingCalendar}
                        >
                            {isAddingCalendar ? 'Adding & Syncing...' : '+ Add Calendar'}
                        </button>
                    </form>
                </section>
            )}
        </aside>
    );
}
