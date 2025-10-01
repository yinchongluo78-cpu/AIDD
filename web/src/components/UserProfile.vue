<template>
  <div class="profile-overlay" @click.self="$emit('close')">
    <div class="profile-modal">
      <div class="profile-header">
        <h2>个人信息</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="profile-content">
        <div class="avatar-section">
          <img :src="form.avatar || '/default-avatar.png'" alt="头像" />
          <button class="change-avatar-btn">更换头像</button>
        </div>

        <form @submit.prevent="saveProfile">
          <div class="form-group">
            <label>姓名</label>
            <input v-model="form.name" type="text" placeholder="请输入姓名" />
          </div>

          <div class="form-group">
            <label>年龄</label>
            <input v-model.number="form.age" type="number" placeholder="请输入年龄" min="1" max="100" />
          </div>

          <div class="form-group">
            <label>年级</label>
            <select v-model="form.grade">
              <option value="">请选择年级</option>
              <option value="小学一年级">小学一年级</option>
              <option value="小学二年级">小学二年级</option>
              <option value="小学三年级">小学三年级</option>
              <option value="小学四年级">小学四年级</option>
              <option value="小学五年级">小学五年级</option>
              <option value="小学六年级">小学六年级</option>
              <option value="初一">初一</option>
              <option value="初二">初二</option>
              <option value="初三">初三</option>
              <option value="高一">高一</option>
              <option value="高二">高二</option>
              <option value="高三">高三</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div class="form-group">
            <label>手机号</label>
            <input v-model="form.phone" type="tel" placeholder="请输入手机号" pattern="[0-9]{11}" />
          </div>

          <div class="button-group">
            <button type="button" class="cancel-btn" @click="$emit('close')">取消</button>
            <button type="submit" class="save-btn">保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

const emit = defineEmits(['close'])

const form = ref({
  name: '',
  age: null,
  grade: '',
  phone: '',
  avatar: ''
})

const loadProfile = async () => {
  try {
    const response = await api.get('/users/profile')
    Object.assign(form.value, response.data)
  } catch (error) {
    console.error('加载个人信息失败', error)
  }
}

const saveProfile = async () => {
  try {
    await api.put('/users/profile', form.value)

    // 更新本地存储
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    Object.assign(user, form.value)
    localStorage.setItem('user', JSON.stringify(user))

    alert('保存成功')
    emit('close')
  } catch (error) {
    console.error('保存失败', error)
    alert('保存失败，请重试')
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.profile-modal {
  background: white;
  border-radius: 10px;
  width: 500px;
  max-width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.profile-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-header h2 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
}

.profile-content {
  padding: 30px;
}

.avatar-section {
  text-align: center;
  margin-bottom: 30px;
}

.avatar-section img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin-bottom: 15px;
}

.change-avatar-btn {
  padding: 8px 16px;
  background: #f0f0f0;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s;
}

.change-avatar-btn:hover {
  background: #e0e0e0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #666;
  font-size: 14px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 30px;
}

.cancel-btn,
.save-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s;
}

.cancel-btn {
  background: #f0f0f0;
  color: #666;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.save-btn {
  background: #667eea;
  color: white;
}

.save-btn:hover {
  background: #5a67d8;
}
</style>