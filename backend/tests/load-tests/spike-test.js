import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 10 },    // Low baseline traffic
    { duration: '2s', target: 200 },   // INSTANT SPIKE to 200 users in 2 seconds!
    { duration: '15s', target: 200 },  // Hold the massive spike
    { duration: '5s', target: 10 },    // Drop back down instantly
    { duration: '10s', target: 0 },    // Recovery phase
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Allow slightly higher latency during a spike
  },
};

const BASE_URL = 'http://localhost:5050';

export default function () {
  http.get(`${BASE_URL}/api/tasks`);
  sleep(0.5);
}