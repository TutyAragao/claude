import { onRequest } from 'firebase-functions/v2/https';
import { app } from './src/app.js';

// API do River Club como uma única Cloud Function (Express por baixo).
// O Firebase Hosting reescreve /api/** para esta function (ver firebase.json).
export const api = onRequest({ region: 'us-central1', cors: true, memory: '256MiB' }, app);
