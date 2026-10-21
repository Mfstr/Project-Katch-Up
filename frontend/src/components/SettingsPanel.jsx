import { useState } from 'react';

const BACKGROUNDS = [
    { value: 'plain', label: 'Plain white', description: 'Clean white background' },
    { value: 'paper', label: 'Warm paper', description: 'Gives background a paper-like texture'},
    { value: 'garden', label: 'Soft greenery', description:'Subtle green garden-like tones' },
    { value: 'sunset', label: 'Warm sunset', description: 'Muted peach and cream tones' },
    { value: 'blue-grid', label: 'Blue grid', description: 'Light blue notebook grid'}
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
                </div>
            )}
        </aside>
    );
}