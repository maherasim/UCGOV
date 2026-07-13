import axios from 'axios';
import { APP_BASE_PATH } from '../utils/basePath';

const client = axios.create({
    baseURL: window.location.origin + APP_BASE_PATH,
    withCredentials: true,
    withXSRFToken: true,
    headers: {
        Accept: 'application/json',
    },
});

export async function ensureCsrfCookie() {
    await client.get('/sanctum/csrf-cookie');
}

export default client;
