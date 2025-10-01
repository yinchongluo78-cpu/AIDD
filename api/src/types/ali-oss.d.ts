declare module 'ali-oss' {
  export interface OSSOptions {
    region: string
    accessKeyId: string
    accessKeySecret: string
    bucket: string
  }

  export interface PutResult {
    name: string
    url: string
    res: any
  }

  export default class OSS {
    constructor(options: OSSOptions)
    put(name: string, file: Buffer): Promise<PutResult>
    delete(name: string): Promise<any>
    signatureUrl(name: string, options?: { expires?: number }): string
  }
}