import path from 'path'
import fs from 'fs'
// 解析ast
import {parse} from 'babylon'
// 便利 ast
import traverse from 'babel-traverse'
// 转义 ast
import generate from 'babel-generator'
// 格式化
import {js_beautify} from 'js-beautify'
import mkdirp from 'mkdirp'

const DEFAULT_OPTIONS = {
  // 抽离的文件名 可为  controller  service fatoray directive 什么的 可为数组多个
  methodName: ['controller', 'directive', 'factory', 'service'],
  // 文件路径
  src: '',
  // 模块名 默认读取 项目本身的 
  moduleName: undefined,
  // 生成目录
  dist: path.resolve(__dirname, `../dist`)
}

export default class Parse {
  constructor(options = DEFAULT_OPTIONS) {
    this.options = {...DEFAULT_OPTIONS, ...options}
    if (this.options.src.length <= 0) {
      console.error(`需要拆分的文件路径 src 不能为空`)
      return 
    }
    if (!Array.isArray(this.options.methodName)) {
      this.options.methodName = [this.options.methodName]
    }
    this.arrAst = []
    this.init()
  }

  async init() {
    try {
      this.value = await this.readFileValue()
      this.parseAst()
      if (this.arrAst.length <= 0) {
        console.error('没有符合规则的 提取方法 :)')
        return
      }
      let moduleAsts = this.arrAst.filter(item => item.type === 'module')
      let functionAsts = this.arrAst.filter(item => item.type === 'function')
      this.generateModuleJs(moduleAsts, functionAsts)
      this.generateFunctionJs(functionAsts)
      console.info(`分析出模块 ${moduleAsts.length} 个 提取到内容（controller, ... ） ${functionAsts.length} 个文件`)
    } catch (error) {
      console.error(error)
    }
  }

  async readFileValue() {
    return new Promise((resolve, reject) =>{ 
      fs.readFile(this.options.src, (err, data) => {
       if (err) {
         console.error('error', err)
         return reject()
       }
       return resolve(data.toString())
      })
    })
  }

  parseAst() {
    let self = this
    this.ast = parse(this.value)
    let moduleName
    // 遍历 ast 
    traverse(this.ast, {
      // enter是在节点中包含的子节点内容还没被解析时
      enter(path) {
      },
      // 包含的子节点被解析完成之后
      exit(path) {
        const node = path.node
        const callee = node.callee
        if (node.type === 'CallExpression' && callee.type === 'MemberExpression' && callee.computed === false ) {
          const obj = callee.object
          const method = callee.property
          const args = node.arguments
         
          // 提取模块名
          if (args.length === 2 && method.name === 'module' && self.options.moduleName === undefined) {
            moduleName = args[0].value
            // 同一个文件可能存在多个模块 所以提取出模块文件
            self.arrAst.push({
              type: 'module',
              ast: args[1],
              methodName: moduleName
            })
          }
          // 提取controller service  directive  等
          if (args.length === 2 && self.options.methodName.indexOf(method.name) !== -1) {
            // args[1] 是 controller function 代码
            self.arrAst.push({
              type: 'function',
              ast: args[1], // 函数内容
              name: args[0].value, // 函数名
              moduleName: self.options.moduleName || moduleName, // module name 默认使用读取的 如果传了 就使用以传值的
              methodName: method.name
            })
          }
        }
      }
    })
  }

  /**
   * 
   * 生成 控制器  指定服务等 js
   * @param {any} modules  取到的语法数
   * 
   * @memberof Parse
   */
  generateFunctionJs(modules) {
    modules.forEach(item => {
      let {name, moduleName, methodName, ast} = item
      // 解析语法数
      let js = generate(ast, {retainFunctionParens: true}, this.value).code
      // 格式化文件
      let source = `;angular.module('${moduleName}').${methodName}('${name}', ${js});`
      
      // 写入之前判断文件 是否存在 如果不存在 则创建文件
      let dist = `${this.options.dist}/${methodName}s/`
      this.mkdirFile(dist, methodName, source, name)
    })
  }

  generateModuleJs(modules = ['bq.controller'], functionAsts) {
    let source
    let moduleName
    let options = this.options
    let moduleDist = `${options.dist}/modules/`
    if (options.moduleName !== undefined) {
      moduleName = this.options.moduleName
      source = `;angular.module('${options.moduleName}', []); ${this.generateImports(functionAsts)} `
        // 生成 import 文件
      // this.mkdirFile(moduleDist, 'module', this.generateImports(functionAsts), `${moduleName}.import`)
    } else {
      let arrModules = []
      let arrImports = []
      moduleName = modules[0].methodName
      modules.forEach(item => {
        let {methodName, ast} = item
        let js = generate(ast, {retainFunctionParens: true}, this.value).code
        let asts = functionAsts.filter(item => item.moduleName === methodName)
        arrImports.push(this.generateImports(asts))
        arrModules.push(`;angular.module('${methodName}', ${js}); `)
      })
      // 生成 import 文件
      // this.mkdirFile(moduleDist, 'module', arrImports.join(''), `${moduleName}.import`)
      source = `${arrModules.join('')} ${arrImports.join('')}`
    }
    this.mkdirFile(moduleDist, 'module', source, moduleName)
  }

  /**
   * 
   * 生成import 引入代码
   * @param {any} imports 
   * @returns 
   * 
   * @memberof Parse
   */
  generateImports(imports) {
    let source = []
    imports.forEach(item => {
      source.push(`import 'app@/${item.methodName}s/${item.name}.js' `)
    })
    return source.join('')
  }

  /**
   * 
   * 创建 js 文件
   * @param {any} moduleDist 创建的 一级路径
   * @param {any} subPath 创建的 二级路径
   * @param {any} source js 源码
   * @param {any} fileName 文件名称
   * 
   * @memberof Parse
   */
  mkdirFile(moduleDist, subPath, source, fileName) {
    fs.access(moduleDist, fs.F_OK, err => {
      if (err) {
        // 递归创建文件夹
        mkdirp(moduleDist, mkErr => {
          if (mkErr) return console.error(mkErr)
          this.writeFile(subPath, source, fileName)
        })
        return
      }
      this.writeFile(subPath, source, fileName)
    })
  }

  /**
   * 
   * 写入文件 
   * @param {any} subPath 创建的 二级路径
   * @param {any} source  js 源码
   * @param {any} fileName 文件名称
   * 
   * @memberof Parse
   */
  writeFile(subPath, source, fileName) {
    fileName = fileName.toString()
    // 写入文件
    fs.writeFile(this.resolve(subPath, fileName), js_beautify(source, {indent_size: 2 }), err => {
      if(err){
        console.error(`写入文件报错${fileName}`, err)
      }
    })
  }

  resolve(subPath, fileName) {
    return `${this.options.dist}/${subPath}s/${fileName}.js`
  }
};
