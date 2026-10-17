import { api } from './client';

export function login(username, password) {
  return api.post('/auth/login', { username, password }).then((res) => res.data);
}

export function logout() {
  return api.post('/auth/logout').then((res) => res.data);
}

export function me() {
  return api.get('/auth/me').then((res) => res.data);
}
