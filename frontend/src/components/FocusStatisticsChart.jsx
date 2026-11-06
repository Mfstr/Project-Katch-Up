import { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

import { getTimerInsights } from '../services/apiClient';

function formatHours(value) {
    const hours = Number(value);
    if (!Number.isFinite(hours)) return '0 hours';
    return `${hours.toFixed(1)} ${hours.toFixed(1) === '1.0' ? 'hour' : 'hours'}`;
}

function formatCalendarDate(value) {
    if (!value) return '';
    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return String(value);

    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function normalizeDailyBreakdown(dailyBreakdown) {
    if (!Array.isArray(dailyBreakdown)) return [];

    return dailyBreakdown.map((day) => {
        const focusMinutes = Number(day?.focusMinutes ?? day?.focus_miutes ?? 0);
        const safeFocusMinutes = Number.isFinite(focusMinutes) && focusMinutes > 0
            ? focusMinutes
            : 0;
        const date = String(day?.date ?? '');

        return {
            date,
            label: day?.dayOfWeek || day?.day_of_week || formatCalendarDate(date),
            focusHours: Math.round((safeFocusMinutes / 60) * 100) / 100,
        };
    });
}

function FocusChartTooltip({ active, payload }) {
    if (!active || !Array.isArray(payload) || payload.length === 0) return null;

    const point = payload[0]?.payload;
    if (!point) return null;

    return (
        <div className="focus-statistics-tooltip">
            <strong>{point.label}</strong>
            <span>{formatCalendarDate(point.date)}</span>
            <p>{formatHours(point.focusHours)} of focus</p>
        </div>
    );
}

export default function FocusStatisticsChart() {
    const [chartData, setChartData] = useState([]);
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isCurrent = true;

        const loadFocuseStatistics = async () => {
            setLoading(true);
            setError('');

            try {
                const insights = await getTimerInsights({ days: 7 });
                const dailyBreakdown = insights?.statistics?.dailyBreakdown;

                if (!Array.isArray(dailyBreakdown)) {
                    throw new Error('The focus statisics response did not contain a daily breakdown.');
                }
                
                if (isCurrent) {
                    setChartData(normalizeDailyBreakdown(dailyBreakdown));
                }
            } catch (requestError) {
                if (isCurrent) {
                    setError(
                        requestError instanceof Error
                            ? requestError.message
                            : 'Unable to load focus statistics.',
                    );
                }
            } finally {
                if (isCurrent) setLoading(false);
            }
        };

        loadFocuseStatistics();

        return () => {
            isCurrent = false;
        };
    }, []);

    const totalFocusHours = chartData.reduce((total, day) => total + day.focusHours, 0);

    const handleRetry = async () => {
        setLoading(true);
        setError('');

        try {
            const insights = await getTimerInsights({ days: 7 });
            const dailyBreakdown = insights?.statistics?.dailyBreakdown;
            if (!Array.isArray(dailyBreakdown)) {
                throw new Error('The focus statistics repsonse did not contain a daily breakdown.')
            }
            setChartData(normalizeDailyBreakdown(dailyBreakdown));
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Unable to load focus statistics'
            )
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="focus-statistics-panel">
            <div className="focus-statistics-header">
                <div>
                    <h2 id="focus-statistics-heading">Focus Statistics</h2>
                    <p>Daily study hours over the last seven days</p>
                </div>
                {!isLoading && !error && chartData.length > 0 && (
                    <div className="focus-statistics-total">
                        <strong>{totalFocusHours.toFixed(1)} hrs </strong>
                        <spand>this week</spand>
                    </div>
                )}
            </div>

            {isLoading && (
                <p className="focus-statistics-feedback" role="status">
                    Loading Focus Statistics
                </p>
            )}

            {!isLoading && error && (
                <div className="focus-statistics-error" role="alert">
                    <p>{error}</p>
                    <button type="button" onClick={handleRetry}>Try Again</button>
                </div>
            )}

            {!isLoading && !error && chartData.length === 0 && (
                <p className="focus-statistics-feedback">
                    No focus statistics are available yet. Complete a focus session to start tracking your study hours.
                </p>
            )}

            {!isLoading && !error && chartData.length > 0 && (
                <div
                    className="focus-statistics-chart"
                    role="img"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
                            barCategoryGap="25%"
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="#dfe9e1"
                                strokeDasharray="3 3"
                            />
                            <XAxis
                                dataKay="label"
                                tickline={false}
                                axisLine={false}
                                tick={{ fill: '#68716b', fontSize: 11 }}
                                tickMargin={10}
                                interval={0}
                            />
                            <YAxis
                                domain={[0, 'auto']}
                                allowDecimals
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#68716b', fontSize: 10 }}
                                tickFormatter={(value) => `${value}`}
                                width={42}
                            />
                            <Tooltip
                                content={<FocusChartTooltip />}
                                cursor={{ fill: '#218B4314' }}
                            />
                            <Bar
                                dataKey="focusHours"
                                name="Focus Hours"
                                fill="var(--primary-color)"
                                radius={[5, 5, 0, 0]}
                                maxBarSize={48}
                            />
                        </BarChart>
                    </ResponsiveContainer>

                </div>
            )}
        </section>
    );
}