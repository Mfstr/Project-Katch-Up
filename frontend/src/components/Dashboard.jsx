export default function Dashboard({ task }) {
    if (!task) {
        return (
            <article className="empty-task-display">
                <span className="next-task-label">Next Task</span>
                <p> Click the button </p>
            </article>
        );
    }

    const title = task.title;
    const description = task.description;
    const dueDate = task.dueDate;

    return (
        <article className="task-summary">
            <span className="current-task-label">Current Task</span>
            <h2>{title}</h2>
            <p>{description}</p>
            { dueDate && (
                <div className="task-date">
                    <span> Due Date </span>
                    <time dateTime={dueDate}>
                        {new Date(dueDate).toLocaleDateString()}
                    </time>
                </div>
            )}
        </article>
    );
}