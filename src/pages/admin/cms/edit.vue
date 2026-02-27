<template>
  <view class="container">
    <view class="form-section">
      <view class="form-card">
        <view class="card-title-row">
          <text class="card-title">文章标题</text>
        </view>
        <input class="input" v-model="form.title" placeholder="请输入文章标题" />
      </view>

      <view class="form-card">
        <view class="card-title-row">
          <text class="card-title">封面图片</text>
        </view>
        <input class="input" v-model="form.coverUrl" placeholder="请输入封面图片 URL（16:9 比例最佳）" />
        <view class="preview-box" v-if="form.coverUrl">
          <text class="preview-label">封面预览：</text>
          <image class="preview-img" :src="form.coverUrl" mode="aspectFill"></image>
        </view>
      </view>

      <view class="form-card editor-card">
        <view class="card-title-row">
          <text class="card-title">Markdown 正文</text>
          <text class="hint">支持 Markdown 语法</text>
        </view>
        <textarea
          class="markdown-textarea"
          v-model="form.content"
          placeholder="支持 Markdown 语法编写文章...&#10;&#10;# 一级标题&#10;## 二级标题&#10;**加粗文字**&#10;- 列表项"
          :maxlength="-1"
        />
      </view>
    </view>

    <view class="btn-area">
      <button class="btn-publish" @click="handlePublish">发布文章</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

const form = ref({
  title: '',
  coverUrl: '',
  content: ''
});

const handlePublish = () => {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请输入文章标题', icon: 'none' });
    return;
  }
  if (!form.value.content.trim()) {
    uni.showToast({ title: '请输入正文内容', icon: 'none' });
    return;
  }

  const article = {
    title: form.value.title,
    coverUrl: form.value.coverUrl,
    content: form.value.content,
    publishTime: new Date().toISOString().slice(0, 16).replace('T', ' ')
  };

  try {
    const list = uni.getStorageSync('cms_articles') || [];
    list.unshift(article);
    uni.setStorageSync('cms_articles', list);
  } catch (e) {
    console.warn('[CMS] 保存文章失败', e);
  }

  uni.showToast({ title: '发布成功', icon: 'success' });

  setTimeout(() => {
    uni.navigateBack();
  }, 1500);
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FAFAF5;
  display: flex;
  flex-direction: column;
}

.form-section {
  flex: 1;
  padding: 30rpx;
}

.form-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
}

.editor-card {
  display: flex;
  flex-direction: column;
  min-height: 500rpx;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1B3A24;
  border-left: 8rpx solid #1565C0;
  padding-left: 16rpx;
}

.hint {
  font-size: 24rpx;
  color: #999;
}

.input {
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  width: 100%;
  box-sizing: border-box;
  background: #fafafa;
}

.markdown-textarea {
  flex: 1;
  width: 100%;
  min-height: 400rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  line-height: 1.8;
  font-family: 'Courier New', monospace;
  background: #fafafa;
  box-sizing: border-box;
}

.preview-box {
  margin-top: 20rpx;
  background: #f9f9f9;
  padding: 20rpx;
  border-radius: 12rpx;
}

.preview-label {
  font-size: 24rpx;
  color: #888;
  display: block;
  margin-bottom: 12rpx;
}

.preview-img {
  width: 100%;
  height: 320rpx;
  border-radius: 12rpx;
  background: #eee;
}

.btn-area {
  padding: 20rpx 30rpx 60rpx;
}

.btn-publish {
  background: #1565C0;
  color: white;
  border: none;
  border-radius: 16rpx;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  font-weight: bold;
  width: 100%;
}
</style>
