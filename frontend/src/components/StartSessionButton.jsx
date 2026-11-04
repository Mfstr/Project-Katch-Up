export default function StartSessionButton({ onClick, loading = false, disabled = false }) {
    return (
        <button
            className="start-session"
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
        >
            <span>
                {loading ? 'Starting session...' : 'Start Session'}
            </span>
        </button>
    );
}
