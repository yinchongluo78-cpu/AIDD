<template>
  <div class="kb-selector-container">
    <div class="kb-selector-trigger" @click="toggleSelector">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="currentColor"/>
      </svg>
      <span v-if="selectedDocuments.length === 0">选择知识库文档</span>
      <span v-else>已选 {{ selectedDocuments.length }} 个文档</span>
      <svg class="arrow" :class="{ expanded: isOpen }" viewBox="0 0 24 24" width="16" height="16">
        <path d="M7 10l5 5 5-5z" fill="currentColor"/>
      </svg>
    </div>

    <Transition name="dropdown">
      <div v-if="isOpen" class="kb-selector-dropdown">
        <div class="kb-selector-header">
          <span>选择文档</span>
          <button v-if="selectedDocuments.length > 0" @click="clearSelection" class="clear-btn">
            清空选择
          </button>
        </div>

        <div class="kb-categories">
          <div
            v-for="category in categories"
            :key="category.id"
            class="kb-category"
          >
            <div class="category-header" @click="toggleCategory(category.id)">
              <svg class="expand-icon" :class="{ expanded: expandedCategories.includes(category.id) }" viewBox="0 0 24 24" width="16" height="16">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/>
              </svg>
              <span>{{ category.name }} ({{ category.documentCount || 0 }})</span>
              <button
                v-if="getCategoryDocuments(category.id).length > 0"
                @click.stop="toggleCategoryAll(category.id)"
                class="select-all-btn"
              >
                {{ isCategoryAllSelected(category.id) ? '取消全选' : '全选' }}
              </button>
            </div>

            <Transition name="expand">
              <div v-if="expandedCategories.includes(category.id)" class="category-documents">
                <div v-if="loadingDocs[category.id]" class="loading">加载中...</div>
                <div
                  v-else-if="getCategoryDocuments(category.id).length === 0"
                  class="empty-docs"
                >
                  该分类暂无文档
                </div>
                <label
                  v-else
                  v-for="doc in getCategoryDocuments(category.id)"
                  :key="doc.id"
                  class="document-item"
                >
                  <input
                    type="checkbox"
                    :checked="isDocumentSelected(doc.id)"
                    @change="toggleDocument(doc)"
                  />
                  <span class="doc-name">{{ doc.filename }}</span>
                  <span class="doc-size">{{ formatSize(doc.fileSize) }}</span>
                </label>
              </div>
            </Transition>
          </div>
        </div>

        <div v-if="categories.length === 0" class="empty-state">
          暂无知识库分类
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../api'

const emit = defineEmits<{
  (e: 'change', documents: any[]): void
}>()

const isOpen = ref(false)
const categories = ref<any[]>([])
const expandedCategories = ref<string[]>([])
const categoryDocuments = ref<Record<string, any[]>>({})
const loadingDocs = ref<Record<string, boolean>>({})
const selectedDocuments = ref<any[]>([])

const toggleSelector = () => {
  isOpen.value = !isOpen.value
}

const toggleCategory = async (categoryId: string) => {
  const index = expandedCategories.value.indexOf(categoryId)
  if (index > -1) {
    expandedCategories.value.splice(index, 1)
  } else {
    expandedCategories.value.push(categoryId)
    // 如果还没加载该分类的文档，则加载
    if (!categoryDocuments.value[categoryId]) {
      await loadCategoryDocuments(categoryId)
    }
  }
}

const loadCategoryDocuments = async (categoryId: string) => {
  try {
    loadingDocs.value[categoryId] = true
    const response = await api.get(`/kb/categories/${categoryId}/documents`)
    categoryDocuments.value[categoryId] = response.data
  } catch (error) {
    console.error('加载文档失败:', error)
    categoryDocuments.value[categoryId] = []
  } finally {
    loadingDocs.value[categoryId] = false
  }
}

const getCategoryDocuments = (categoryId: string) => {
  return categoryDocuments.value[categoryId] || []
}

const isDocumentSelected = (docId: string) => {
  return selectedDocuments.value.some(doc => doc.id === docId)
}

const toggleDocument = (doc: any) => {
  const index = selectedDocuments.value.findIndex(d => d.id === doc.id)
  if (index > -1) {
    selectedDocuments.value.splice(index, 1)
  } else {
    selectedDocuments.value.push(doc)
  }
  emit('change', selectedDocuments.value)
}

const isCategoryAllSelected = (categoryId: string) => {
  const docs = getCategoryDocuments(categoryId)
  if (docs.length === 0) return false
  return docs.every(doc => isDocumentSelected(doc.id))
}

const toggleCategoryAll = (categoryId: string) => {
  const docs = getCategoryDocuments(categoryId)
  const allSelected = isCategoryAllSelected(categoryId)

  if (allSelected) {
    // 取消全选
    selectedDocuments.value = selectedDocuments.value.filter(
      selected => !docs.some(doc => doc.id === selected.id)
    )
  } else {
    // 全选
    docs.forEach(doc => {
      if (!isDocumentSelected(doc.id)) {
        selectedDocuments.value.push(doc)
      }
    })
  }
  emit('change', selectedDocuments.value)
}

const clearSelection = () => {
  selectedDocuments.value = []
  emit('change', selectedDocuments.value)
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 暴露方法给父组件：添加文档到选择列表并自动展开该分类
const addDocument = async (doc: any) => {
  // 如果文档已经被选中，不重复添加
  if (isDocumentSelected(doc.id)) {
    console.log('文档已在选择列表中:', doc.filename)
    return
  }

  // 添加到选择列表
  selectedDocuments.value.push(doc)
  console.log('已添加文档到选择列表:', doc.filename)

  // 触发 change 事件通知父组件
  emit('change', selectedDocuments.value)

  // 自动展开对应的分类（如果还没展开）
  if (doc.categoryId && !expandedCategories.value.includes(doc.categoryId)) {
    expandedCategories.value.push(doc.categoryId)
    // 如果该分类的文档还没加载，加载它们
    if (!categoryDocuments.value[doc.categoryId]) {
      await loadCategoryDocuments(doc.categoryId)
    }
  }
}

// 暴露方法给父组件使用
defineExpose({
  addDocument
})

onMounted(async () => {
  try {
    console.log('KnowledgeSelector: 开始加载分类...')
    const response = await api.get('/kb/categories')
    console.log('KnowledgeSelector: 分类数据:', response.data)
    categories.value = response.data
    console.log('KnowledgeSelector: 加载成功，分类数量:', categories.value.length)
  } catch (error) {
    console.error('KnowledgeSelector: 加载分类失败:', error)
    console.error('错误详情:', error.response || error.message)
  }
})
</script>

<style scoped>
.kb-selector-container {
  position: relative;
  margin-bottom: 15px;
}

.kb-selector-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #ffd700;
}

.kb-selector-trigger:hover {
  background: rgba(255, 215, 0, 0.1);
  border-color: rgba(255, 215, 0, 0.3);
}

.kb-selector-trigger .arrow {
  margin-left: auto;
  transition: transform 0.2s;
}

.kb-selector-trigger .arrow.expanded {
  transform: rotate(180deg);
}

.kb-selector-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin-bottom: 5px;
  background: rgba(30, 30, 30, 0.98);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.kb-selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  font-weight: 500;
}

.clear-btn, .select-all-btn {
  padding: 4px 10px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 4px;
  color: #ffd700;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover, .select-all-btn:hover {
  background: rgba(255, 215, 0, 0.2);
}

.kb-categories {
  padding: 5px 0;
}

.kb-category {
  margin: 5px 0;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  cursor: pointer;
  transition: background 0.2s;
  color: rgba(255, 255, 255, 0.9);
}

.category-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.expand-icon {
  transition: transform 0.2s;
  color: rgba(255, 255, 255, 0.5);
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.category-documents {
  padding-left: 30px;
  padding-right: 15px;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
  transition: background 0.2s;
  border-radius: 4px;
}

.document-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.document-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.doc-name {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.doc-size {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.loading, .empty-docs, .empty-state {
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}
</style>