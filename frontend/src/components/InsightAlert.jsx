import { useEffect, useRef, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { getTimerInsights, updateTimerPreferences } from '../services/apiClient.js';


function getSeverityLabel(severity) {
    switch (severity) {
        case 'warning':
            return 'ATTENTION';
        case 'tip':
            return 'PRODUCTIVITY TIP';
        default:
            return 'SMART INSIGHT';
    }
}

function getPreferenceUpdate(suggestedAction) {
    if (!suggestedAction || suggestedAction.value == null) return null;

    const targetToPreferenceKey = {
        break_interval: 'breakInterval',
        breakInterval: 'breakInterval',
        focus_interval: 'focusInterval',
        focusInterval: 'focusInterval',
        pomodoro_cycles: 'pomodoroCycles',
        pomodoroCycles: 'pomodoroCycles',
    };
    const preferenceKey = targetToPreferenceKey[suggestedAction.target];
    const value = Number(suggestedAction.value);

    if (!preferenceKey || !Number.isInteger(value) || value < 1 || value > 180) {
        return null;
    }

    return { [preferenceKey]: value };
}

function getSuggestedActionLabel(suggestedAction) {
    const prefereenceUpdate = getPreferenceUpdate(suggestedAction);
    if (!prefereenceUpdate) return '';

    const targetLabels ={
        break_interval: 'Suggested break interval:',
        breakInterval: 'Suggested break interval:',
        focus_interval: 'Suggested focus interval:',
        focusInterval: 'Suggested focus interval:',
        pomodoro_cycles: "Sessions before a long break:",
        pomodoroCycles: "Sessions before a long break:",
    };

    const targetLabel = targetLabels[suggestedAction.target] || 'Suggested Setting';
    const unit = suggestedAction.unit ? ` ${suggestedAction.unit}` : '';

    return `${targetLabel}: ${suggestedAction.value}${unit}`;
}

function InsightToastContent({ recommendation }) {
    const actionLabel = getSuggestedActionLabel(recommendation.suggestedAction);
    const preferenceUpdate = getPreferenceUpdate(recommendation.suggestedAction);
    const [applyState, setApplyState] = useState('idle');
    const [applyError, setApplyError] = useState('');

    const handleApply = async () => {
        if (!preferenceUpdate || applyState !== 'idle') return;

        setApplyState('applying');
        setApplyError('');

        try {
            await updateTimerPreferences(preferenceUpdate);
            setApplyState('applied');
        } catch (error) {
            setApplyState('idle');
            setApplyError(error instanceof Error ? error.message : 'Unable to apply the recommendation.');
        }
    };

    return (
        <div className="insight-toast-content">
            <span className="insight-toast-eyebrow">
                {getSeverityLabel(recommendation.severity)}
            </span>
            <strong className="insight-toast-title">
                {recommendation.title || 'A new productivity insight'}
            </strong>
            {recommendation.message && (
                <p className="insight-toast-message">{recommendation.message}</p>
            )}
            {actionLabel && (
                <>
                    <span className="insight-toast-suggestion">{actionLabel}</span>
                    <div className="insight-toast-actions">
                        <button
                            type="button"
                            className={`insight-toast-apply-button${applyState === 'applied' ? ' is-applied' : ''}`}
                            onClick={handleApply}
                            disabled={applyState !== 'idle'}
                        >
                            {applyState === 'applying' && 'Applying...'}
                            {applyState === 'applied' && 'Applied'}
                            {applyState === 'idle' && 'Apply'}
                        </button>
                        {applyState === 'applied' && (
                            <span className="insight-toast-apply-success" role="status">
                                Preference successfully saved!
                            </span>
                        )}
                    </div>
                    {applyError && (
                        <p className="insight-toast-apply-error" role="alert">
                            {applyError}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

function showInsightToast(recommendation, index) {
    const toastOptions = {
        toastId: `katchup-insight-${recommendation.id ?? recommendation.title ?? index}`,
        className: 'insight-toast-shell',
        autoClose: 8500,
        closeOnClick: false,
        delay: index * 650,
    };

    const content = <InsightToastContent recommendation={recommendation} />;

    switch (recommendation.severity) {
        case 'warning':
            toast.warn(content, toastOptions);
            break;
        case 'tip':
            toast.success(content, toastOptions);
            break;
        default:
            toast.info(content, toastOptions);
            break;
    }
}

export default function InsightAlert() {
    const displayedRecommendationsRef = useRef(new Set());

    useEffect(() => {
        let isCurrent = true;
        
        const loadRecommendations = async () => {
            try {
                const insights = await getTimerInsights({ days: 7 });
                if (!isCurrent || !Array.isArray(insights?.recommendations)) return;

                insights.recommendations.forEach((recommendation, index) => {
                    if (!recommendation || typeof recommendation !== 'object') return;

                    const hasTitle = typeof recommendation.title === 'string' && recommendation.title.trim();
                    const hasMessage = typeof recommendation.message === 'string' && recommendation.message.trim();
                    if (!hasTitle && !hasMessage) return;

                    const recommendationKey = String(
                        recommendation.id ?? `${recommendation.title}-${recommendation.message}`,
                    );
                    if (displayedRecommendationsRef.current.has(recommendationKey)) return;

                    displayedRecommendationsRef.current.add(recommendationKey);
                    showInsightToast(recommendation, index);
                });
            } catch (requestError) {
                    console.warn('Unable to load recommendations.', requestError);
            }
        };

        loadRecommendations();

        return () => {
            isCurrent = false;
        };
    }, []);

    return (
        <ToastContainer
            className="insight-toast-container"
            position="top-left"
            autoClose={8500}
            closeOnClick={false}
            newestOnTop
            pauseOnFocusLoss
            pauseOnHover
            draggable
            limit={3}
            theme="light"
        />
    );
}