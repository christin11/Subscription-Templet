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
log(`② 读取${type === 'collection' ? '组合' : ''}订阅: ${name}`);
let proxiesYaml = await produceArtifact({
  name,
  type,
  platform: 'Clash',
});

// 🔥 新增：清洗非法控制字符 (关键修复)
// 1. 移除 ASCII 控制字符 (\x00-\x1F, \x7F)
// 2. 移除常见的 Unicode 不可打印字符
proxiesYaml = proxiesYaml.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

log(`② 节点数据获取并清洗成功`);

// ── 3. 构建 proxy-providers 块 ───────────────────────────────────────────
// 这里的 6 格缩进必须严格使用空格，严禁使用 Tab
const indentedProxies = proxiesYaml
  .split('\n')
  .filter(l => l.trim())
  .map(l => '      ' + l) // 这里确保是 6 个标准半角空格
  .join('\n');

const providerBlock = `proxy-providers:\n  ${name}:\n    type: inline\n    proxies:\n${indentedProxies}`;

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
