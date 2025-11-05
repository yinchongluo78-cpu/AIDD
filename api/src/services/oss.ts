import OSS from 'ali-oss'

const ossClient = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-shenzhen',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.OSS_BUCKET || ''
})

console.log('OSS配置加载:', {
  region: process.env.OSS_REGION,
  bucket: process.env.OSS_BUCKET,
  hasAccessKey: !!process.env.OSS_ACCESS_KEY_ID
})

/**
 * 生成签名URL，用于临时访问私有文件
 * @param ossKey OSS文件键名
 * @param expires 有效期（秒），默认3600秒（1小时）
 * @returns 签名URL
 */
export async function getSignedUrl(ossKey: string, expires: number = 3600): Promise<string> {
  try {
    const signedUrl = await ossClient.signatureUrl(ossKey, {
      expires,
      method: 'GET'
    })
    return signedUrl
  } catch (error) {
    console.error('生成签名URL失败:', error)
    throw new Error('生成签名URL失败')
  }
}

/**
 * 上传文件到OSS
 * @param ossKey OSS文件键名
 * @param fileBuffer 文件Buffer
 * @returns OSS上传结果
 */
export async function uploadFile(ossKey: string, fileBuffer: Buffer) {
  try {
    const result = await ossClient.put(ossKey, fileBuffer)
    return result
  } catch (error) {
    console.error('上传文件到OSS失败:', error)
    throw new Error('上传文件失败')
  }
}

/**
 * 删除OSS文件
 * @param ossKey OSS文件键名
 */
export async function deleteFile(ossKey: string) {
  try {
    await ossClient.delete(ossKey)
  } catch (error) {
    console.error('删除OSS文件失败:', error)
    throw new Error('删除文件失败')
  }
}

export default ossClient
