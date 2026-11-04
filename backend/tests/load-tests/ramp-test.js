import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },   // Warm-up
    { duration: '20s', target: 100 },  // Gradual ramp-up to 100 users
    { duration: '30s', target: 100 },  // Hold steady
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = 'http://localhost:5050';

export default function () {
  const resTasks = http.get(`${BASE_URL}/api/tasks`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  check(resTasks, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}