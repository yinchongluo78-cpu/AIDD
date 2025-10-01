<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click="handleClose">
      <div class="modal-container" @click.stop>
        <!-- 弹窗头部 -->
        <div class="modal-header">
          <h3>个人资料</h3>
          <button class="close-btn" @click="handleClose">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
            </svg>
          </button>
        </div>

        <!-- 弹窗内容 -->
        <div class="modal-body">
          <!-- 头像选择区域 -->
          <div class="avatar-section">
            <!-- 当前头像 -->
            <div class="current-avatar-wrapper">
              <div class="current-avatar" :style="{ background: currentAvatar }">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <!-- 脸部轮廓 -->
                  <circle cx="100" cy="85" r="45" fill="white" opacity="0.9"/>
                  <!-- 眼睛 -->
                  <circle cx="90" cy="75" r="4" fill="#333"/>
                  <circle cx="110" cy="75" r="4" fill="#333"/>
                  <!-- 嘴巴 -->
                  <path d="M88 95 Q100 105 112 95" stroke="#333" stroke-width="2" fill="none"/>
                  <!-- 身体 -->
                  <ellipse cx="100" cy="150" rx="35" ry="40" fill="white" opacity="0.9"/>
                </svg>
              </div>
            </div>

            <!-- 头像网格 -->
            <div class="avatar-grid">
              <div
                v-for="(avatar, index) in avatars"
                :key="index"
                class="avatar-item"
                :class="{ selected: selectedAvatar === avatar.gradient }"
                @click="selectAvatar(avatar.gradient)"
              >
                <div class="avatar-preview" :style="{ background: avatar.gradient }">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <!-- 根据不同的人物类型渲染 -->
                    <g v-if="avatar.type === 'person1'">
                      <!-- 圆脸人物 -->
                      <circle cx="100" cy="85" r="45" fill="white" opacity="0.9"/>
                      <circle cx="90" cy="75" r="4" fill="#333"/>
                      <circle cx="110" cy="75" r="4" fill="#333"/>
                      <path d="M88 95 Q100 105 112 95" stroke="#333" stroke-width="2" fill="none"/>
                      <ellipse cx="100" cy="150" rx="35" ry="40" fill="white" opacity="0.9"/>
                    </g>
                    <g v-else-if="avatar.type === 'person2'">
                      <!-- 戴帽子的人物 -->
                      <ellipse cx="100" cy="60" rx="50" ry="25" fill="white" opacity="0.8"/>
                      <circle cx="100" cy="85" r="40" fill="white" opacity="0.9"/>
                      <circle cx="92" cy="78" r="3" fill="#333"/>
                      <circle cx="108" cy="78" r="3" fill="#333"/>
                      <circle cx="100" cy="92" r="2" fill="#333"/>
                      <ellipse cx="100" cy="150" rx="32" ry="38" fill="white" opacity="0.9"/>
                    </g>
                    <g v-else-if="avatar.type === 'person3'">
                      <!-- 长发人物 -->
                      <ellipse cx="100" cy="70" rx="55" ry="35" fill="white" opacity="0.7"/>
                      <circle cx="100" cy="85" r="38" fill="white" opacity="0.9"/>
                      <circle cx="93" cy="80" r="3" fill="#333"/>
                      <circle cx="107" cy="80" r="3" fill="#333"/>
                      <path d="M92 95 Q100 100 108 95" stroke="#333" stroke-width="2" fill="none"/>
                      <ellipse cx="100" cy="150" rx="30" ry="35" fill="white" opacity="0.9"/>
                    </g>
                    <g v-else-if="avatar.type === 'person4'">
                      <!-- 方脸人物 -->
                      <rect x="60" y="50" width="80" height="70" rx="15" fill="white" opacity="0.9"/>
                      <circle cx="85" cy="75" r="4" fill="#333"/>
                      <circle cx="115" cy="75" r="4" fill="#333"/>
                      <rect x="92" y="88" width="16" height="4" rx="2" fill="#333"/>
                      <ellipse cx="100" cy="150" rx="38" ry="42" fill="white" opacity="0.9"/>
                    </g>
                    <g v-else-if="avatar.type === 'person5'">
                      <!-- 戴眼镜的人物 -->
                      <circle cx="100" cy="85" r="42" fill="white" opacity="0.9"/>
                      <circle cx="85" cy="75" r="12" fill="none" stroke="white" stroke-width="3"/>
                      <circle cx="115" cy="75" r="12" fill="none" stroke="white" stroke-width="3"/>
                      <line x1="97" y1="75" x2="103" y2="75" stroke="white" stroke-width="3"/>
                      <circle cx="85" cy="75" r="3" fill="#333"/>
                      <circle cx="115" cy="75" r="3" fill="#333"/>
                      <path d="M90 100 Q100 108 110 100" stroke="#333" stroke-width="2" fill="none"/>
                      <ellipse cx="100" cy="150" rx="33" ry="38" fill="white" opacity="0.9"/>
                    </g>
                    <g v-else>
                      <!-- 卷发人物 -->
                      <circle cx="80" cy="65" r="15" fill="white" opacity="0.7"/>
                      <circle cx="100" cy="60" r="18" fill="white" opacity="0.7"/>
                      <circle cx="120" cy="65" r="15" fill="white" opacity="0.7"/>
                      <circle cx="100" cy="85" r="35" fill="white" opacity="0.9"/>
                      <circle cx="92" cy="80" r="3" fill="#333"/>
                      <circle cx="108" cy="80" r="3" fill="#333"/>
                      <ellipse cx="100" cy="95" rx="8" ry="4" fill="#333" opacity="0.6"/>
                      <ellipse cx="100" cy="150" rx="28" ry="35" fill="white" opacity="0.9"/>
                    </g>
                  </svg>
                </div>
                <div v-if="selectedAvatar === avatar.gradient" class="check-mark">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#ffd700"/>
                    <path d="M6 10l2.5 2.5L14 7" stroke="#000" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- 基本信息表单 -->
          <div class="form-section">
            <h4>基本信息</h4>
            <div class="form-grid">
              <div class="form-item">
                <label>昵称</label>
                <input v-model="userForm.nickname" placeholder="请输入昵称" />
              </div>
              <div class="form-item">
                <label>年龄</label>
                <input v-model.number="userForm.age" type="number" placeholder="请输入年龄" />
              </div>
              <div class="form-item">
                <label>年级</label>
                <select v-model="userForm.grade">
                  <option value="">请选择年级</option>
                  <option value="小学一年级">小学一年级</option>
                  <option value="小学二年级">小学二年级</option>
                  <option value="小学三年级">小学三年级</option>
                  <option value="小学四年级">小学四年级</option>
                  <option value="小学五年级">小学五年级</option>
                  <option value="小学六年级">小学六年级</option>
                  <option value="初中一年级">初中一年级</option>
                  <option value="初中二年级">初中二年级</option>
                  <option value="初中三年级">初中三年级</option>
                  <option value="高中一年级">高中一年级</option>
                  <option value="高中二年级">高中二年级</option>
                  <option value="高中三年级">高中三年级</option>
                </select>
              </div>
              <div class="form-item">
                <label>省市</label>
                <input v-model="userForm.location" placeholder="请输入省市" />
              </div>
              <div class="form-item">
                <label>联系方式</label>
                <input v-model="userForm.phone" placeholder="请输入手机号" />
              </div>
            </div>
          </div>
        </div>

        <!-- 弹窗底部 -->
        <div class="modal-footer">
          <button class="btn-cancel" @click="handleClose">取消</button>
          <button class="btn-save" @click="handleSave" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import api from '../api'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'saved': []
}>()

const saving = ref(false)

// 默认头像
const defaultAvatar = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'

// 6个抽象卡通人物头像
const avatars = [
  {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    type: 'person1'
  },
  {
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    type: 'person2'
  },
  {
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    type: 'person3'
  },
  {
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    type: 'person4'
  },
  {
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    type: 'person5'
  },
  {
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    type: 'person6'
  }
]

// 用户表单数据
const userForm = ref({
  nickname: '',
  age: null as number | null,
  grade: '',
  location: '',
  phone: '',
  avatar: defaultAvatar
})

// 选中的头像
const selectedAvatar = ref(defaultAvatar)

// 当前头像
const currentAvatar = computed(() => selectedAvatar.value || defaultAvatar)

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    const response = await api.get('/users/profile')
    const userData = response.data
    userForm.value = {
      nickname: userData.name || '',
      age: userData.age || null,
      grade: userData.grade || '',
      location: userData.location || '',
      phone: userData.phone || '',
      avatar: userData.avatar || defaultAvatar
    }
    selectedAvatar.value = userData.avatar || defaultAvatar
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

// 选择头像
const selectAvatar = (gradient: string) => {
  selectedAvatar.value = gradient
}

// 监听弹窗显示状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    fetchUserInfo()
  }
})

// 关闭弹窗
const handleClose = () => {
  emit('update:visible', false)
}

// 保存用户资料
const handleSave = async () => {
  saving.value = true
  try {
    await api.put('/users/profile', {
      name: userForm.value.nickname,
      age: userForm.value.age,
      grade: userForm.value.grade,
      location: userForm.value.location,
      phone: userForm.value.phone,
      avatar: selectedAvatar.value
    })

    // 更新本地存储
    const userInfo = {
      avatar: selectedAvatar.value,
      nickname: userForm.value.nickname,
      age: userForm.value.age,
      grade: userForm.value.grade,
      location: userForm.value.location
    }
    localStorage.setItem('userInfo', JSON.stringify(userInfo))

    emit('saved')
    handleClose()
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败，请重试')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-container {
  background: linear-gradient(145deg, #1a1a1d 0%, #2d2d30 100%);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 16px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(255, 215, 0, 0.1);
  color: #ffffff;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.05) 0%, transparent 100%);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.modal-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.avatar-section {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.current-avatar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.current-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.1);
  border: 2px solid rgba(255, 215, 0, 0.3);
}

.current-avatar svg {
  width: 60px;
  height: 60px;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  flex: 1;
}

.avatar-item {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s;
}

.avatar-item:hover {
  transform: scale(1.05);
}

.avatar-item.selected {
  transform: scale(1.1);
}

.avatar-preview {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.avatar-item.selected .avatar-preview {
  border-color: #ffd700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.4);
}

.avatar-preview svg {
  width: 45px;
  height: 45px;
}

.check-mark {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: rgba(26, 26, 29, 0.9);
  border-radius: 50%;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.form-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
  color: #ffd700;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  font-size: 13px;
  color: rgba(255, 215, 0, 0.8);
  font-weight: 500;
}

.form-item input,
.form-item select {
  padding: 10px 12px;
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.form-item input:focus,
.form-item select:focus {
  outline: none;
  border-color: #ffd700;
  box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.1);
  background: rgba(255, 255, 255, 0.08);
}

.form-item input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.form-item select {
  cursor: pointer;
}

.form-item select option {
  background: #2d2d30;
  color: #ffffff;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 215, 0, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.btn-cancel,
.btn-save {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.btn-save {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #000;
  font-weight: 600;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .modal-container {
    width: 95%;
    max-height: 90vh;
  }

  .avatar-section {
    flex-direction: column;
    align-items: center;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>