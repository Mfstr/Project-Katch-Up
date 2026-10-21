import { useState } from 'react';

const BACKGROUNDS = [
    { value: 'plain', label: 'Plain White', description: 'Clean white background' },
    { value: 'paper', label: 'Warm Paper', description: 'Gives background a paper-like texture'},
    { value: 'greenery', label: 'Soft Greenery', description:'Subtle green garden-like tones' },
    { value: 'sunset', label: 'Warm Sunset', description: 'Muted peach and cream tones' },
    { value: 'blue-grid', label: 'Blue Grid', description: 'Light blue notebook grid'}
]

export default function SettingsPanel({ background, onBackgroundChange }) {
    const [isBackgroundOpen, setBackgroundOpen] = useState(false);

    return (
        <aside className="settings-panel">
            <button
                type="button"
                className={`settings-shortcut settings-background-trigger${isBackgroundOpen ? ' is-active' : ''}`}
                onClick={() => setBackgroundOpen((open) => !open)}
            >
                <span>B</span>
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
        </aside>
    );
}