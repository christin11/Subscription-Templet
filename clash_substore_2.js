// Clash 模板注入脚本（文件脚本）
// 参数：name=订阅名称&type=collection（或 subscription）
//
// 脚本链接示例：
// https://raw.githubusercontent.com/christin11/Subscription-Templet/refs/heads/main/clash_substore.js#name=我的机场&type=collection

log('🚀 开始')

let { type, name } = $arguments
log(`传入参数 type: ${type}, name: ${name}`)

if (!name) throw new Error('缺少参数 name，请在脚本链接后加 #name=你的订阅名')
type = /^1$|col|组合/i.test(type) ? 'collection' : 'subscription'

// ── 1. 读取模板 ──────────────────────────────────────────────────────────
const template = $content
if (!template) throw new Error('模板内容为空')
log(`① 模板读取成功，长度 ${template.length}`)

// ── 2. 拉取订阅节点（Clash 格式）────────────────────────────────────────
log(`② 读取${type === 'collection' ? '组合' : ''}订阅: ${name}`)
const proxiesYaml = await produceArtifact({
  name,
  type,
  platform: 'Clash',
})
log(`② 节点数据获取成功，长度 ${proxiesYaml.length}`)

// ── 3. 构建 proxy-providers 块 ───────────────────────────────────────────
// produceArtifact Clash 格式返回完整 proxies 列表，每行如：
// - name: 节点名\n  type: ss\n  ...
// 嵌入 inline provider 的 proxies: 字段下，缩进6格
const indentedProxies = proxiesYaml
  .split('\n')
  .filter(l => l.trim())
  .map(l => '      ' + l)
  .join('\n')

const providerBlock = `proxy-providers:\n  ${name}:\n    type: inline\n    proxies:\n${indentedProxies}`
log(`③ proxy-providers 块构建完成`)

// ── 4. 注入模板，替换 proxy-providers 区块 ───────────────────────────────
let result = template
const pattern = /^proxy-providers:.*?(?=^\w)/ms
if (pattern.test(result)) {
  result = result.replace(pattern, providerBlock + '\n')
} else {
  result = result.replace('proxy-groups:', providerBlock + '\nproxy-groups:')
}
log(`④ 注入完成`)

// ── 5. 文件脚本用 $content 赋值返回 ─────────────────────────────────────
$content = result
log('🔚 结束')

function log(v) {
  console.log(`[🐱 Clash 模板脚本] ${v}`)
}
