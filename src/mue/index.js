import parse from './parser/index'
import { isType, deepCopy } from '../utils/index'
import { watchData } from './watch'
import { patchInit } from './patch'

export default function Mue (options) {
  this._init(options)
}

watchData(Mue)

patchInit(Mue)

Mue.prototype._init = function (options) {
  const { el, template, data, mounted, methods } = options
  this.el = el
  this.data = data

  // template 解析成AST
  const parsedNodes = parse(template)
  console.log('======AST======')
  console.log(parsedNodes)

  // 解析生成的nodeObject生成函数字符串
  let compileStr = 'return ' + buildRenderStr(parsedNodes)
  console.log('======compiler string======')
  console.log(compileStr)

  // 用函数字符串生成compiler函数
  this.compiler = buildCompiler(compileStr)
  console.log('======compiler Function======')
  console.log(this.compiler)

  // 这里有问题
  this.render()

  // 挂载执行的回调函数
  mounted.call(this)

  // 监听data变化
  this.defineReactive()
}

Mue.prototype.render = function () {
  // render函数生成VDOM
  let vNodes = this.compiler()

  console.log('======VDOM======')
  console.log(vNodes)

  // VDOM 生成real DOM
  let container = document.querySelector(this.el)
  let rootElement = (container && container.children[0]) || null
  let oldNode = rootElement && recycleElement(rootElement)
  console.log(JSON.stringify(vNodes))
  this.patch(container, rootElement, oldNode, (oldNode = vNodes))
}

Mue.prototype.$compiler = function () {
  return this._h('div', {}, [
    this._h('div', {}, [
      this._h('h1', {}, [this._s(this.data.title)]),
      this._h('h2', {}, [this._s(this.data.info.desc)])
    ]),
    this._h('h2', {}, [this._s(this.data.count + 1)]),
    this._h('loading', { 'm-if': 'loading' }, ['loading']),
    this._h('p', { 'class': 'el_input' }, ['输入的内容是：' + this._s(this.data.inputText)]),
    this._h('input', { 'type': 'text', 'm-model': 'inputText', '/': null })
  ])
}

Mue.prototype._h = function (nodeName, attributes, children) {
  let node = {}
  let directives = []
  let mDirect = /^m-/
  let isNeed = true

  for (let attr in attributes) {
    if (mDirect.test(attr)) {
      directives.push({
        key: attr,
        prop: attributes[attr]
      })
    }
  }

  // 只考虑m-if、m-for 的情况
  directives.forEach(item => {
    if (item.key === 'm-if') {
      let propValue = new Function(`return this.data.${item.prop}`).call(this)
      isNeed = propValue === true ? true : false
    }
    else if (item.key === 'm-model') {
      let propValue = new Function(`return this.data.${item.prop}`).call(this)
      node.value = propValue
    }
  })

  // 如果
  if (children && isType(children, 'array')) {
    children = children.filter(child => {
      return child !== undefined
    })
  }

  // 不需要的设置为 undefined
  if (!isNeed) {
    return undefined
  }

  node = deepCopy({
    nodeName: nodeName,
    attributes: attributes || {},
    children: children,
    key: attributes && attributes.key
  }, node)
  return node
}

Mue.prototype._s = function (expression) {
  return expression
}

function buildCompiler (str) {
  return new Function(str)
}

function buildRenderStr (node) {
  let tempStr = ''
  // 如果node是个dom节点
  if (node.type === 1) {

    // 无子元素
    if (node.children.length === 0) {
      tempStr = `this._h('${node.tag}',${JSON.stringify(node.attrsMap)})`
    }

    // 有子元素
    else {
      let children = node.children
      let h_childs = []
      for (let i = 0; i < children.length; i++) {
        h_childs.push(buildRenderStr(children[i]))
      }
      h_childs = '[' + h_childs.join(',') + ']'
      tempStr = `this._h('${node.tag}',${JSON.stringify(node.attrsMap)},${h_childs})`
    }
  }
  // 如果node是文字
  else if (node.type === 2) {
    tempStr = node.expression ? node.expression : `'${node.text}'`
  }
  return tempStr
}

function recycleElement (element) {
  return {
    nodeName: element.nodeName.toLowerCase(),
    attributes: {},
    children: Array.prototype.map.call(element.childNodes, function (element) {
      return element.nodeType === 3 // Node.TEXT_NODE
        ? element.nodeValue
        : recycleElement(element)
    })
  }
}
