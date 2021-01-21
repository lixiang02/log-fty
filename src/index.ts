import moment from "moment";
import * as fs from 'fs';
import * as path from 'path';

export interface ILogConfig {
  rootDir?: string;
  dirName?: string;
  logDir?: string;
  logSaveDays?: number;
}

export default class LogFactory {
    private _rootDir:string
    private _logQueue=[]
    private _timer = null
    private _logDir = null
    private _config:ILogConfig = {}
    constructor(config:ILogConfig={}) {
      this._config = config
      this._rootDir = config.rootDir || process.cwd() || '/data'
      this.setLogDir(config.dirName || 'bffLogs')
      this.init()
      this.startCron()
    }
    protected setLogDir(dirName: string) {
      this._logDir = path.resolve(this._config.logDir || this._rootDir, dirName)
    }
  
    private init() {
      if (!fs.existsSync(this._logDir)) {
        fs.mkdirSync(this._logDir);
      }
    }
  
    public async add(data: any, type?: string) {
      const time = moment().format('YYYY-MM-DD HH:mm:ss')
      if (type && !data.graphqlType) { data.graphqlType = type } 
      this._logQueue.push(Object.assign({}, data, {time}))
    }
  
    private startCron() {
      let self = this
      this._timer = setInterval((function () {
        if (this._logQueue.length) {
          self.consumer.call(self)
        }
      }).bind(this), 1000)
    }
  
    private async consumer() {
      const data = this._logQueue.shift()
      if (data) {
        // 写入文件
        await this.record(data)
        // 递归
        await this.consumer()
      }
    }
  
    private async record(data:any) {
      const day = moment(data.time).format('YYYY-MM-DD')
      const hour = moment(data.time).format('HH:mm:ss')
      const filePath = path.resolve(this._logDir, day)
      fs.appendFileSync(filePath, `${data.logType ? `${data.logType}: ` : ''}${hour}: ${JSON.stringify(data)} \n`, 'utf-8')
    }

    public getLogFileData(fileName:string) {
        try {
            return fs.readFileSync(path.resolve(this._logDir, fileName), 'utf-8')   
        } catch (error) {
            return 'not found log file ' + fileName
        }
    }

    public cleanLogs() {
        const logs = fs.readdirSync(this._logDir)
        const day = moment().add(this._config.logSaveDays || 30, 'days').format('YYYY-MM-DD')
        logs.map(fileName => {
            const filePath = path.resolve(this._logDir, fileName)
            const fileNameNum = Number(fileName.replace('-', ''))
            const dayNum = Number(day.replace('-', ''))
            if (fileNameNum < dayNum) {
                fs.unlinkSync(filePath)
            }
        })
        console.log('清理完毕')
        return { code: 0, status: 'success', message: "清理完毕" }
    }
}