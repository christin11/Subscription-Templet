// ============================================
// Clash 模板节点注入脚本 - SubStore 版
// ============================================

log('开始处理...')

let { type, name } = $arguments
if (!name) throw new Error('缺少参数 name')

type = /^1$|col|组合/i.test(type) ? 'collection' : 'subscription'

const template = $content
if (!template) throw new Error('模板为空')

// 地区匹配关键词
const regionMatch = {
  '🇭🇰 香港节点': ['香港', 'hk'],
  '🇹🇼 台湾节点': ['台湾', '臺灣', 'tw'],
  '🇯🇵 日本节点': ['日本', 'jp', '東京', '大阪'],
  '🇰🇷 韩国节点': ['韩国', '韓國', 'kr', '首尔'],
  '🇸🇬 新加坡节点': ['新加坡', 'sg', '狮城'],
  '🇹🇭 泰国节点': ['泰国', '泰國', 'th', '曼谷'],
  '🇺🇸 美国节点': ['美国', '美國', 'us', '洛杉矶', '纽约', '西雅图'],
  '🇩🇪 德国节点': ['德国', '德國', 'de', '柏林'],
  '🇬🇧 英国节点': ['英国', '英國', 'uk', '伦敦']
}

// 拉取节点
log('拉取订阅...')
let proxiesYaml = await produceArtifact({
  name,
  type,
  platform: 'Clash',
})

if (!proxiesYaml) throw new Error('无法拉取订阅')

// 解析节点名
const proxies = []
const lines = proxiesYaml.split('\n')
for (const line of lines) {
  if (line.includes('name:')) {
    const m = line.match(/name:\s*["\']?([^"'\n]+)["\']?/)
    if (m) proxies.push(m[1].trim())
  }
}

log('获取 ' + proxies.length + ' 个代理')

// 分配到地区
const regionProxies = {}
for (const region in regionMatch) {
  regionProxies[region] = []
}

for (const proxy of proxies) {
  const lower = proxy.toLowerCase()
  let matched = false
  
  for (const region in regionMatch) {
    for (const keyword of regionMatch[region]) {
      if (lower.includes(keyword.toLowerCase())) {
        regionProxies[region].push(proxy)
        matched = true
        break
      }
    }
    if (matched) break
  }
}

// 更新模板
let result = template

// 替换全局proxies
const proxyLines = proxiesYaml.trim().split('\n').map(l => l).join('\n')
result = result.replace('proxies: []', 'proxies:\n' + proxyLines)

// 替换各地区proxies
for (const region in regionProxies) {
  const nodes = regionProxies[region]
  if (nodes.length === 0) continue
  
  const nodeStr = nodes.map(n => '\n      - "' + n + '"').join('')
  
  // 简单字符串替换
  let search = 'name: ' + region
  if (!result.includes(search)) {
    search = 'name: "' + region + '"'
  }
  
  if (result.includes(search)) {
    const idx = result.indexOf(search)
    const rest = result.substring(idx)
    const m = rest.match(/proxies:\s*\[\]/)
    if (m) {
      const before = result.substring(0, idx + m.index)
      const after = result.substring(idx + m.index + m[0].length)
      result = before + 'proxies: [' + nodeStr + '\n    ]' + after
    }
  }
}

log('完成')
$content = result
