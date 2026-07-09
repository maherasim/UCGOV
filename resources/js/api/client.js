import axios from 'axios';

const client = axios.create({
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
