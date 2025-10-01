<template>
  <div class="avatar-selector">
    <h3 class="title">选择头像</h3>
    <div class="avatar-grid">
      <div
        v-for="(avatar, index) in avatars"
        :key="index"
        class="avatar-item"
        :class="{ selected: modelValue === avatar }"
        @click="selectAvatar(avatar)"
      >
        <div class="avatar-wrapper">
          <div class="avatar" :style="{ background: avatar }">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="35" r="15" fill="white" opacity="0.9"/>
              <ellipse cx="50" cy="70" rx="25" ry="20" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <div v-if="modelValue === avatar" class="check-mark">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="#4CAF50"/>
              <path d="M6 10l2.5 2.5L14 7" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

// 6个渐变色系统头像
const avatars = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // 紫色渐变
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // 粉红渐变
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // 蓝色渐变
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // 绿色渐变
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // 橙粉渐变
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'  // 深蓝渐变
]

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectAvatar = (avatar: string) => {
  emit('update:modelValue', avatar)
}
</script>

<style scoped>
.avatar-selector {
  padding: 20px;
}

.title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 20px;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  max-width: 360px;
}

.avatar-item {
  cursor: pointer;
  transition: transform 0.2s;
}

.avatar-item:hover {
  transform: scale(1.05);
}

.avatar-item.selected {
  transform: scale(1.1);
}

.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s;
}

.avatar svg {
  width: 40px;
  height: 40px;
}

.check-mark {
  position: absolute;
  bottom: 0;
  right: 0;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>