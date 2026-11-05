import { useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { getTimerInsights } from '../services/apiClient.js';


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

function getSuggestedActionLabel(suggestedAction) {
    if (!suggestedAction || suggestedAction.value == null) return '';

    const targetLabels ={
        break_interval: 'Suggested break interval:',
        focus_interval: 'Suggested focus interval:',
        pomodoro_cycles: "Sessions before a long break:",
    };

    const targetLabel = targetLabels[suggestedAction.target] || 'Suggested Setting';
    const unit = suggestedAction.unit ? ` ${suggestedAction.unit}` : '';

    return `${targetLabel}: ${suggestedAction.value}${unit}`;
}

function InsightToastContent({ recommendation }) {
    const actionLabel = getSuggestedActionLabel(recommendation.suggestedAction);

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
                <span className="insight-toast-suggestion">{actionLabel}</span>
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
        delay: index * 500,
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