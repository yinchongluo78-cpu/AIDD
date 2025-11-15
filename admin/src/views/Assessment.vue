<template>
  <div class="assessment-container">
    <h2 class="page-title">测评管理</h2>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon total"><User /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ overviewData?.totalStudents || 0 }}</div>
              <div class="stat-label">学生总数</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon completed"><CircleCheck /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ overviewData?.studentsCompletedCount || 0 }}</div>
              <div class="stat-label">已完成测评学生数</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon rate"><TrendCharts /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ overviewData?.completionRate || '0%' }}</div>
              <div class="stat-label">测评完成率</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon reports"><Document /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ overviewData?.totalReports || 0 }}</div>
              <div class="stat-label">累计生成报告</div>
              <div class="stat-sub">最近7天：{{ overviewData?.recentReports || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 测评模块完成情况 -->
    <el-card class="section-card">
      <template #header>
        <div class="card-header">
          <span>测评模块完成情况</span>
          <el-button type="primary" size="small" @click="loadOverview">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      <el-table :data="overviewData?.moduleStats || []" border stripe>
        <el-table-column prop="moduleName" label="模块名称" width="200" />
        <el-table-column prop="slug" label="模块标识" width="200" />
        <el-table-column prop="completedCount" label="完成人数" width="120" align="center" />
        <el-table-column prop="completionRate" label="完成率" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getCompletionRateType(row.completionRate)">
              {{ row.completionRate }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 学生测评完成度详情 -->
    <el-card class="section-card">
      <template #header>
        <div class="card-header">
          <span>学生测评完成度</span>
          <el-button type="primary" size="small" @click="loadCompletionData">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      <el-table :data="completionData" border stripe v-loading="completionLoading">
        <el-table-column prop="studentName" label="学生姓名" width="120" />
        <el-table-column prop="studentGrade" label="年级" width="120" />
        <el-table-column prop="email" label="邮箱" width="200" />
        <el-table-column prop="completedModules" label="已完成模块" width="120" align="center">
          <template #default="{ row }">
            {{ row.completedModules }} / {{ row.totalModules }}
          </template>
        </el-table-column>
        <el-table-column prop="completionRate" label="完成率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getCompletionRateType(row.completionRate)">
              {{ row.completionRate }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="模块详情" min-width="300">
          <template #default="{ row }">
            <div class="module-tags">
              <el-tag
                v-for="module in row.moduleDetails"
                :key="module.slug"
                :type="module.isCompleted ? 'success' : 'info'"
                size="small"
                style="margin: 2px"
              >
                {{ module.moduleName }}
                <span v-if="module.score !== null"> ({{ module.score }}分)</span>
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="success"
              size="small"
              @click="generateReport(row.userId, row.studentName)"
              :loading="generatingReportFor === row.userId"
              style="margin-right: 8px"
            >
              生成报告
            </el-button>
            <el-button
              type="primary"
              size="small"
              @click="goToUserDetail(row.userId)"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 测评报告历史 -->
    <el-card class="section-card">
      <template #header>
        <div class="card-header">
          <span>测评报告历史</span>
          <div class="header-actions">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              size="small"
              style="margin-right: 10px"
              @change="loadReports"
            />
            <el-button type="primary" size="small" @click="loadReports">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="reports" border stripe v-loading="reportsLoading">
        <el-table-column prop="studentName" label="学生姓名" width="120" />
        <el-table-column prop="studentGrade" label="年级" width="120" />
        <el-table-column prop="createdAt" label="生成时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="generatedBy" label="生成方式" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.generatedBy === 'system' ? '系统' : '管理员' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="viewReport(row.id)"
            >
              查看报告
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="pagination.total > 0"
        class="pagination"
        :current-page="pagination.page"
        :page-size="pagination.limit"
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="handlePageChange"
      />
    </el-card>

    <!-- 报告详情弹窗 -->
    <el-dialog
      v-model="reportDialogVisible"
      title="测评报告详情"
      width="60%"
      :close-on-click-modal="false"
    >
      <template #header>
        <div class="dialog-header">
          <span class="dialog-title">测评报告详情</span>
          <el-button
            v-if="currentReport"
            type="primary"
            size="small"
            @click="downloadPDF"
            :loading="pdfDownloading"
          >
            <el-icon><Download /></el-icon>
            下载PDF
          </el-button>
        </div>
      </template>
      <div v-if="currentReport" class="report-content">
        <div class="report-meta">
          <p><strong>学生姓名：</strong>{{ currentReport.studentName }}</p>
          <p><strong>年级：</strong>{{ currentReport.studentGrade }}</p>
          <p><strong>生成时间：</strong>{{ formatDateTime(currentReport.createdAt) }}</p>
        </div>
        <el-divider />
        <div class="report-text" v-html="renderMarkdown(currentReport.report)"></div>
      </div>
      <div v-else v-loading="true" style="height: 300px"></div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  User,
  CircleCheck,
  TrendCharts,
  Document,
  Refresh,
  Download
} from '@element-plus/icons-vue'
import { marked } from 'marked'
import api from '../api'

const router = useRouter()

// 概览数据
const overviewData = ref<any>({})

// 学生完成度数据
const completionData = ref<any[]>([])
const completionLoading = ref(false)

// 生成报告状态
const generatingReportFor = ref<string | null>(null)

// 报告列表数据
const reports = ref<any[]>([])
const reportsLoading = ref(false)
const dateRange = ref<[Date, Date] | null>(null)
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})

// 报告详情弹窗
const reportDialogVisible = ref(false)
const currentReport = ref<any>(null)
const pdfDownloading = ref(false)

// 加载概览数据
const loadOverview = async () => {
  try {
    const res = await api.get('/admin/assessment/overview')
    overviewData.value = res.data
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载概览数据失败')
  }
}

// 加载学生完成度数据
const loadCompletionData = async () => {
  completionLoading.value = true
  try {
    const res = await api.get('/admin/assessment/completion')
    completionData.value = res.data
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载完成度数据失败')
  } finally {
    completionLoading.value = false
  }
}

// 加载报告列表
const loadReports = async () => {
  reportsLoading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0].toISOString()
      params.endDate = dateRange.value[1].toISOString()
    }

    const res = await api.get('/admin/assessment/reports', { params })
    reports.value = res.data.reports
    pagination.value = res.data.pagination
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载报告列表失败')
  } finally {
    reportsLoading.value = false
  }
}

// 查看报告详情
const viewReport = async (reportId: string) => {
  try {
    const res = await api.get(`/admin/assessment/reports/${reportId}`)
    currentReport.value = res.data
    reportDialogVisible.value = true
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载报告详情失败')
  }
}

// 生成报告
const generateReport = async (userId: string, studentName: string) => {
  try {
    generatingReportFor.value = userId
    await api.post(`/admin/users/${userId}/assessment-report`)
    ElMessage.success(`${studentName} 的测评报告生成成功！`)
    await loadReports() // 刷新报告列表
  } catch (error: any) {
    console.error('生成报告失败:', error)
    ElMessage.error(error.response?.data?.message || '生成报告失败')
  } finally {
    generatingReportFor.value = null
  }
}

// 跳转到用户详情
const goToUserDetail = (userId: string) => {
  router.push(`/users?userId=${userId}`)
}

// 分页切换
const handlePageChange = (page: number) => {
  pagination.value.page = page
  loadReports()
}

// 根据完成率返回标签类型
const getCompletionRateType = (rate: string) => {
  const numRate = parseFloat(rate)
  if (numRate >= 80) return 'success'
  if (numRate >= 50) return 'warning'
  return 'info'
}

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 渲染Markdown
const renderMarkdown = (text: string) => {
  if (!text) return ''
  return marked(text)
}

// 下载PDF报告
const downloadPDF = async () => {
  if (!currentReport.value) return

  pdfDownloading.value = true
  try {
    // 使用原生axios实例,跳过响应拦截器
    const token = localStorage.getItem('token')
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/assessment/reports/${currentReport.value.id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('下载失败')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `测评报告_${currentReport.value.studentName}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('PDF下载成功')
  } catch (error: any) {
    console.error('下载PDF失败:', error)
    ElMessage.error('下载PDF失败')
  } finally {
    pdfDownloading.value = false
  }
}

onMounted(() => {
  loadOverview()
  loadCompletionData()
  loadReports()
})
</script>

<style scoped>
.assessment-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-title {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #303133;
}

/* 统计卡片 */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
  transition: all 0.3s;
  height: 100%;
}

.stat-card :deep(.el-card__body) {
  padding: 20px;
  height: 100%;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 80px;
}

.stat-icon {
  font-size: 40px;
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-icon.completed {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.stat-icon.rate {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.stat-icon.reports {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.stat-sub {
  font-size: 12px;
  color: #67c23a;
  margin-top: 2px;
}

/* 卡片区域 */
.section-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.module-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

/* 报告详情弹窗 */
.report-content {
  max-height: 70vh;
  overflow-y: auto;
}

.report-meta {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.report-meta p {
  margin: 8px 0;
  font-size: 14px;
  color: #606266;
}

.report-text {
  font-size: 14px;
  line-height: 1.8;
  color: #303133;
}

.report-text :deep(h3) {
  margin: 20px 0 10px 0;
  font-size: 18px;
  color: #409eff;
  border-left: 4px solid #409eff;
  padding-left: 12px;
}

.report-text :deep(p) {
  margin: 10px 0;
  text-indent: 2em;
}

.report-text :deep(strong) {
  color: #303133;
}

/* 弹窗头部 */
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 20px;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
</style>
