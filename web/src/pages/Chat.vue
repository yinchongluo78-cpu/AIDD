<template>
  <div v-if="isAuthenticated">
    <AppLayout @show-profile="showProfileModal = true">
    <!-- 个人资料弹窗 -->
    <ProfileModal v-model:visible="showProfileModal" @saved="onProfileSaved" @restart-tutorial="handleRestartTutorial" />

    <div class="chat-container">
      <!-- 左侧对话列表 -->
      <aside class="chat-sidebar">
        <div class="sidebar-header">
          <button class="new-chat-btn" @click="createNewChat">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
            </svg>
            新对话
          </button>
        </div>

        <div class="chat-list">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            :class="['chat-item', { active: conv.id === currentConversationId }]"
            @click="selectConversation(conv.id)"
            @contextmenu.prevent="showContextMenu($event, conv)"
          >
            <div class="chat-item-content">
              <span class="chat-title">{{ conv.title || '新对话' }}</span>
              <span class="chat-time">{{ formatTime(conv.createdAt) }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- 主聊天区域 -->
      <div class="chat-main">
        <!-- 自定义指令状态栏 -->
        <div v-if="currentConversationId" class="instructions-bar">
          <div v-if="conversations.find(c => c.id === currentConversationId)?.customInstructions" class="instructions-status active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>已启用自定义指令</span>
            <button class="instructions-btn" @click="openInstructionsModal">修改</button>
          </div>
          <div v-else class="instructions-status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>使用默认模式</span>
            <button class="instructions-btn" @click="openInstructionsModal">设置指令</button>
          </div>
        </div>

        <div class="messages-container" ref="messagesContainer">
          <div
            v-for="msg in currentMessages"
            :key="msg.id"
            :class="['message', msg.role]"
          >
            <div class="message-avatar">
              <div v-if="msg.role === 'user'" class="user-avatar-msg" :style="{ background: userAvatar }">
                <svg v-if="!userInfo.avatar" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="35" r="15" fill="white" opacity="0.9"/>
                  <ellipse cx="50" cy="70" rx="25" ry="20" fill="white" opacity="0.9"/>
                </svg>
              </div>
              <div v-else class="ai-avatar">AI</div>
            </div>
            <div class="message-content">
              <div v-if="msg.imageUrl" class="message-image">
                <div class="image-wrapper" @click="openImageModal(msg.imageUrl)">
                  <img :src="msg.imageUrl" alt="用户上传的图片" loading="lazy" @error="handleImageError" />
                  <div class="image-overlay">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="white"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div v-if="msg.fileInfo" class="message-file">
                <div class="file-icon">
                  <svg v-if="msg.fileInfo.type === 'pdf'" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8L14 2zm-1 7V3.5L18.5 9H13z" fill="#ff4444"/>
                  </svg>
                  <svg v-else-if="msg.fileInfo.type === 'md' || msg.fileInfo.type === 'markdown'" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8L14 2zm-1 7V3.5L18.5 9H13z" fill="#ffd700"/>
                  </svg>
                  <svg v-else-if="msg.fileInfo.type === 'txt'" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8L14 2zm-1 7V3.5L18.5 9H13z" fill="#4CAF50"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="24" height="24">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8L14 2zm-1 7V3.5L18.5 9H13z" fill="#9E9E9E"/>
                  </svg>
                </div>
                <div class="file-details">
                  <div class="file-name">{{ msg.fileInfo.name }}</div>
                  <div class="file-meta">{{ msg.fileInfo.size }}</div>
                </div>
              </div>
              <div class="message-text">
                <!-- 用户消息：只处理换行，不进行数学公式渲染 -->
                <span v-if="msg.role === 'user'" v-html="msg.content.replace(/\n/g, '<br>')"></span>
                <!-- AI消息：流式传输中和完成后都进行完整的格式化处理 -->
                <span v-else v-html="formatMessage(msg.content)"></span>
                <span v-if="msg.isStreaming" class="typing-cursor">▊</span>
              </div>
            </div>
          </div>

          <!-- 加载动画 - 只在没有流式消息时显示 -->
          <div v-if="isLoading && !currentMessages.some(m => m.isStreaming)" class="message assistant">
            <div class="message-avatar">
              <div class="ai-avatar">AI</div>
            </div>
            <div class="message-content">
              <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-container">
          <div class="input-wrapper">
            <!-- 知识库选择器 -->
            <KnowledgeSelector ref="knowledgeSelector" @change="handleKnowledgeChange" />

            <div class="input-tools">
              <input
                type="file"
                ref="imageInput"
                accept="image/*"
                style="display: none"
                @change="handleImageUpload"
              />
              <button class="tool-btn" @click="handleImageButtonClick" title="上传图片">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
                </svg>
              </button>
              


              <input
                type="file"
                ref="docInput"
                accept=".txt,.pdf,.md,.markdown,.doc,.docx,.csv,.json,.xml"
                style="display: none"
                @change="handleDocUpload"
              />
              <div class="doc-upload-dropdown">
                <button class="tool-btn" @click="toggleDocMenu" title="上传文档">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M14,8V3.5L18.5,8H14Z" fill="currentColor"/>
                  </svg>
                  <svg viewBox="0 0 24 24" width="12" height="12" class="dropdown-arrow">
                    <path d="M7 10l5 5 5-5z" fill="currentColor"/>
                  </svg>
                </button>
                <div v-if="showDocMenu" class="dropdown-menu">
                  <div class="menu-item" @click="uploadNewDocument">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
                    </svg>
                    上传新文档
                  </div>
                  <div class="menu-item" @click="selectFromKnowledgeBase">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="currentColor"/>
                    </svg>
                    从知识库选择
                  </div>
                </div>
              </div>

              <!-- AI模型选择按钮 -->
              <button class="model-text-btn" @click="showModelSelector = true">
                {{ selectedAIModel === 'deepseek' ? 'DeepSeek' : 'GPT-5' }}
              </button>
            </div>

            <div v-if="uploadedImage" class="upload-preview image-preview">
              <div class="image-preview-wrapper">
                <img :src="uploadedImage.preview" alt="图片预览" />
                <div v-if="uploadedImage.uploading" class="upload-loading">
                  <div class="spinner"></div>
                </div>
                <button class="remove-btn" @click.stop="uploadedImage = null">✕</button>
              </div>
            </div>

            <div v-if="uploadedDoc" class="upload-preview doc-preview">
              <div class="doc-info">
                <svg viewBox="0 0 24 24" width="32" height="32">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M14,8V3.5L18.5,8H14Z" fill="#FFD700"/>
                </svg>
                <div class="doc-details">
                  <div class="doc-name">{{ uploadedDoc.name }}</div>
                  <div class="doc-size">{{ uploadedDoc.size }}</div>
                </div>
              </div>
              <button class="remove-btn" @click="uploadedDoc = null">✕</button>
            </div>

            <div class="input-box">
              <textarea
                v-model="inputMessage"
                @keydown.enter.prevent="handleEnter"
                placeholder="输入消息，支持 Shift+Enter 换行"
                rows="1"
              ></textarea>
              <!-- 停止生成按钮（生成时显示） -->
              <button v-if="isGenerating" class="stop-btn" @click="stopGeneration" title="停止生成">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
                </svg>
              </button>
              <!-- 发送按钮（未生成时显示） -->
              <button v-else class="send-btn" @click="sendMessage" :disabled="!inputMessage.trim()" title="发送消息">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右键菜单 -->
      <div
        v-if="contextMenu.show"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click="contextMenu.show = false"
      >
        <div class="menu-item" @click="renameConversation">重命名</div>
        <div class="menu-item danger" @click="deleteConversation">删除</div>
      </div>

      <!-- 图片预览模态框 -->
      <div v-if="imageModalUrl" class="image-modal-overlay" @click="closeImageModal">
        <div class="image-modal-content" @click.stop>
          <button class="modal-close-btn" @click="closeImageModal">✕</button>
          <img :src="imageModalUrl" alt="图片预览" />
        </div>
      </div>

      <!-- AI模型选择弹窗 -->
      <transition name="modal-fade">
        <div v-if="showModelSelector" class="modal-overlay" @click.self="showModelSelector = false">
          <div class="model-selector-modal">
            <div class="modal-header">
              <h3>🤖 选择AI模型</h3>
              <button class="close-btn" @click="showModelSelector = false">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                </svg>
              </button>
            </div>

            <div class="model-options" style="padding: 28px; display: flex; flex-direction: column; gap: 18px;">
              <!-- DeepSeek选项 -->
              <div
                class="model-btn deepseek-btn"
                :class="{ selected: selectedAIModel === 'deepseek' }"
                @click="selectModel('deepseek')"
                @mouseenter="$event.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; $event.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.8)'; $event.currentTarget.style.boxShadow = selectedAIModel === 'deepseek' ? '0 0 0 3px rgba(255, 215, 0, 0.2), 0 12px 32px rgba(255, 215, 0, 0.5)' : '0 8px 20px rgba(255, 215, 0, 0.4)'"
                @mouseleave="$event.currentTarget.style.transform = 'translateY(0) scale(1)'; $event.currentTarget.style.borderColor = selectedAIModel === 'deepseek' ? 'rgba(255, 215, 0, 0.7)' : 'rgba(255, 215, 0, 0.4)'; $event.currentTarget.style.boxShadow = selectedAIModel === 'deepseek' ? '0 0 0 3px rgba(255, 215, 0, 0.15), 0 8px 24px rgba(255, 215, 0, 0.35)' : '0 4px 12px rgba(0, 0, 0, 0.3)'"
                :style="{
                  padding: '24px 28px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: selectedAIModel === 'deepseek' ? '2px solid rgba(255, 215, 0, 0.7)' : '2px solid rgba(255, 215, 0, 0.4)',
                  background: selectedAIModel === 'deepseek' ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(255, 237, 78, 0.15) 100%)' : 'linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 237, 78, 0.06) 100%)',
                  boxShadow: selectedAIModel === 'deepseek' ? '0 0 0 3px rgba(255, 215, 0, 0.15), 0 8px 24px rgba(255, 215, 0, 0.35)' : '0 4px 12px rgba(0, 0, 0, 0.3)'
                }"
              >
                <h4 :style="{ fontSize: '20px', fontWeight: '700', margin: '0 0 10px 0', color: '#ffd700', letterSpacing: '0.5px', transition: 'all 0.2s ease' }">DeepSeek</h4>
                <p :style="{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.75)', margin: '0', lineHeight: '1.6', transition: 'all 0.2s ease' }">快速响应 • 中文优化 • 日常对话</p>
              </div>

              <!-- GPT-5选项 -->
              <div
                class="model-btn gpt-btn"
                :class="{ selected: selectedAIModel === 'gpt5' }"
                @click="selectModel('gpt5')"
                @mouseenter="$event.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; $event.currentTarget.style.borderColor = 'rgba(16, 163, 127, 0.8)'; $event.currentTarget.style.boxShadow = selectedAIModel === 'gpt5' ? '0 0 0 3px rgba(16, 163, 127, 0.2), 0 12px 32px rgba(16, 163, 127, 0.5)' : '0 8px 20px rgba(16, 163, 127, 0.4)'"
                @mouseleave="$event.currentTarget.style.transform = 'translateY(0) scale(1)'; $event.currentTarget.style.borderColor = selectedAIModel === 'gpt5' ? 'rgba(16, 163, 127, 0.7)' : 'rgba(16, 163, 127, 0.4)'; $event.currentTarget.style.boxShadow = selectedAIModel === 'gpt5' ? '0 0 0 3px rgba(16, 163, 127, 0.15), 0 8px 24px rgba(16, 163, 127, 0.35)' : '0 4px 12px rgba(0, 0, 0, 0.3)'"
                :style="{
                  padding: '24px 28px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: selectedAIModel === 'gpt5' ? '2px solid rgba(16, 163, 127, 0.7)' : '2px solid rgba(16, 163, 127, 0.4)',
                  background: selectedAIModel === 'gpt5' ? 'linear-gradient(135deg, rgba(16, 163, 127, 0.25) 0%, rgba(16, 163, 127, 0.15) 100%)' : 'linear-gradient(135deg, rgba(16, 163, 127, 0.12) 0%, rgba(16, 163, 127, 0.06) 100%)',
                  boxShadow: selectedAIModel === 'gpt5' ? '0 0 0 3px rgba(16, 163, 127, 0.15), 0 8px 24px rgba(16, 163, 127, 0.35)' : '0 4px 12px rgba(0, 0, 0, 0.3)'
                }"
              >
                <h4 :style="{ fontSize: '20px', fontWeight: '700', margin: '0 0 10px 0', color: '#10a37f', letterSpacing: '0.5px', transition: 'all 0.2s ease' }">GPT-5</h4>
                <p :style="{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.75)', margin: '0', lineHeight: '1.6', transition: 'all 0.2s ease' }">顶尖模型 • 推理能力强 • 复杂任务</p>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- 上传文档到知识库弹窗 -->
      <div v-if="showKnowledgeBaseModal" class="modal-overlay" @click.self="showKnowledgeBaseModal = false">
        <div class="kb-modal">
          <div class="modal-header">
            <h3>选择知识库分类</h3>
            <button class="close-btn" @click="showKnowledgeBaseModal = false">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="modal-content">
            <div v-if="categories.length === 0" class="empty-categories">
              <p>暂无分类，请先在知识库页面创建分类</p>
              <button class="create-category-btn" @click="goToKnowledgeBase">
                前往知识库
              </button>
            </div>
            <div v-else class="category-list">
              <div
                v-for="category in categories"
                :key="category.id"
                class="category-item"
                :class="{ selected: selectedCategoryId === category.id }"
                @click="selectedCategoryId = category.id"
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="currentColor"/>
                </svg>
                <span>{{ category.name }}</span>
                <span class="doc-count">{{ category.documentCount || 0 }}</span>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn" @click="showKnowledgeBaseModal = false">取消</button>
            <button
              class="modal-btn primary"
              :disabled="!selectedCategoryId"
              @click="uploadToKnowledgeBase"
            >
              上传到知识库
            </button>
          </div>
        </div>
      </div>

      <!-- 从知识库选择文档弹窗 -->
      <div v-if="showDocumentSelectModal" class="modal-overlay" @click.self="showDocumentSelectModal = false">
        <div class="kb-modal">
          <div class="modal-header">
            <h3>从知识库选择文档</h3>
            <button class="close-btn" @click="showDocumentSelectModal = false">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="modal-content">
            <!-- 分类选择器 -->
            <div class="category-selector">
              <select v-model="selectedViewCategoryId" @change="loadCategoryDocuments">
                <option value="">选择分类</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }} ({{ cat.documentCount || 0 }})
                </option>
              </select>
            </div>
            <!-- 文档列表 -->
            <div v-if="categoryDocuments.length > 0" class="document-list">
              <div
                v-for="doc in categoryDocuments"
                :key="doc.id"
                class="document-item"
                :class="{ selected: selectedDocumentId === doc.id }"
                @click="selectedDocumentId = doc.id"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z" fill="currentColor"/>
                </svg>
                <div class="doc-info">
                  <div class="doc-name">{{ doc.name }}</div>
                  <div class="doc-meta">{{ formatFileSize(doc.size) }} · {{ formatDate(doc.createdAt) }}</div>
                </div>
              </div>
            </div>
            <div v-else-if="selectedViewCategoryId" class="empty-documents">
              <p>该分类下暂无文档</p>
            </div>
            <div v-else class="empty-documents">
              <p>请选择一个分类查看文档</p>
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn" @click="showDocumentSelectModal = false">取消</button>
            <button
              class="modal-btn primary"
              :disabled="!selectedDocumentId"
              @click="applyDocumentToChat"
            >
              应用到对话
            </button>
          </div>
        </div>
      </div>

      <!-- 自定义指令弹窗 -->
      <Teleport to="body">
        <div v-if="showInstructionsModal" class="modal-overlay" @click="showInstructionsModal = false">
          <div class="modal-container instructions-modal" @click.stop>
            <div class="modal-header">
              <h3>设置对话指令</h3>
              <button class="close-btn" @click="showInstructionsModal = false">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="instructions-input-wrapper">
                <label>自定义指令（可选）</label>
                <textarea
                  v-model="currentInstructions"
                  placeholder="例如：你是我的初中数学 AI 学习教练，基于人教版五四学制数学八年级上册，结合福建中考考情，帮助我高效预习、练习与反思..."
                  rows="10"
                ></textarea>
                <p class="hint">设置后，AI 将在本对话中按照你的指令行为</p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="modal-btn" @click="clearInstructions">清除指令</button>
              <button class="modal-btn primary" @click="saveInstructions">保存</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- 用户信息弹窗 -->
      <UserProfile v-if="showUserProfile" @close="showUserProfile = false" />
    </div>
    </AppLayout>

    <!-- 新手引导组件 -->
    <TutorialGuide
      :is-active="isActive"
      :current-step="currentStep"
      :current-steps="currentSteps"
      @next-step="nextStep"
      @prev-step="prevStep"
      @skip-tutorial="skipTutorial"
      @complete-tutorial="handleCompleteTutorial"
    />
  </div>
  <div v-else-if="shouldRedirect" class="auth-redirect">
    <p>正在跳转到登录页面...</p>
  </div>
</template>

<script setup lang="ts">
// 🔥🔥🔥 版本标记 - 2025-11-15 12:05 - 移除默认选中第一条对话 🔥🔥🔥
console.log('%c🔥 Chat.vue 已加载 - 版本: 2025-11-15-14:05 🎉 🔥', 'color: #ff6b6b; font-size: 16px; font-weight: bold;')
console.log('%c移除默认选中第一条对话，用户主动点击才高亮', 'color: #4ecdc4; font-size: 14px;')

import { ref, computed, onMounted, onActivated, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import UserProfile from '../components/UserProfile.vue'
import ProfileModal from '../components/ProfileModal.vue'
import KnowledgeSelector from '../components/KnowledgeSelector.vue'
import TutorialGuide from '../components/TutorialGuide.vue'
import api from '../api'
import { useTutorial } from '../composables/useTutorial'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { renderMarkdownToHtml, containsMathFormula } from '../utils/markdown'

// Router 和 Tutorial
const router = useRouter()
const {
  isActive,
  currentStep,
  currentSteps,
  hasCompletedTutorial,
  fetchTutorialStatus,
  startFullTutorial,
  nextStep,
  prevStep,
  skipTutorial,
  completeTutorial,
  resetTutorial
} = useTutorial()

// 状态
const conversations = ref([])
const currentConversationId = ref(null)
const currentMessages = ref([])
const inputMessage = ref('')
const uploadedImage = ref(null)
const uploadedDoc = ref(null)
const imageInput = ref(null)
const showUserProfile = ref(false)
const showProfileModal = ref(false)
const messagesContainer = ref(null)
const isLoading = ref(false)
// 默认true，避免闪烁，实际权限检查在onMounted和onActivated中进行
const isAuthenticated = ref(true)

// 文档上传相关状态
const showDocMenu = ref(false)
const showKnowledgeBaseModal = ref(false)
const showDocumentSelectModal = ref(false)
const categories = ref([])
const selectedCategoryId = ref(null)
const selectedViewCategoryId = ref(null)
const selectedDocumentId = ref(null)
const categoryDocuments = ref([])
const pendingFile = ref(null)
const selectedDocuments = ref([]) // 知识库选择器选中的文档列表
const knowledgeSelector = ref(null) // KnowledgeSelector 组件引用
const imageModalUrl = ref(null) // 图片预览模态框的图片URL

// 回答完成通知相关
const originalTitle = ref('学习助手')  // 保存原始标题
let titleFlashTimer = null  // 标题闪烁定时器
const notificationPermission = ref(Notification.permission)  // 通知权限状态

// 停止生成功能相关
const abortController = ref(null)  // 用于中止流式请求

// AI模型选择相关
const showModelSelector = ref(false)  // 是否显示模型选择下拉菜单
const selectedAIModel = ref('deepseek')  // 当前选择的AI模型：'deepseek' 或 'gpt5'
const isGenerating = ref(false)  // 是否正在生成回答

// 选择模型
const selectModel = (model: string) => {
  selectedAIModel.value = model
  showModelSelector.value = false
  console.log('🤖 切换AI模型为:', model === 'deepseek' ? 'DeepSeek' : 'GPT-5')
}

// 自定义指令相关
const showInstructionsModal = ref(false)
const currentInstructions = ref('')

// 用户信息
const userInfo = computed(() => {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : {}
})
const userAvatar = computed(() => {
  const storedInfo = localStorage.getItem('userInfo')
  if (storedInfo) {
    const info = JSON.parse(storedInfo)
    return info.avatar || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }
  return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
})

const shouldRedirect = computed(() => {
  if (!isAuthenticated.value) {
    // 立即重定向到登录页
    setTimeout(() => {
      window.location.replace('/login')
    }, 0)
    return true
  }
  return false
})

// 右键菜单
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  conversation: null
})

// 方法
const createNewChat = async () => {
  try {
    const response = await api.post('/conversations')
    conversations.value.unshift(response.data)
    currentConversationId.value = response.data.id
    currentMessages.value = []
  } catch (error) {
    console.error('创建对话失败', error)
  }
}

const selectConversation = async (id: string) => {
  currentConversationId.value = id
  try {
    const response = await api.get(`/conversations/${id}/messages`)
    // 处理历史消息，提取文档信息并清理显示内容
    currentMessages.value = response.data.map(msg => {
      if (msg.role === 'user' && msg.content.includes('[文档:')) {
        // 提取文档信息
        const docMatch = msg.content.match(/\[文档: (.+?)\]/)
        if (docMatch) {
          const fileName = docMatch[1]
          // 提取原始用户输入（文档标记之前的内容）
          const originalContent = msg.content.split('\n\n[文档:')[0]

          return {
            ...msg,
            content: originalContent || `已上传文件: ${fileName}`,
            fileInfo: {
              name: fileName,
              size: '已上传',
              type: fileName.split('.').pop() || 'unknown'
            },
            isStreaming: false
          }
        }
      } else if (msg.role === 'assistant') {
        // 对AI消息进行清理，移除旧的占位符
        let cleanContent = msg.content
        
        // 检查是否包含占位符
        const hasPlaceholders = /MATH_PLACEHOLDER_\d+|MATHBLOCK\d+|MATHINLINE\d+/.test(cleanContent)
        
        if (hasPlaceholders) {
          console.log('发现历史消息包含占位符，进行清理:', msg.id)
          
          // 清理所有类型的占位符
          cleanContent = cleanContent.replace(/MATH_PLACEHOLDER_\d+/g, '[数学公式]')
          cleanContent = cleanContent.replace(/MATHBLOCK\d+/g, '[数学公式]')
          cleanContent = cleanContent.replace(/MATHINLINE\d+/g, '[数学公式]')
          
          // 清理可能的HTML标签残留
          cleanContent = cleanContent.replace(/<div class="math-block">\s*<\/div>/g, '[数学公式]')
          cleanContent = cleanContent.replace(/<span class="math-inline">\s*<\/span>/g, '[数学公式]')
        }
        
        // 如果内容仍然包含数学公式，重新处理
        if (cleanContent.includes('$')) {
          console.log('重新处理历史AI消息中的数学公式')
          try {
            cleanContent = formatMessage(cleanContent)
          } catch (error) {
            console.error('重新处理历史消息失败:', error)
          }
        }
        
        return {
          ...msg,
          content: cleanContent,
          isStreaming: false // 确保历史消息不是流式状态
        }
      }
      return {
        ...msg,
        isStreaming: false // 确保所有历史消息都不是流式状态
      }
    })
    scrollToBottom()
  } catch (error) {
    console.error('加载消息失败', error)
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() && !uploadedImage.value && !uploadedDoc.value) return
  if (isLoading.value) return

  // 检查图片是否还在上传中
  if (uploadedImage.value?.uploading) {
    alert('图片正在上传中，请稍候...')
    return
  }

  // 检查选中的文档是否有正在解析中的
  const pendingDocs = selectedDocuments.value.filter(doc => doc.status === 'pending')
  if (pendingDocs.length > 0) {
    const docNames = pendingDocs.map(d => d.filename).join('、')
    const confirmSend = confirm(`⚠️ 以下文档正在后台解析中：\n\n${docNames}\n\n文档解析通常需要10-30秒。\n\n选项：\n- 点击"确定"：现在发送消息（AI将无法引用这些文档）\n- 点击"取消"：等待文档解析完成后再发送\n\n建议：等待文档解析完成后再发送，以获得更准确的回答。`)

    if (!confirmSend) {
      return // 用户选择等待
    }
  }

  const sanitizedInput = sanitizeLocalFileReferences(inputMessage.value)
  let userInput = sanitizedInput
  const imageUrl = uploadedImage.value?.url
  const imagePreview = uploadedImage.value?.preview // 保存本地预览URL
  let fileInfo = null

  // 如果有上传的文档，显示文件信息，但不读取内容（改为使用知识库检索）
  if (uploadedDoc.value) {
    fileInfo = {
      name: uploadedDoc.value.name,
      size: uploadedDoc.value.size,
      type: uploadedDoc.value.type
    }
  }

  // 添加用户消息 - 显示原始输入文字和文件图标，不显示文件内容
  const userContent = sanitizedInput || (fileInfo ? `已上传文件: ${fileInfo.name}` : '')
  currentMessages.value.push({
    id: Date.now(),
    role: 'user',
    content: userContent, // 用户消息不需要格式化处理
    imageUrl: imagePreview || imageUrl, // 优先使用本地预览，这样图片能立即显示
    fileInfo,
    createdAt: new Date()
  })

  // 清空输入
  inputMessage.value = ''
  uploadedImage.value = null
  uploadedDoc.value = null
  scrollToBottom()

  // 添加 AI 消息占位
  const assistantMessageId = Date.now() + 1
  currentMessages.value.push({
    id: assistantMessageId,
    role: 'assistant',
    content: '',
    createdAt: new Date(),
    isStreaming: true
  })
  isLoading.value = true
  isGenerating.value = true  // 标记开始生成

  try {
    // 创建新的 AbortController
    abortController.value = new AbortController()

    const token = localStorage.getItem('token')
    const requestBody = {
      content: userInput,
      imageUrl,
      categoryId: selectedViewCategoryId.value, // 兼容旧逻辑
      documentIds: selectedDocuments.value.map(doc => doc.id), // 发送选中的文档ID数组
      model: selectedAIModel.value // 添加模型选择参数
    }
    console.log('📤 发送请求到后端:', requestBody)
    console.log('🤖 使用AI模型:', selectedAIModel.value)

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/conversations/${currentConversationId.value}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody),
      signal: abortController.value.signal  // 添加 signal 以支持中止
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            if (dataStr.trim()) {
              try {
                const data = JSON.parse(dataStr)

                if (data.type === 'user_message') {
                  // 忽略用户消息确认（已经在前端添加了）
                  console.log('收到用户消息确认')
                } else if (data.type === 'stream') {
                  // 🔥 流式更新内容 - 直接操作数组元素触发Vue响应式
                  console.log('收到流式内容:', data.content)
                  const msgIndex = currentMessages.value.findIndex(m => m.id === assistantMessageId)
                  if (msgIndex !== -1) {
                    const cleanedContent = cleanHtmlTags(data.content)
                    // 直接修改数组元素的属性，Vue 3会自动追踪
                    currentMessages.value[msgIndex].content += cleanedContent
                    // 立即滚动到底部，让用户看到实时更新
                    nextTick(() => scrollToBottom())
                  }
                } else if (data.type === 'done') {
                  console.log('流式传输完成')
                  // 更新消息状态
                  const msgIndex = currentMessages.value.findIndex(m => m.id === assistantMessageId)
                  if (msgIndex !== -1) {
                    // 流式传输完成，更新ID和时间戳
                    if (data.data) {
                      currentMessages.value[msgIndex].id = data.data.id
                      currentMessages.value[msgIndex].createdAt = data.data.createdAt
                    }
                    // 设置为非流式状态，模板会自动调用formatMessage处理数学公式
                    currentMessages.value[msgIndex].isStreaming = false

                    // 确保数学公式正确渲染
                    nextTick(() => {
                      console.log('流式传输完成，数学公式渲染')
                      scrollToBottom()
                    })

                    // 触发回答完成通知
                    notifyResponseComplete()

                    // 重置生成状态
                    isGenerating.value = false
                    abortController.value = null
                  }

                  // 如果是新对话，更新对话列表
                  const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
                  if (currentConv && currentConv.title === '新对话') {
                    setTimeout(async () => {
                      const convResponse = await api.get('/conversations')
                      conversations.value = convResponse.data
                    }, 1000)
                  }
                } else if (data.type === 'error') {
                  const msgIndex = currentMessages.value.findIndex(m => m.id === assistantMessageId)
                  if (msgIndex !== -1) {
                    currentMessages.value[msgIndex].content = data.message || '抱歉，发生错误。'
                    currentMessages.value[msgIndex].isStreaming = false
                  }
                }
              } catch (e) {
                console.error('解析数据错误:', e)
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('发送消息失败', error)

    // 检查是否是用户主动中止
    if (error.name === 'AbortError') {
      console.log('请求已被用户中止')
      // 不显示错误信息，stopGeneration 已经处理了
    } else {
      const msgIndex = currentMessages.value.findIndex(m => m.id === assistantMessageId)
      if (msgIndex !== -1) {
        currentMessages.value[msgIndex].content = '抱歉，发送消息失败，请稍后重试。'
        currentMessages.value[msgIndex].isStreaming = false
      }
    }
  } finally {
    isLoading.value = false
    isGenerating.value = false  // 重置生成状态
    abortController.value = null  // 清除 controller
    scrollToBottom()
  }
}

const handleEnter = (e: KeyboardEvent) => {
  if (e.shiftKey) {
    return
  }
  sendMessage()
}

const handleKnowledgeChange = (documents: any[]) => {
  selectedDocuments.value = documents
  console.log('📚 知识库选择变更 - 选中文档数:', documents.length)
  console.log('📚 文档列表:', documents.map(d => ({ id: d.id, name: d.filename })))
}

// 图片预览模态框
const openImageModal = (url: string) => {
  imageModalUrl.value = url
}

const closeImageModal = () => {
  imageModalUrl.value = null
}

// 图片加载失败处理
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.error('图片加载失败:', img.src)
  // 可以设置一个默认图片或显示错误提示
}
const sanitizeLocalFileReferences = (text: string) => {
  if (!text) return ""

  const patterns = [
    /file:\/\/[^\n"'<>]+/gi,
    /\/var\/folders\/[^\n"'<>]+/gi,
    /\/private\/var\/folders\/[^\n"'<>]+/gi,
    /\/Users\/[^\n"'<>]+/gi
  ]

  let sanitized = text
  patterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, "[本地文件路径已隐藏]")
  })

  return sanitized
}

// 清理AI输出中的HTML标签，但保留数学公式
const cleanHtmlTags = (content: string) => {
  if (!content) return ''
  
  // 先保护数学公式
  const mathProtection = new Map()
  let protectionIndex = 0
  
  // 保护块级数学公式 $$...$$
  content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
    const placeholder = `MATH_PROTECT_BLOCK_${protectionIndex++}`
    mathProtection.set(placeholder, match)
    return placeholder
  })
  
  // 保护行内数学公式 $...$
  content = content.replace(/\$([^$\n\r]+?)\$/g, (match) => {
    const placeholder = `MATH_PROTECT_INLINE_${protectionIndex++}`
    mathProtection.set(placeholder, match)
    return placeholder
  })
  
  // 清理HTML标签 - 使用更全面的方法
  // 先清理所有HTML标签，但保留内容
  content = content.replace(/<\/?[^>]+(>|$)/g, '')
  
  // 清理HTML实体
  content = content.replace(/&nbsp;/g, ' ')
  content = content.replace(/&lt;/g, '<')
  content = content.replace(/&gt;/g, '>')
  content = content.replace(/&amp;/g, '&')
  content = content.replace(/&quot;/g, '"')
  content = content.replace(/&#39;/g, "'")
  
  // 清理多余的空行
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n')
  
  // 恢复数学公式
  mathProtection.forEach((originalMath, placeholder) => {
    content = content.replace(placeholder, originalMath)
  })
  
  return content
}



// 文档上传相关方法
const toggleDocMenu = () => {
  showDocMenu.value = !showDocMenu.value
}

// 上传新文档
const uploadNewDocument = () => {
  showDocMenu.value = false

  // 先让用户选择文件
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = '.txt,.pdf,.md,.markdown,.doc,.docx,.csv,.json,.xml'
  fileInput.onchange = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    // 限制文件大小（50MB）
    if (file.size > 50 * 1024 * 1024) {
      alert('文件大小不能超过50MB')
      return
    }

    // 保存文件到临时状态
    pendingFile.value = file

    // 加载知识库分类
    try {
      const response = await api.get('/kb/categories')
      categories.value = response.data
      showKnowledgeBaseModal.value = true
    } catch (error) {
      console.error('加载分类失败', error)
      alert('加载知识库分类失败，请重试')
    }
  }
  fileInput.click()
}

// 从知识库选择文档
const selectFromKnowledgeBase = async () => {
  showDocMenu.value = false

  try {
    // 加载分类列表
    const response = await api.get('/kb/categories')
    categories.value = response.data
    showDocumentSelectModal.value = true
  } catch (error) {
    console.error('加载分类失败', error)
    alert('加载知识库分类失败，请重试')
  }
}

// 加载分类下的文档
const loadCategoryDocuments = async () => {
  if (!selectedViewCategoryId.value) {
    categoryDocuments.value = []
    return
  }

  try {
    const response = await api.get(`/kb/categories/${selectedViewCategoryId.value}/documents`)
    categoryDocuments.value = response.data
  } catch (error) {
    console.error('加载文档失败', error)
    alert('加载文档失败，请重试')
  }
}

// 将选中的文档应用到对话
const applyDocumentToChat = async () => {
  const selectedDoc = categoryDocuments.value.find(d => d.id === selectedDocumentId.value)
  if (!selectedDoc) return

  try {
    // 获取文档内容 - 使用正确的URL格式
    const fullUrl = selectedDoc.url.startsWith('http') ? selectedDoc.url : `${window.location.origin}${selectedDoc.url}`
    const response = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const text = await response.text()

    // 创建文件对象以便 sendMessage 能读取内容
    const blob = new Blob([text], { type: selectedDoc.type || 'text/plain' })
    const file = new File([blob], selectedDoc.name, { type: selectedDoc.type || 'text/plain' })

    // 安全地获取文件类型
    let fileType = 'unknown'
    if (selectedDoc.type) {
      fileType = selectedDoc.type.split('/').pop() || 'unknown'
    } else if (selectedDoc.name) {
      fileType = selectedDoc.name.split('.').pop() || 'unknown'
    }

    // 设置为当前文档
    uploadedDoc.value = {
      name: selectedDoc.name,
      type: fileType,
      size: formatFileSize(selectedDoc.size),
      file: file
    }

    // 关闭弹窗
    showDocumentSelectModal.value = false
    selectedViewCategoryId.value = null
    selectedDocumentId.value = null
    categoryDocuments.value = []

    // 提示用户
    alert('文档已添加，请输入消息开始对话')
  } catch (error) {
    console.error('加载文档内容失败:', error)
    alert('加载文档内容失败，请重试')
  }
}

const goToKnowledgeBase = () => {
  showKnowledgeBaseModal.value = false
  // 跳转到知识库页面
  window.location.href = '/kb'
}

// 上传文档到知识库并应用到对话
const uploadToKnowledgeBase = async () => {
  if (!selectedCategoryId.value || !pendingFile.value) {
    console.error('缺少必要参数:', {
      categoryId: selectedCategoryId.value,
      file: pendingFile.value?.name
    })
    alert('请选择分类和文件')
    return
  }

  console.log('开始上传文档到知识库:', {
    fileName: pendingFile.value.name,
    fileSize: pendingFile.value.size,
    fileType: pendingFile.value.type,
    categoryId: selectedCategoryId.value
  })

  try {
    // 步骤1: 上传文件到存储服务
    console.log('步骤1: 上传文件到存储服务...')
    const formData = new FormData()
    formData.append('document', pendingFile.value)

    const uploadResponse = await api.post('/upload/document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 300000 // 5分钟超时，支持大文件上传
    })

    console.log('文件上传成功:', uploadResponse.data)

    // 步骤2: 创建文档记录
    console.log('步骤2: 创建文档记录...')
    const docData = {
      name: uploadResponse.data.name,
      type: uploadResponse.data.type,
      url: uploadResponse.data.url,
      size: uploadResponse.data.size,
      categoryId: selectedCategoryId.value
    }

    console.log('准备创建文档记录:', docData)
    const docResponse = await api.post('/kb/documents', docData)
    console.log('文档记录创建成功:', docResponse.data)

    // 保存分类名称用于提示
    const categoryName = categories.value.find(c => c.id === selectedCategoryId.value)?.name || '未知'

    // 将新上传的文档添加到选择列表
    // 使用后端返回的 docResponse.data，它已经包含了完整的文档信息
    const newDocument = {
      id: docResponse.data.id,
      filename: docResponse.data.filename,
      fileSize: docResponse.data.fileSize || docResponse.data.size,
      status: docResponse.data.status || 'pending',
      categoryId: docResponse.data.categoryId
    }

    // 通过 KnowledgeSelector 组件的方法添加到已选择文档列表
    console.log('准备调用 KnowledgeSelector.addDocument, knowledgeSelector.value:', knowledgeSelector.value)
    console.log('新文档数据:', newDocument)

    if (knowledgeSelector.value) {
      try {
        await knowledgeSelector.value.addDocument(newDocument)
        console.log('已通过组件方法将文档添加到选择列表')
      } catch (error) {
        console.error('调用 addDocument 失败:', error)
        // 即使失败也继续执行，不中断用户流程
      }
    } else {
      console.warn('KnowledgeSelector 组件引用不可用，DOM 可能还未渲染')
      // 作为备选方案，直接添加到 selectedDocuments
      selectedDocuments.value.push(newDocument)
      console.log('已直接添加到 selectedDocuments')
    }

    // 清理状态
    showKnowledgeBaseModal.value = false
    selectedCategoryId.value = null
    pendingFile.value = null

    console.log('知识库上传流程完成')

    // 显示成功提示
    alert(`✅ 文档已成功上传并选中！

📄 文档名称：${uploadResponse.data.name}
📁 所属分类：${categoryName}

⏳ 文档正在后台解析中（约需10-30秒）...

💡 您现在可以直接开始对话！
文档解析完成后，AI 将能够引用文档内容进行回答。`)
  } catch (error) {
    console.error('上传到知识库失败详细信息:', {
      error: error,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    })

    let errorMessage = '上传到知识库失败'
    if (error.response?.data?.message) {
      errorMessage += ': ' + error.response.data.message
    } else if (error.message) {
      errorMessage += ': ' + error.message
    }

    alert(errorMessage)
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const handleImageButtonClick = () => {
  console.log('图片上传按钮被点击')
  console.log('imageInput ref:', imageInput.value)

  if (imageInput.value) {
    // 重置 input 的 value，确保可以重复选择同一个文件
    imageInput.value.value = ''
    console.log('触发文件选择器')
    imageInput.value.click()
  } else {
    console.error('imageInput ref 未找到')
  }
}

const handleImageUpload = async (e: Event) => {
  console.log('文件选择器触发，事件:', e)
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  console.log('选择的文件:', file)
  if (!file) return

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件')
    return
  }

  // 限制文件大小（5MB）
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过5MB')
    return
  }

  try {
    // 创建本地预览URL
    const preview = URL.createObjectURL(file)

    // 先设置预览，标记为上传中
    uploadedImage.value = {
      preview,
      uploading: true
    }

    // 创建FormData
    const formData = new FormData()
    formData.append('image', file)

    // 上传图片
    const response = await api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    // 更新上传的图片信息
    uploadedImage.value = {
      url: response.data.url,
      preview,
      name: response.data.name,
      size: formatFileSize(response.data.size),
      type: response.data.type,
      uploading: false
    }

    console.log('图片上传成功:', uploadedImage.value)
  } catch (error) {
    console.error('图片上传失败:', error)
    let errorMessage = '图片上传失败'
    if (error.response?.data?.message) {
      errorMessage += ': ' + error.response.data.message
    } else if (error.message) {
      errorMessage += ': ' + error.message
    }
    alert(errorMessage)
  }
}

const handleDocUpload = async (e: Event) => {
  const file = e.target.files[0]
  if (!file) return

  // 限制文件大小（100MB）
  if (file.size > 100 * 1024 * 1024) {
    alert('文件大小不能超过100MB')
    return
  }

  // 格式化文件大小显示
  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB'
    } else {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }
  }

  // 安全地获取文件类型
  let fileType = 'unknown'
  if (file.type) {
    fileType = file.type.split('/').pop() || 'unknown'
  } else if (file.name) {
    const ext = file.name.split('.').pop()
    fileType = ext || 'unknown'
  }

  uploadedDoc.value = {
    name: file.name,
    size: formatFileSize(file.size),
    type: fileType,
    file: file
  }
}

// 读取文件内容的辅助函数
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      resolve(content)
    }
    reader.onerror = (error) => {
      reject(error)
    }
    reader.readAsText(file, 'UTF-8')
  })
}

const showContextMenu = (e: MouseEvent, conv: any) => {
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    conversation: conv
  }
}

const renameConversation = async () => {
  const newTitle = prompt('请输入新的对话标题', contextMenu.value.conversation.title)
  if (!newTitle || newTitle === contextMenu.value.conversation.title) return

  try {
    await api.put(`/conversations/${contextMenu.value.conversation.id}`, {
      title: newTitle
    })

    const conv = conversations.value.find(c => c.id === contextMenu.value.conversation.id)
    if (conv) {
      conv.title = newTitle
    }
  } catch (error) {
    console.error('重命名失败', error)
    alert('重命名失败，请重试')
  }
}

const deleteConversation = async () => {
  if (!confirm('确定删除这个对话吗？')) return

  try {
    await api.delete(`/conversations/${contextMenu.value.conversation.id}`)
    conversations.value = conversations.value.filter(c => c.id !== contextMenu.value.conversation.id)

    if (currentConversationId.value === contextMenu.value.conversation.id) {
      if (conversations.value.length > 0) {
        selectConversation(conversations.value[0].id)
      } else {
        createNewChat()
      }
    }
  } catch (error) {
    console.error('删除对话失败', error)
    alert('删除失败，请重试')
  }
}

// 自定义指令相关函数
const openInstructionsModal = () => {
  const currentConv = conversations.value.find(c => c.id === currentConversationId.value)
  currentInstructions.value = currentConv?.customInstructions || ''
  showInstructionsModal.value = true
}

const saveInstructions = async () => {
  // 如果当前没有选中对话，自动选择第一个对话
  if (!currentConversationId.value) {
    console.log('当前没有选中对话，尝试自动选择...')
    console.log('对话列表长度:', conversations.value?.length || 0)
    console.log('对话列表内容:', conversations.value)

    if (conversations.value && conversations.value.length > 0 && conversations.value[0]?.id) {
      // 自动选择第一个对话
      currentConversationId.value = conversations.value[0].id
      console.log('已自动选择第一个对话:', currentConversationId.value)
    } else {
      // 如果没有任何对话，创建一个新对话
      console.log('没有有效对话，创建新对话...')
      try {
        await createNewChat()
        console.log('新对话已创建:', currentConversationId.value)

        // 等待一下确保对话创建完成
        if (!currentConversationId.value) {
          throw new Error('对话创建后ID仍然为空')
        }
      } catch (error) {
        console.error('创建新对话失败:', error)
        alert('保存失败：无法创建对话，请刷新页面后重试')
        return
      }
    }
  }

  // 再次确认对话ID存在
  if (!currentConversationId.value) {
    console.error('无法获取有效的对话ID')
    alert('保存失败：无法获取对话ID，请刷新页面后重试')
    return
  }

  try {
    console.log('开始保存自定义指令...')
    console.log('对话ID:', currentConversationId.value)
    console.log('指令内容:', currentInstructions.value)

    const response = await api.put(`/conversations/${currentConversationId.value}`, {
      customInstructions: currentInstructions.value || null
    })

    console.log('保存成功，服务器返回:', response.data)

    // 更新本地对话列表
    const conv = conversations.value.find(c => c.id === currentConversationId.value)
    if (conv) {
      conv.customInstructions = currentInstructions.value || null
      console.log('已更新本地对话列表')
    }

    showInstructionsModal.value = false

    // 如果保存的是当前对话的指令，显示提示
    if (currentInstructions.value) {
      alert('✅ 自定义指令已保存\n\n该指令将作为系统提示词，在本对话的每次交互中自动生效。')
    } else {
      alert('✅ 自定义指令已清除')
    }
  } catch (error: any) {
    console.error('保存指令失败:', error)
    console.error('错误详情:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    alert(`保存失败：${error.response?.data?.message || error.message || '请重试'}`)
  }
}

const clearInstructions = async () => {
  currentInstructions.value = ''
  await saveInstructions()
}

const formatTime = (time: string) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 86400000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }
}

// 配置 marked
marked.use({
  breaks: true,
  gfm: true,
  sanitize: false,  // 不要清理HTML
  smartypants: false,  // 不要转换引号等
  silent: false,  // 显示错误
  async: false,  // 同步处理
  pedantic: false,  // 不要严格模式
  headerIds: false,  // 不要生成header ID
  mangle: false  // 不要混淆邮箱地址
})

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    }
  })
)







const formatMessage = (content: string) => {
  if (!content) return ''

  try {
    console.log('=== formatMessage 开始处理 ===')
    console.log('原始内容:', content.substring(0, 200) + '...')

    // 检测内容是否已经是HTML格式（避免重复处理）
    // 如果包含 KaTeX 渲染后的标记或其他HTML标签，说明已经被处理过
    if (content.includes('<span class="katex') ||
        content.includes('<p>') ||
        content.includes('<div>') ||
        content.includes('class="katex-html"')) {
      console.log('⚠️ 内容已经是HTML格式，跳过处理')
      return content
    }

    // 清理本地文件引用
    content = sanitizeLocalFileReferences(content)
    console.log('清理文件引用后:', content.substring(0, 200) + '...')

    // 清理AI输出中的HTML标签，但保留数学公式
    content = cleanHtmlTags(content)
    console.log('清理HTML标签后:', content.substring(0, 200) + '...')

    // 使用新的markdown渲染工具
    const result = renderMarkdownToHtml(content)
    console.log('markdown渲染结果:', result.substring(0, 200) + '...')
    console.log('=== formatMessage 处理完成 ===')

    return result
  } catch (error) {
    console.error('渲染消息失败:', error)
    return content.replace(/\n/g, '<br>')
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 回答完成通知功能
const notifyResponseComplete = () => {
  // 只在页面不可见时触发通知
  if (!document.hidden) return

  // 1. 浏览器通知
  if (notificationPermission.value === 'granted') {
    try {
      const notification = new Notification('AI 回答完成', {
        body: '点击查看回答内容',
        icon: '/favicon.ico',
        tag: 'ai-response',
        requireInteraction: false
      })
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
      // 5秒后自动关闭
      setTimeout(() => notification.close(), 5000)
    } catch (error) {
      console.error('发送通知失败:', error)
    }
  }

  // 2. 标签页标题闪烁
  flashPageTitle()
}

// 标签页标题闪烁
const flashPageTitle = () => {
  if (titleFlashTimer) {
    clearInterval(titleFlashTimer)
  }

  let count = 0
  titleFlashTimer = setInterval(() => {
    document.title = count % 2 === 0 ? '💬 新回答 | 学习助手' : originalTitle.value
    count++
    if (count >= 10) {  // 闪烁5次
      clearInterval(titleFlashTimer)
      document.title = originalTitle.value
      titleFlashTimer = null
    }
  }, 800)  // 每800ms切换一次
}

// 停止标题闪烁（用户回到页面时）
const stopTitleFlash = () => {
  if (titleFlashTimer) {
    clearInterval(titleFlashTimer)
    titleFlashTimer = null
    document.title = originalTitle.value
  }
}

// 请求通知权限
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    notificationPermission.value = permission
  }
}

// 停止生成回答
const stopGeneration = () => {
  if (abortController.value) {
    console.log('用户停止生成')
    abortController.value.abort()
    abortController.value = null
    isGenerating.value = false
    isLoading.value = false

    // 标记当前流式消息为已完成
    const streamingMsg = currentMessages.value.find(m => m.isStreaming)
    if (streamingMsg) {
      streamingMsg.isStreaming = false
      streamingMsg.content += '\n\n[已停止生成]'
    }
  }
}

// 个人资料保存后的回调
const onProfileSaved = () => {
  // 强制刷新用户信息
  window.location.reload()
}

// 处理重新查看引导
const handleRestartTutorial = async () => {
  console.log('🎯 处理重启引导事件')
  try {
    // 重置引导状态
    await resetTutorial()
    console.log('✅ 引导状态已重置')

    // 等待DOM更新
    await nextTick()

    // 启动引导
    startFullTutorial()
    console.log('🚀 引导已启动')
  } catch (error) {
    console.error('❌ 重启引导失败:', error)
  }
}

// 处理对话页引导完成，跳转到知识库页面
const handleCompleteTutorial = () => {
  console.log('🎉 对话页引导完成，准备跳转到知识库页面')
  // 完成引导
  completeTutorial()
  // 设置标记，告诉知识库页面需要启动引导
  localStorage.setItem('tutorial_from_chat', 'true')
  // 跳转到知识库页面
  router.push('/kb')
}

// 生命周期
onMounted(async () => {
  // 检查用户是否登录
  const token = localStorage.getItem('token')
  if (!token) {
    // 如果没有登录，立即停止执行并跳转到登录页
    isAuthenticated.value = false
    setTimeout(() => {
      window.location.replace('/login')
    }, 100)
    return
  }

  isAuthenticated.value = true

  try {
    // 加载对话列表
    const response = await api.get('/conversations')
    conversations.value = response.data

    // 加载知识库分类
    try {
      const catResponse = await api.get('/kb/categories')
      categories.value = catResponse.data
      console.log('知识库分类加载成功:', categories.value.length)
    } catch (error) {
      console.error('加载知识库分类失败:', error)
    }

    // 🔥 不再自动选中第一条对话，让用户主动点击选择
    // 如果没有任何对话，则创建一个新对话（但不自动选中）
    if (conversations.value.length === 0) {
      await createNewChat()
    }

    // 检查是否有待处理的文档（从知识库跳转过来）
    const pendingDocStr = localStorage.getItem('pendingDocument')
    if (pendingDocStr) {
      const pendingDoc = JSON.parse(pendingDocStr)
      localStorage.removeItem('pendingDocument')

      // 获取文档内容
      const fullUrl = pendingDoc.url.startsWith('http') ? pendingDoc.url : `${window.location.origin}${pendingDoc.url}`
      const docResponse = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (docResponse.ok) {
        const text = await docResponse.text()

        // 创建文件对象
        const blob = new Blob([text], { type: pendingDoc.type || 'text/plain' })
        const file = new File([blob], pendingDoc.name, { type: pendingDoc.type || 'text/plain' })

        // 安全地获取文件类型
        let fileType = 'unknown'
        if (pendingDoc.type) {
          fileType = pendingDoc.type.split('/').pop() || 'unknown'
        } else if (pendingDoc.name) {
          const ext = pendingDoc.name.split('.').pop()
          fileType = ext || 'unknown'
        }

        // 设置为当前文档
        uploadedDoc.value = {
          name: pendingDoc.name,
          type: fileType,
          size: formatFileSize(pendingDoc.size),
          file: file
        }

        // 提示用户
        alert(`已加载文档：${pendingDoc.name}，请输入消息开始对话`)
      }
    }

    // 启动新手引导
    await nextTick() // 等待DOM渲染完成

    // 🔥 优先检查 localStorage，确保只弹出一次
    const tutorialShown = localStorage.getItem('tutorial_shown')
    if (tutorialShown === 'true') {
      console.log('新手引导已显示过（localStorage）')
      return
    }

    await fetchTutorialStatus() // 获取引导状态

    // 如果用户还没完成引导，则启动
    if (!hasCompletedTutorial.value) {
      console.log('启动新手引导')
      startFullTutorial()
    } else {
      console.log('用户已完成新手引导')
    }
  } catch (error) {
    console.error('加载对话历史失败', error)
  }

  // 请求通知权限（首次访问时）
  requestNotificationPermission()

  // 监听页面可见性变化，停止标题闪烁
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      stopTitleFlash()
    }
  })
})

// 使用 keep-alive 时，组件激活时也要检查登录状态
onActivated(() => {
  console.log('Chat.vue 组件激活，检查登录状态...')
  const token = localStorage.getItem('token')
  if (!token) {
    console.warn('未检测到token，跳转到登录页')
    isAuthenticated.value = false
    router.replace('/login')
  } else {
    isAuthenticated.value = true
  }
})

document.addEventListener('click', () => {
  contextMenu.value.show = false
})
</script>

<style scoped>
.chat-container {
  display: flex;
  width: 100%;
  height: 100%;
  background: #0a0a0b;
  margin: 0;
  padding: 0;
}

/* 左侧边栏 */
.chat-sidebar {
  width: 260px;
  background: #0f0f10;
  border-right: 1px solid rgba(255, 215, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 15px;
}


.arrow-icon {
  opacity: 0.7;
}

.new-chat-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.new-chat-btn:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.2);
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.chat-list::-webkit-scrollbar {
  width: 6px;
}

.chat-list::-webkit-scrollbar-track {
  background: rgba(255, 215, 0, 0.05);
}

.chat-list::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.2);
  border-radius: 3px;
}

.chat-item {
  padding: 12px;
  margin-bottom: 5px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.chat-item:hover {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.1);
}

.chat-item.active {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 237, 78, 0.08) 100%);
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.1);
}

/* 新对话高亮 */
.chat-item.active .chat-title {
  color: #ffd700;
  font-weight: 500;
}

.chat-item:first-child:not(.has-messages) {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  border-color: rgba(255, 215, 0, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  }
  100% {
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
  }
}

.chat-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-time {
  font-size: 12px;
  color: rgba(255, 215, 0, 0.4);
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0a0a0b;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
  scroll-behavior: smooth;
}

.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: rgba(255, 215, 0, 0.05);
}

.messages-container::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.2);
  border-radius: 4px;
}

.message {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.user-avatar-msg {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.user-avatar-msg svg {
  width: 20px;
  height: 20px;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #0a0a0b;
  font-size: 14px;
}

.message-content {
  max-width: 70%;
  padding: 15px 20px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 215, 0, 0.1);
  backdrop-filter: blur(10px);
}

.message.user .message-content {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  border-color: rgba(255, 215, 0, 0.2);
}

.message-text {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  font-size: 14px;
}

/* 消息中的图片 */
.message-image {
  margin-bottom: 10px;
}

.message-image .image-wrapper {
  position: relative;
  display: inline-block;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.message-image .image-wrapper:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 215, 0, 0.2);
}

.message-image .image-wrapper img {
  max-width: 300px;
  max-height: 300px;
  display: block;
  border-radius: 12px;
}

.message-image .image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message-image .image-wrapper:hover .image-overlay {
  opacity: 1;
}

/* 图片预览模态框 */
.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  cursor: pointer;
  animation: fadeIn 0.2s ease;
}

.image-modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  cursor: default;
}

.image-modal-content img {
  max-width: 100%;
  max-height: 90vh;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

/* 输入区域 */
.input-container {
  border-top: 1px solid rgba(255, 215, 0, 0.1);
  background: #0f0f10;
  padding: 20px;
}

.input-wrapper {
  max-width: 900px;
  margin: 0 auto;
}

/* 知识库选择器 */
.kb-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
}

.kb-icon {
  color: rgba(255, 215, 0, 0.6);
  flex-shrink: 0;
}

.kb-select {
  flex: 1;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.kb-select:hover {
  border-color: rgba(255, 215, 0, 0.4);
  background: rgba(0, 0, 0, 0.4);
}

.kb-select:focus {
  outline: none;
  border-color: rgba(255, 215, 0, 0.6);
  box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.1);
}

.kb-select option {
  background: #1a1a1d;
  color: rgba(255, 255, 255, 0.9);
  padding: 8px;
}

.input-tools {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.tool-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.2);
  color: rgba(255, 215, 0, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.tool-btn:hover {
  background: rgba(255, 215, 0, 0.2);
  transform: scale(1.05);
}

/* AI模型文字按钮 */
.model-text-btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.2);
  color: rgba(255, 215, 0, 0.9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.model-text-btn:hover {
  background: rgba(255, 215, 0, 0.2);
  border-color: rgba(255, 215, 0, 0.4);
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}

/* 文档上传下拉菜单 */
.doc-upload-dropdown {
  position: relative;
}

.doc-upload-dropdown .tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dropdown-arrow {
  margin-left: 2px;
  transition: transform 0.2s;
}

.dropdown-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  background: linear-gradient(145deg, #1a1a1d 0%, #151518 100%);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  min-width: 160px;
  margin-bottom: 8px;
}

.dropdown-menu .menu-item {
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.dropdown-menu .menu-item:hover {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

.dropdown-menu .menu-item:first-child {
  border-radius: 7px 7px 0 0;
}

.dropdown-menu .menu-item:last-child {
  border-radius: 0 0 7px 7px;
}

/* 知识库选择弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.kb-modal {
  background: linear-gradient(145deg, #1a1a1d 0%, #151518 100%);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 16px;
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.modal-content {
  padding: 20px 24px;
  max-height: 300px;
  overflow-y: auto;
}

.empty-categories {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  padding: 20px;
}

.create-category-btn {
  margin-top: 16px;
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.create-category-btn:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  transform: translateY(-1px);
}

.category-list .category-item {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid transparent;
}

.category-list .category-item:hover {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.1);
}

.category-list .category-item.selected {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  border-color: rgba(255, 215, 0, 0.3);
}

.category-list .category-item svg {
  color: rgba(255, 215, 0, 0.6);
  flex-shrink: 0;
}

.category-list .category-item.selected svg {
  color: #ffd700;
}

.category-list .category-item span:first-of-type {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
}

.category-list .category-item.selected span:first-of-type {
  color: #ffd700;
}

.doc-count {
  background: rgba(255, 215, 0, 0.1);
  color: rgba(255, 215, 0, 0.7);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.category-list .category-item.selected .doc-count {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 215, 0, 0.1);
}

.modal-btn {
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
}

.modal-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.modal-btn.primary {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  color: #ffd700;
  border-color: rgba(255, 215, 0, 0.3);
}

.modal-btn.primary:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 237, 78, 0.15) 100%);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn.primary:disabled:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
  box-shadow: none;
  transform: none;
}

.category-selector {
  margin-bottom: 20px;
}

.category-selector select {
  width: 100%;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.category-selector select:focus {
  outline: none;
  border-color: rgba(255, 215, 0, 0.4);
}

.document-list {
  max-height: 300px;
  overflow-y: auto;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 215, 0, 0.1);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.document-item:hover {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.2);
}

.document-item.selected {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.05) 100%);
  border-color: rgba(255, 215, 0, 0.3);
}

.document-item svg {
  color: rgba(255, 215, 0, 0.6);
  flex-shrink: 0;
}

.document-item.selected svg {
  color: #ffd700;
}

.document-item .doc-info {
  flex: 1;
  min-width: 0;
}

.document-item .doc-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-item.selected .doc-name {
  color: #ffd700;
}

.document-item .doc-meta {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-top: 4px;
}

.empty-documents {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.5);
}

/* 输入框预览区域 */
.upload-preview {
  position: relative;
  margin-bottom: 10px;
  display: inline-block;
}

.upload-preview .image-preview-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.upload-preview .image-preview-wrapper:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
}

.upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.upload-preview .upload-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-preview .spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 215, 0, 0.2);
  border-top-color: #ffd700;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff4444 0%, #ff6b6b 100%);
  color: white;
  border: 2px solid #0a0a0b;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.remove-btn:hover {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8888 100%);
  transform: scale(1.1);
  box-shadow: 0 3px 6px rgba(255, 68, 68, 0.4);
}

.input-box {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.input-box textarea {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  min-height: 44px;
  max-height: 120px;
}

.input-box textarea:focus {
  outline: none;
  border-color: rgba(255, 215, 0, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  border: none;
  color: #0a0a0b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

.send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 停止生成按钮 */
.stop-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8787 100%);
  border: none;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  animation: pulse 1.5s ease-in-out infinite;
}

.stop-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(255, 107, 107, 0.5);
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 107, 107, 0);
  }
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: #1a1a1d;
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
}

.menu-item {
  padding: 10px 20px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.menu-item:hover {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

.menu-item.danger {
  color: #ff6b6b;
}

.menu-item.danger:hover {
  background: rgba(255, 107, 107, 0.1);
  color: #ff4444;
}

/* 加载动画 */
.loading-dots {
  display: flex;
  gap: 4px;
  padding: 10px 15px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffd700;
  animation: loading-bounce 1.4s infinite;
}

.loading-dots span:nth-child(1) {
  animation-delay: 0s;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.4;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* 打字光标 */
.typing-cursor {
  display: inline-block;
  color: #ffd700;
  animation: blink 1s infinite;
  font-weight: normal;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* 文档预览样式 */
.document-preview {
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.doc-icon {
  font-size: 24px;
  color: #ffd700;
}

.doc-info {
  flex: 1;
}

.doc-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.doc-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: rgba(255, 215, 0, 0.5);
}

.doc-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.doc-remove {
  background: none;
  border: none;
  color: rgba(255, 107, 107, 0.6);
  cursor: pointer;
  font-size: 20px;
  padding: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.doc-remove:hover {
  color: #ff4444;
  transform: scale(1.1);
}

/* 消息中的文件显示 */
.message-file {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
  max-width: 250px;
}

.file-icon {
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 12px;
  color: rgba(255, 215, 0, 0.6);
  margin-top: 2px;
}
.auth-redirect {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #f5f5f5;
  color: #666;
  font-size: 14px;
}

/* 自定义指令状态栏 */
.instructions-bar {
  padding: 12px 20px;
  background: rgba(255, 215, 0, 0.05);
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
}

.instructions-status {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 215, 0, 0.6);
  font-size: 14px;
}

.instructions-status.active {
  color: #ffd700;
}

.instructions-status svg {
  flex-shrink: 0;
}

.instructions-status span {
  flex: 1;
}

.instructions-btn {
  padding: 6px 16px;
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.instructions-btn:hover {
  background: rgba(255, 215, 0, 0.2);
  border-color: rgba(255, 215, 0, 0.3);
}

/* 自定义指令模态框 */
.instructions-modal {
  width: 600px;
  max-width: 90vw;
}

.instructions-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.instructions-input-wrapper label {
  color: #ffd700;
  font-size: 14px;
  font-weight: 500;
}

.instructions-input-wrapper textarea {
  width: 100%;
  padding: 12px;
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 200px;
}

.instructions-input-wrapper textarea::placeholder {
  color: rgba(255, 215, 0, 0.4);
}

.instructions-input-wrapper textarea:focus {
  outline: none;
  border-color: rgba(255, 215, 0, 0.4);
  background: rgba(255, 215, 0, 0.08);
}

.instructions-input-wrapper .hint {
  color: rgba(255, 215, 0, 0.5);
  font-size: 12px;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid rgba(255, 215, 0, 0.1);
}

/* Markdown 渲染样式 - ChatGPT风格增强 */
.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3),
.message-text :deep(h4),
.message-text :deep(h5),
.message-text :deep(h6) {
  margin: 24px 0 14px 0;  /* 从20px 0 12px 0提升到24px 0 14px 0，增加标题上下间距 */
  font-weight: 600;
  line-height: 1.5;  /* 从1.4提升到1.5 */
  color: #ffd700;
  position: relative;
}

.message-text :deep(h1) { 
  font-size: 1.8em; 
  border-bottom: 2px solid rgba(255, 215, 0, 0.3);
  padding-bottom: 8px;
}
.message-text :deep(h2) { 
  font-size: 1.5em;
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
  padding-bottom: 6px;
}
.message-text :deep(h3) { 
  font-size: 1.3em;
  position: relative;
}
.message-text :deep(h3):before {
  content: "▶";
  color: #ffd700;
  margin-right: 8px;
  font-size: 0.8em;
}

.message-text :deep(p) {
  margin: 16px 0;  /* 从12px提升到16px，增加段落间距 */
  line-height: 1.8;  /* 从1.7提升到1.8，提高可读性 */
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.3px;  /* 新增字间距，提升阅读舒适度 */
}

.message-text :deep(strong) {
  font-weight: 700;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  padding: 2px 4px;
  border-radius: 3px;
}

.message-text :deep(em) {
  font-style: italic;
  color: #87ceeb;
  background: rgba(135, 206, 235, 0.1);
  padding: 1px 3px;
  border-radius: 3px;
}

.message-text :deep(code) {
  background: rgba(255, 215, 0, 0.15);
  padding: 3px 8px;
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.2);
  font-weight: 500;
}

.message-text :deep(pre) {
  background: #1a1a1a;
  padding: 20px;
  border-radius: 12px;
  overflow-x: auto;
  margin: 16px 0;
  border: 1px solid rgba(255, 215, 0, 0.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  position: relative;
}

.message-text :deep(pre):before {
  content: "";
  position: absolute;
  top: 12px;
  left: 16px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff5f56;
  box-shadow: 20px 0 #ffbd2e, 40px 0 #27ca3f;
}

.message-text :deep(pre code) {
  background: none;
  padding: 0;
  color: #d4d4d4;
  font-size: 0.95em;
  line-height: 1.6;
  border: none;
  margin-top: 20px;
  display: block;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 16px 0;
  padding-left: 0;
}

.message-text :deep(ul) {
  list-style: none;
}

.message-text :deep(ul li) {
  position: relative;
  margin: 10px 0;  /* 从8px提升到10px，增加列表项间距 */
  padding-left: 24px;
  line-height: 1.8;  /* 从1.7提升到1.8 */
}

.message-text :deep(ul li):before {
  content: "●";
  color: #ffd700;
  position: absolute;
  left: 0;
  top: 0;
  font-size: 0.8em;
  line-height: 1.7;
}

.message-text :deep(ol) {
  counter-reset: list-counter;
  padding-left: 0;
  list-style: none;  /* 🔥 隐藏浏览器默认的列表编号 */
}

.message-text :deep(ol li) {
  position: relative;
  margin: 10px 0;  /* 从8px提升到10px，增加列表项间距 */
  padding-left: 32px;
  line-height: 1.8;  /* 从1.7提升到1.8 */
  counter-increment: list-counter;
  list-style: none;  /* 🔥 确保 li 元素也不显示默认编号 */
}

.message-text :deep(ol li):before {
  content: counter(list-counter) ".";
  color: #ffd700;
  font-weight: 600;
  position: absolute;
  left: 0;
  top: 0;
  background: rgba(255, 215, 0, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  min-width: 20px;
  text-align: center;
}

.message-text :deep(blockquote) {
  border-left: 4px solid #ffd700;
  padding: 16px 20px;
  margin: 16px 0;
  background: rgba(255, 215, 0, 0.05);
  border-radius: 0 8px 8px 0;
  color: rgba(255, 255, 255, 0.9);
  font-style: italic;
  position: relative;
}

.message-text :deep(blockquote):before {
  content: "\201C";
  font-size: 3em;
  color: rgba(255, 215, 0, 0.3);
  position: absolute;
  top: -10px;
  left: 10px;
  line-height: 1;
}

.message-text :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  table-layout: auto;
  display: table;
  max-width: 100%;
}

.message-text :deep(th),
.message-text :deep(td) {
  border: 1px solid rgba(255, 215, 0, 0.15);
  padding: 12px 16px;
  text-align: left;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 80px;
  max-width: 300px;
}

.message-text :deep(th) {
  background: rgba(255, 215, 0, 0.15);
  font-weight: 600;
  color: #ffd700;
  text-transform: uppercase;
  font-size: 0.9em;
  letter-spacing: 0.5px;
}

.message-text :deep(td) {
  background: rgba(255, 255, 255, 0.02);
}

.message-text :deep(tr):hover td {
  background: rgba(255, 215, 0, 0.05);
}

.message-text :deep(hr) {
  border: none;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ffd700, transparent);
  margin: 24px 0;
  border-radius: 1px;
}

.message-text :deep(a) {
  color: #87ceeb;
  text-decoration: none;
  border-bottom: 1px solid rgba(135, 206, 235, 0.3);
  transition: all 0.2s ease;
  padding: 1px 2px;
}

.message-text :deep(a):hover {
  color: #ffd700;
  border-bottom-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

/* 数学公式样式增强 */
.message-text :deep(.katex) {
  font-size: 1.15em;
  color: #e6f3ff;
  font-family: 'KaTeX_Main', 'Times New Roman', serif;
  line-height: 1.4;
}

.message-text :deep(.katex-display) {
  margin: 1em 0;
  text-align: center;
}

/* 行内数学公式样式优化 */
.message-text :deep(.math-inline) {
  display: inline-block;
  margin: 0 3px;
  padding: 3px 6px;
  background: rgba(135, 206, 235, 0.12);
  border-radius: 6px;
  border: 1px solid rgba(135, 206, 235, 0.2);
  vertical-align: middle;
  line-height: 1.4;
  transition: all 0.2s ease;
}

.message-text :deep(.math-inline:hover) {
  background: rgba(135, 206, 235, 0.18);
  border-color: rgba(135, 206, 235, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(135, 206, 235, 0.15);
}

.message-text :deep(.math-inline .katex) {
  font-size: 1.08em;
  color: #c7e3ff;
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* 块级数学公式样式优化 */
.message-text :deep(.math-block) {
  text-align: center;
  margin: 28px auto;
  padding: 32px 24px;
  max-width: 90%;
  background: linear-gradient(145deg, 
    rgba(135, 206, 235, 0.12), 
    rgba(135, 206, 235, 0.06),
    rgba(135, 206, 235, 0.08)
  );
  border: 1px solid rgba(135, 206, 235, 0.3);
  border-radius: 20px;
  overflow-x: auto;
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.2),
    0 2px 8px rgba(135, 206, 235, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  position: relative;
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}

.message-text :deep(.math-block:hover) {
  transform: translateY(-2px);
  box-shadow: 
    0 12px 32px rgba(0, 0, 0, 0.25),
    0 4px 12px rgba(135, 206, 235, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.message-text :deep(.math-block):before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(135, 206, 235, 0.4), 
    rgba(135, 206, 235, 0.6),
    rgba(135, 206, 235, 0.4),
    transparent
  );
  border-radius: 20px 20px 0 0;
}

.message-text :deep(.math-block .katex-display) {
  margin: 0;
  color: #eef7ff;
  line-height: 1.6;
}

.message-text :deep(.math-block .katex) {
  font-size: 1.3em;
  color: #eef7ff;
  font-weight: 500;
  letter-spacing: 0.01em;
}

/* KaTeX特定元素样式优化 */
.message-text :deep(.katex .mord),
.message-text :deep(.katex .mop),
.message-text :deep(.katex .mbin),
.message-text :deep(.katex .mrel),
.message-text :deep(.katex .mopen),
.message-text :deep(.katex .mclose),
.message-text :deep(.katex .mpunct) {
  color: inherit;
  font-weight: 500;
}

/* 分数样式优化 - 防止遮盖下一行文字 */
.message-text :deep(.katex .mfrac) {
  margin: 0 3px;
  vertical-align: middle !important;
  display: inline-block;
  position: relative;
  line-height: 1;
  max-height: 2.5em;
  overflow: visible;
  transform: translateY(-0.7em) !important;
}

.message-text :deep(.katex .frac-line) {
  border-bottom-width: 0.08em;
  border-color: currentColor;
  opacity: 0.9;
  margin: 0.05em 0;
  position: relative;
  z-index: 1;
}

/* 分子样式 */
.message-text :deep(.katex .mfrac .vlist-t .vlist-r:first-child) {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 0.1em;
  font-size: 0.85em;
  line-height: 1;
}

/* 分母样式 */
.message-text :deep(.katex .mfrac .vlist-t .vlist-r:last-child) {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 0.1em;
  font-size: 0.85em;
  line-height: 1;
}

/* 分子分母容器 */
.message-text :deep(.katex .mfrac > .vlist-t) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.message-text :deep(.katex .mfrac .vlist-r) {
  display: flex;
  justify-content: center;
  align-items: center;
  line-height: 1;
}

/* 确保分数不会超出行高 */
.message-text :deep(.katex-display .mfrac) {
  margin: 0.2em 3px;
  max-height: 3em;
}

/* 行内分数特殊处理 */
.message-text :deep(.katex-html .mfrac) {
  max-height: 2em;
}

/* 根号样式优化 */
.message-text :deep(.katex .sqrt) {
  border-color: currentColor;
  border-width: 0.08em;
}

.message-text :deep(.katex .sqrt > .root) {
  margin-left: 0.2em;
  margin-right: -0.1em;
}

/* 上下标样式优化 */
.message-text :deep(.katex .msupsub) {
  margin: 0 0.1em;
}

.message-text :deep(.katex .accent-body) {
  color: inherit;
  font-weight: 500;
}

/* 大型运算符样式优化 */
.message-text :deep(.katex .mop.op-symbol) {
  font-size: 1.1em;
  margin: 0 0.15em;
}

/* 矩阵和数组样式优化 */
.message-text :deep(.katex .arraycolsep) {
  width: 0.8em;
}

.message-text :deep(.katex .mtable) {
  margin: 0.2em 0;
}

/* 括号样式优化 */
.message-text :deep(.katex .delimsizing) {
  font-weight: 600;
  opacity: 0.95;
}

/* 特殊符号增强 */
.message-text :deep(.katex .mrel),
.message-text :deep(.katex .mbin) {
  margin: 0 0.25em;
  font-weight: 600;
}

/* 积分、求和等大型符号 */
.message-text :deep(.katex .mop.op-limits) {
  margin: 0 0.2em;
  font-size: 1.15em;
}

/* 希腊字母和特殊字符 */
.message-text :deep(.katex .mathit),
.message-text :deep(.katex .mathrm) {
  font-weight: 500;
  letter-spacing: 0.01em;
}

/* 全局KaTeX分数居中修复 - 最高优先级 */
:deep(.katex .mfrac) {
  vertical-align: 0.35em !important;
}

:deep(.katex-html .mfrac) {
  vertical-align: 0.35em !important;
}

/* 代码高亮主题调整 */
.message-text :deep(.hljs) {
  background: #1a1a1a !important;
  padding: 0 !important;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .message-text :deep(table) {
    font-size: 0.9em;
  }
  
  .message-text :deep(pre) {
    padding: 16px;
    margin: 12px 0;
  }
  
  .message-text :deep(blockquote) {
    padding: 12px 16px;
    margin: 12px 0;
  }
  
  .message-text :deep(ol li):before {
    padding: 1px 6px;
    font-size: 0.8em;
  }
  
  .message-text :deep(ul li),
  .message-text :deep(ol li) {
    padding-left: 20px;
  }
  
  /* 移动端数学公式优化 */
  .message-text :deep(.math-inline) {
    margin: 0 2px;
    padding: 2px 4px;
    font-size: 0.95em;
  }
  
  .message-text :deep(.math-inline .katex) {
    font-size: 1.02em;
  }
  
  .message-text :deep(.math-block) {
    margin: 20px auto;
    padding: 20px 16px;
    max-width: 95%;
    border-radius: 16px;
  }
  
  .message-text :deep(.math-block .katex) {
    font-size: 1.15em;
  }
  
  /* 移动端特殊符号调整 */
  .message-text :deep(.katex .mrel),
  .message-text :deep(.katex .mbin) {
    margin: 0 0.2em;
  }
  
  .message-text :deep(.katex .mop.op-limits) {
    font-size: 1.1em;
  }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
  .message-text :deep(.math-block) {
    margin: 16px auto;
    padding: 16px 12px;
    max-width: 98%;
  }
  
  .message-text :deep(.math-block .katex) {
    font-size: 1.1em;
  }
  
  .message-text :deep(.math-inline .katex) {
    font-size: 1em;
  }

  /* AI模型选择器模态框样式 */
  .model-selector-modal {
    background: linear-gradient(155deg, rgba(26, 26, 27, 0.98) 0%, rgba(15, 15, 16, 0.98) 100%);
    border: 2px solid transparent;
    background-clip: padding-box;
    position: relative;
    border-radius: 28px;
    padding: 0;
    max-width: 580px;
    width: 90%;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.7),
                0 10px 40px rgba(0, 0, 0, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.05);
    overflow: hidden;
    animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    backdrop-filter: blur(20px);
  }

  .model-selector-modal::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 28px;
    padding: 2px;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(16, 163, 127, 0.2), rgba(255, 215, 0, 0.2));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0.6;
  }

  @keyframes modalSlideIn {
    0% {
      opacity: 0;
      transform: scale(0.85) translateY(-30px);
    }
    50% {
      transform: scale(1.02) translateY(5px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .model-selector-modal .modal-header {
    padding: 28px 32px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(16, 163, 127, 0.03) 100%);
  }

  .model-selector-modal .modal-header h3 {
    font-size: 22px;
    font-weight: 700;
    background: linear-gradient(135deg, #FFD700 0%, #10a37f 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
    letter-spacing: 0.5px;
  }

  .model-selector-modal .close-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 10px;
    cursor: pointer;
    color: #9ca3af;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .model-selector-modal .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 215, 0, 0.3);
    color: #FFD700;
    transform: rotate(90deg) scale(1.1);
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
  }

  .model-selector-modal .close-btn:active {
    transform: rotate(90deg) scale(0.95);
  }

  .model-options {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* 按钮基础样式 */
  .model-btn {
    width: 100%;
    padding: 20px 24px;
    border-radius: 12px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: center;
    border: 1px solid;
  }

  /* 点击波纹效果 */
  .model-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s, opacity 0.6s;
    opacity: 0;
  }

  .model-btn:active::after {
    width: 300px;
    height: 300px;
    opacity: 0;
    transition: 0s;
  }

  /* DeepSeek 按钮 */
  .deepseek-btn {
    background: rgba(255, 215, 0, 0.08);
    border-color: rgba(255, 215, 0, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .deepseek-btn:hover {
    background: rgba(255, 215, 0, 0.15);
    border-color: rgba(255, 215, 0, 0.5);
    box-shadow: 0 4px 16px rgba(255, 215, 0, 0.3);
    transform: translateY(-2px);
  }

  .deepseek-btn.selected {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 100%);
    border-color: rgba(255, 215, 0, 0.6);
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.2), 0 4px 20px rgba(255, 215, 0, 0.4);
  }

  /* GPT-5 按钮 */
  .gpt-btn {
    background: rgba(16, 163, 127, 0.08);
    border-color: rgba(16, 163, 127, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .gpt-btn:hover {
    background: rgba(16, 163, 127, 0.15);
    border-color: rgba(16, 163, 127, 0.5);
    box-shadow: 0 4px 16px rgba(16, 163, 127, 0.3);
    transform: translateY(-2px);
  }

  .gpt-btn.selected {
    background: linear-gradient(135deg, rgba(16, 163, 127, 0.2) 0%, rgba(16, 163, 127, 0.1) 100%);
    border-color: rgba(16, 163, 127, 0.6);
    box-shadow: 0 0 0 2px rgba(16, 163, 127, 0.2), 0 4px 20px rgba(16, 163, 127, 0.4);
  }

  /* 文字样式 */
  .model-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .deepseek-btn .model-title {
    color: #ffd700;
  }

  .gpt-btn .model-title {
    color: #10a37f;
  }

  .model-desc {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.65);
    margin: 0;
    line-height: 1.5;
  }

  .model-btn:hover .model-desc {
    color: rgba(255, 255, 255, 0.85);
  }

  /* 模态框渐入动画 */
  .modal-fade-enter-active {
    animation: modalFadeIn 0.3s ease-out;
  }

  .modal-fade-leave-active {
    animation: modalFadeOut 0.25s ease-in;
  }

  @keyframes modalFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes modalFadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
}
</style>
