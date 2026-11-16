// Backend address (laptop Wi-Fi / hotspot IPv4 from ipconfig).
// Keep ngrok headers in case we switch back to a tunnel URL.
export const API_URL = 'http://172.20.10.3:8000';

export const API_HEADERS = {
  'ngrok-skip-browser-warning': 'true',
};
