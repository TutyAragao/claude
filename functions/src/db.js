import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializa o Admin SDK uma única vez. Em produção usa as credenciais do
// ambiente das Functions; no emulador conecta via FIRESTORE_EMULATOR_HOST.
if (!getApps().length) initializeApp();

export const db = getFirestore();
export const col = (name) => db.collection(name);

// IDs numéricos auto-incrementais (preservam o contrato da API que o frontend
// já consome). Mantidos num contador transacional por coleção.
export async function nextId(name) {
  const ref = db.collection('_counters').doc(name);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = (snap.exists ? snap.data().next : 0) + 1;
    tx.set(ref, { next });
    return next;
  });
}

// Lê uma coleção inteira (uso em agregações — escala de home game).
export async function readAll(name) {
  const snap = await col(name).get();
  return snap.docs.map((d) => d.data());
}

// Documento por id numérico.
export async function getDoc(name, id) {
  const snap = await col(name).doc(String(id)).get();
  return snap.exists ? snap.data() : null;
}
