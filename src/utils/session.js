import request from '@/utils/request';

const TOKEN_KEY = 'agri_auth_token';
const ROLE_KEY = 'current_role';
const NAME_KEY = 'current_user_name';
const PHONE_KEY = 'current_user_phone';

export const normalizeClientRole = (role) => (role === 'recycler' ? 'merchant' : role);

export const roleAllowed = (actualRole, expectedRole, allowAdmin = true) => {
  const actual = normalizeClientRole(actualRole);
  const expected = normalizeClientRole(expectedRole);
  if (allowAdmin && actual === 'admin') return true;
  return actual === expected;
};

export const clearSessionStorage = () => {
  uni.removeStorageSync(TOKEN_KEY);
  uni.removeStorageSync(ROLE_KEY);
  uni.removeStorageSync(NAME_KEY);
  uni.removeStorageSync(PHONE_KEY);
};

export const syncSessionFromServer = async () => {
  const me = await request.get('/api/me');
  if (!me || !me.role) {
    throw new Error('用户信息无效');
  }

  const normalizedRole = normalizeClientRole(me.role);
  const normalizedMe = { ...me, role: normalizedRole };

  uni.setStorageSync(ROLE_KEY, normalizedRole);
  uni.setStorageSync(NAME_KEY, me.full_name || me.username || '用户');
  uni.setStorageSync(PHONE_KEY, me.phone || '');

  return normalizedMe;
};
