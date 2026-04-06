// Clash 模板注入脚本
// 参考 xream/scripts sing-box/template.js 写法
//
// 用法示例（脚本链接后拼参数）：
// https://raw.githubusercontent.com/christin11/.../clash_substore.js#name=机场&type=collection
//
// 参数说明：
//   name  订阅或组合订阅的名称
//   type  collection（组合订阅）或 subscription（单条订阅），默认 collection

log('🚀 开始')

let { type, name } = $arguments

log(`传入参数 type: ${type}, name: ${name}`)

type = /^1$|col|组合/i.test(type) ? 'collection' : 'subscription'

// ── 1. 读取并解析模板（YAML 字符串）──────────────────────────────────────
let template = $content
if (!template) throw new Error('模板内容为空，请检查文件链接')
log(`① 模板读取成功，长度 ${template.length}`)

// ── 2. 拉取订阅节点（Clash 格式，返回 proxies YAML 列表）─────────────────
log(`② 读取${type === 'collection' ? '组合' : ''}订阅: ${name}`)
const proxiesYaml = await produceArtifact({
  name,
  type,
  platform: 'Clash',
})
log(`节点数据长度: ${proxiesYaml.length}`)

// ── 3. 构建 proxy-provider 的 proxies 列表 ───────────────────────────────
// produceArtifact Clash 格式返回的是完整 proxies 块，每行形如：
// - name: 节点名
//   type: ss
//   ...
// 需要缩进后嵌入 provider 的 proxies: 字段下
const indentedProxies = proxiesYaml
  .split('\n')
  .filter(l => l.trim())
  .map(l => '      ' + l)
  .join('\n')

const providerBlock = [
  'proxy-providers:',
  `  ${name}:`,
  '    type: inline',
  '    proxies:',
  indentedProxies,
].join('\n')

log(`③ 构建 proxy-providers 块完成`)

// ── 4. 替换模板中的 proxy-providers 区块 ─────────────────────────────────
const pattern = /^proxy-providers:[\s\S]*?(?=^\w)/m
if (pattern.test(template)) {
  template = template.replace(pattern, providerBlock + '\n')
} else {
  template = template.replace('proxy-groups:', providerBlock + '\nproxy-groups:')
}
log(`④ 注入完成`)

// ── 5. 返回（文件脚本用 $content 赋值）───────────────────────────────────
$content = template
log('🔚 结束')

function log(v) {
  console.log(`[🐱 Clash 模板脚本] ${v}`)
}
