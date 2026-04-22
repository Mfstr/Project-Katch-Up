// Define the interface for the internal state
export interface TimerStatus {
    remainingSeconds: number;
    isActive: boolean;
    endTime: number | null;
}

export class PomodoroTimer {
    private endTime: number | null = null;
    private duration: number = 25 * 60 * 1000; // 25 minutes in ms
    private isActive: boolean = false;

    public start(): number | null {
        if (!this.isActive) {
            this.endTime = Date.now() + this.duration;
            this.isActive = true;
        }
        return this.endTime;
    }

    public getStatus(): TimerStatus {
        if (!this.isActive || !this.endTime) {
            return {
                remainingSeconds: Math.floor(this.duration / 1000),
                isActive: false,
                endTime: null
            };
        }

        const remainingMs = Math.max(0, this.endTime - Date.now());
        
        if (remainingMs === 0) {
            this.isActive = false;
            this.endTime = null;
        }

        return {
            remainingSeconds: Math.floor(remainingMs / 1000),
            isActive: this.isActive,
            endTime: this.endTime
        };
    }

    public reset(): void {
        this.endTime = null;
        this.isActive = false;
        this.duration = 25 * 60 * 1000;
    }
}