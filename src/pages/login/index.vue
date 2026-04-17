<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">循果环生</text>
      <text class="hero-subtitle">柑橘果肉废弃物回收协同平台</text>
      <text class="hero-hint">登录后可进入对应角色工作台</text>
    </view>

    <view class="card">
      <view class="tabs">
        <view class="tab" :class="{ active: mode === 'login' }" @click="switchMode('login')">账号登录</view>
        <view class="tab" :class="{ active: mode === 'register' }" @click="switchMode('register')">手机号注册</view>
      </view>

      <view v-if="mode === 'login'" class="form">
        <view class="field">
          <text class="label">用户名或手机号</text>
          <input v-model.trim="loginForm.username" class="input" placeholder="请输入用户名或手机号" />
        </view>
        <view class="field">
          <text class="label">登录密码</text>
          <input v-model="loginForm.password" class="input" type="password" password placeholder="请输入密码" />
        </view>

        <button class="submit-btn" :loading="submitting" @click="submitLogin">登录并进入</button>
      </view>

      <view v-else class="form">
        <view class="field">
          <text class="label">手机号</text>
          <input v-model.trim="registerForm.phone" class="input" maxlength="11" placeholder="请输入手机号" />
        </view>

        <view class="field">
          <text class="label">验证码</text>
          <view class="otp-row">
            <input v-model.trim="registerForm.otp" class="input otp-input" maxlength="6" placeholder="请输入验证码" />
            <button class="otp-btn" :disabled="otpCountdown > 0 || otpSending" @click="requestOtp">
              {{ otpCountdown > 0 ? `${otpCountdown}s` : '获取验证码' }}
            </button>
          </view>
        </view>

        <view class="field">
          <text class="label">真实姓名/企业名称</text>
          <input v-model.trim="registerForm.fullName" class="input" placeholder="用于业务展示，可后续修改" />
        </view>

        <view class="field">
          <text class="label">登录密码</text>
          <input v-model="registerForm.password" class="input" type="password" password placeholder="8-16位，含字母和数字" />
        </view>

        <view class="field">
          <text class="label">确认密码</text>
          <input v-model="registerForm.confirmPassword" class="input" type="password" password placeholder="请再次输入密码" />
        </view>

        <view class="field">
          <text class="label">注册身份</text>
          <view class="role-group">
            <view
              v-for="item in roleOptions"
              :key="item.value"
              class="role-item"
              :class="{ selected: registerForm.role === item.value }"
              @click="registerForm.role = item.value"
            >
              <text>{{ item.label }}</text>
            </view>
          </view>
        </view>

        <view class="agree-row" @click="registerForm.agreementAccepted = !registerForm.agreementAccepted">
          <view class="checkbox" :class="{ checked: registerForm.agreementAccepted }">{{ registerForm.agreementAccepted ? '✓' : '' }}</view>
          <text class="agree-text">我已阅读并同意平台服务协议与隐私政策</text>
        </view>

        <button class="submit-btn" :loading="submitting" @click="submitRegister">注册并登录</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import request from '@/utils/request';

const TOKEN_KEY = 'agri_auth_token';
const ROLE_KEY = 'current_role';
const NAME_KEY = 'current_user_name';
const PHONE_KEY = 'current_user_phone';

const roleOptions = [
  { label: '农户', value: 'farmer', apiRole: 'farmer' },
  { label: '回收商', value: 'merchant', apiRole: 'recycler' },
  { label: '处理商', value: 'processor', apiRole: 'processor' }
];

const mode = ref('login');
const submitting = ref(false);
const otpSending = ref(false);
const otpCountdown = ref(0);

let otpTimer = null;

const loginForm = ref({
  username: '',
  password: ''
});

const registerForm = ref({
  phone: '',
  otp: '',
  fullName: '',
  password: '',
  confirmPassword: '',
  role: 'farmer',
  agreementAccepted: true
});

const normalizeClientRole = (role) => (role === 'recycler' ? 'merchant' : role);

const routeByRole = (role) => {
  const normalizedRole = normalizeClientRole(role);
  if (normalizedRole === 'farmer') return '/pages/farmer/dashboard/index';
  if (normalizedRole === 'merchant') return '/pages/merchant/dashboard/index';
  if (normalizedRole === 'processor') return '/pages/processor/dashboard/index';
  if (normalizedRole === 'admin') return '/pages/admin/dashboard/index';
  return '/pages/index/index';
};

const clearOtpTimer = () => {
  if (otpTimer) {
    clearInterval(otpTimer);
    otpTimer = null;
  }
};

const startOtpCountdown = (seconds = 60) => {
  clearOtpTimer();
  otpCountdown.value = seconds;
  otpTimer = setInterval(() => {
    otpCountdown.value -= 1;
    if (otpCountdown.value <= 0) {
      clearOtpTimer();
      otpCountdown.value = 0;
    }
  }, 1000);
};

const switchMode = (nextMode) => {
  mode.value = nextMode;
};

const validatePhone = (phone) => /^1[3-9]\d{9}$/.test(phone);

const persistSession = (me, token) => {
  const normalizedRole = normalizeClientRole(me.role || 'farmer');
  uni.setStorageSync(TOKEN_KEY, token);
  uni.setStorageSync(ROLE_KEY, normalizedRole);
  uni.setStorageSync(NAME_KEY, me.full_name || me.username || '用户');
  uni.setStorageSync(PHONE_KEY, me.phone || '');
};

const finalizeLogin = async (payload) => {
  if (!payload || !payload.token) {
    throw new Error('登录响应异常，缺少 token');
  }

  uni.setStorageSync(TOKEN_KEY, payload.token);

  let me = null;
  try {
    me = await request.get('/api/me');
  } catch (e) {
    me = {
      role: payload.role,
      full_name: payload.full_name,
      username: payload.username,
      phone: payload.phone
    };
  }

  persistSession(me || {}, payload.token);

  uni.showToast({ title: '登录成功', icon: 'success' });
  setTimeout(() => {
    uni.reLaunch({ url: routeByRole(me?.role || payload.role) });
  }, 280);
};

const requestOtp = async () => {
  if (otpCountdown.value > 0 || otpSending.value) return;

  if (!validatePhone(registerForm.value.phone)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' });
    return;
  }

  otpSending.value = true;
  try {
    await request.post('/api/auth/request-otp', { phone: registerForm.value.phone });
    uni.showToast({ title: '验证码已发送', icon: 'success' });
    startOtpCountdown(60);
  } catch (e) {
    // toast 已由 request.js 处理
  } finally {
    otpSending.value = false;
  }
};

const submitLogin = async () => {
  const { username, password } = loginForm.value;
  if (!username || !password) {
    uni.showToast({ title: '请填写账号和密码', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    const data = await request.post('/api/login', { username, password });
    await finalizeLogin(data);
  } catch (e) {
    // toast 已由 request.js 处理
  } finally {
    submitting.value = false;
  }
};

const submitRegister = async () => {
  const form = registerForm.value;
  if (!validatePhone(form.phone)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' });
    return;
  }
  if (!form.otp || form.otp.length < 4) {
    uni.showToast({ title: '请输入验证码', icon: 'none' });
    return;
  }
  if (!form.password) {
    uni.showToast({ title: '请输入密码', icon: 'none' });
    return;
  }
  if (form.password !== form.confirmPassword) {
    uni.showToast({ title: '两次输入密码不一致', icon: 'none' });
    return;
  }
  if (!form.agreementAccepted) {
    uni.showToast({ title: '请先同意服务协议', icon: 'none' });
    return;
  }

  const selectedRole = roleOptions.find(item => item.value === form.role) || roleOptions[0];

  submitting.value = true;
  try {
    const data = await request.post('/api/auth/register-phone', {
      phone: form.phone,
      otp: form.otp,
      password: form.password,
      role: selectedRole.apiRole,
      full_name: form.fullName || null,
      agreementAccepted: true
    });
    await finalizeLogin(data);
  } catch (e) {
    // toast 已由 request.js 处理
  } finally {
    submitting.value = false;
  }
};

onLoad((query) => {
  if (query && query.type === 'register') {
    mode.value = 'register';
  }
});

onUnload(() => {
  clearOtpTimer();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(160deg, #fdf8ef 0%, #f1f8ef 58%, #eef7f9 100%);
  padding: 36rpx;
  box-sizing: border-box;
}

.hero {
  margin: 36rpx 10rpx 28rpx;
}

.hero-title {
  display: block;
  font-size: 52rpx;
  font-weight: 700;
  color: #1f4a2f;
  letter-spacing: 2rpx;
}

.hero-subtitle {
  display: block;
  margin-top: 12rpx;
  color: #365f45;
  font-size: 26rpx;
}

.hero-hint {
  display: block;
  margin-top: 10rpx;
  color: #7a5a2e;
  font-size: 22rpx;
}

.card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 28rpx;
  padding: 28rpx 26rpx 34rpx;
  box-shadow: 0 18rpx 46rpx rgba(31, 62, 42, 0.1);
}

.tabs {
  display: flex;
  background: #f3f6f2;
  border-radius: 20rpx;
  padding: 8rpx;
  margin-bottom: 24rpx;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 14rpx 10rpx;
  font-size: 27rpx;
  color: #58715f;
  border-radius: 14rpx;
  font-weight: 600;
}

.tab.active {
  background: linear-gradient(135deg, #2c7d3e 0%, #3e9651 100%);
  color: #ffffff;
  box-shadow: 0 6rpx 16rpx rgba(46, 125, 50, 0.35);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.label {
  font-size: 24rpx;
  color: #2b4634;
  font-weight: 600;
}

.input {
  height: 84rpx;
  border-radius: 16rpx;
  border: 2rpx solid #dbe7dd;
  background: #ffffff;
  padding: 0 22rpx;
  font-size: 28rpx;
  color: #22352a;
  box-sizing: border-box;
}

.otp-row {
  display: flex;
  gap: 14rpx;
}

.otp-input {
  flex: 1;
}

.otp-btn {
  width: 200rpx;
  border-radius: 16rpx;
  border: none;
  background: linear-gradient(135deg, #ef8b2e, #ea6f1a);
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
}

.otp-btn[disabled] {
  opacity: 0.55;
}

.role-group {
  display: flex;
  gap: 12rpx;
}

.role-item {
  flex: 1;
  text-align: center;
  height: 74rpx;
  line-height: 74rpx;
  border-radius: 14rpx;
  font-size: 25rpx;
  color: #54705c;
  border: 2rpx solid #d6e2d8;
  background: #f8fbf8;
}

.role-item.selected {
  color: #ffffff;
  border-color: #2f7f42;
  background: linear-gradient(135deg, #2f7f42, #4a9d5c);
}

.agree-row {
  display: flex;
  align-items: center;
  margin-top: 6rpx;
}

.checkbox {
  width: 34rpx;
  height: 34rpx;
  border-radius: 8rpx;
  border: 2rpx solid #b8c9bc;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 22rpx;
  margin-right: 12rpx;
  background: #fff;
}

.checkbox.checked {
  background: #2f7f42;
  border-color: #2f7f42;
}

.agree-text {
  font-size: 23rpx;
  color: #567061;
}

.submit-btn {
  margin-top: 10rpx;
  border-radius: 16rpx;
  height: 88rpx;
  line-height: 88rpx;
  border: none;
  background: linear-gradient(135deg, #1f6e34 0%, #2f8845 55%, #3a9f52 100%);
  color: #ffffff;
  font-size: 29rpx;
  font-weight: 700;
  box-shadow: 0 12rpx 26rpx rgba(33, 122, 58, 0.28);
}
</style>