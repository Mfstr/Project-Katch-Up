import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,             // Edit this to change number of virtual users
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    // Allow 401s by configuring failure rate to only trigger on actual server errors (5xx)
    // Or remove the http_req_failed threshold if 401 is expected behavior for unauth load testing
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